#!/bin/bash

# =================================================================
# ZIENSHIELD - SCRIPT DE DESPLIEGUE DOCKER
# =================================================================

set -e  # Exit on any error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# =================================================================
# CONFIGURACIÓN
# =================================================================

PROJECT_NAME="zienshield"
DOCKER_COMPOSE_FILE="docker-compose.production.yml"
ENV_FILE=".env.production"

# =================================================================
# FUNCIONES PRINCIPALES
# =================================================================

check_requirements() {
    log "Verificando requisitos del sistema..."
    
    # Verificar Docker
    if ! command -v docker &> /dev/null; then
        error "Docker no está instalado"
        exit 1
    fi
    
    # Verificar Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose no está instalado"
        exit 1
    fi
    
    # Verificar archivo de configuración
    if [[ ! -f "$ENV_FILE" ]]; then
        error "Archivo $ENV_FILE no encontrado"
        error "Copia .env.production.template como $ENV_FILE y configura las variables"
        exit 1
    fi
    
    # Verificar variables críticas
    source "$ENV_FILE"
    
    local required_vars=(
        "DB_HOST"
        "DB_PASSWORD" 
        "JWT_SECRET"
        "WAZUH_API_URL"
        "WAZUH_USERNAME"
        "WAZUH_PASSWORD"
        "CORS_ORIGINS"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        error "Variables de entorno requeridas faltantes:"
        printf '%s\n' "${missing_vars[@]}"
        exit 1
    fi
    
    success "Requisitos verificados correctamente"
}

validate_ports() {
    log "Verificando disponibilidad de puertos..."
    
    local ports=(3080 3443 9090)
    local occupied_ports=()
    
    for port in "${ports[@]}"; do
        if ss -tuln | grep -q ":$port "; then
            occupied_ports+=("$port")
        fi
    done
    
    if [[ ${#occupied_ports[@]} -gt 0 ]]; then
        warning "Los siguientes puertos están ocupados:"
        printf '%s\n' "${occupied_ports[@]}"
        warning "Considera modificar los puertos en $DOCKER_COMPOSE_FILE"
        
        read -p "¿Continuar de todos modos? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    success "Verificación de puertos completada"
}

build_images() {
    log "Construyendo imágenes Docker..."
    
    # Build backend
    log "Construyendo imagen del backend..."
    docker build -f Dockerfile.backend -t ${PROJECT_NAME}-backend:latest .
    
    # Build frontend
    log "Construyendo imagen del frontend..."
    docker build -f Dockerfile.frontend -t ${PROJECT_NAME}-frontend:latest .
    
    success "Imágenes construidas correctamente"
}

deploy_services() {
    log "Desplegando servicios..."
    
    # Detener servicios existentes si los hay
    docker-compose -f "$DOCKER_COMPOSE_FILE" down --remove-orphans
    
    # Crear volúmenes si no existen
    docker volume create ${PROJECT_NAME}_backend-logs || true
    docker volume create ${PROJECT_NAME}_nginx-logs || true
    docker volume create ${PROJECT_NAME}_redis-data || true
    
    # Desplegar servicios
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
    
    success "Servicios desplegados"
}

wait_for_services() {
    log "Esperando que los servicios estén listos..."
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        log "Intento $attempt/$max_attempts - Verificando salud de servicios..."
        
        if docker-compose -f "$DOCKER_COMPOSE_FILE" ps | grep -q "Up (healthy)"; then
            success "Servicios están saludables"
            return 0
        fi
        
        sleep 10
        ((attempt++))
    done
    
    error "Los servicios no se iniciaron correctamente en el tiempo esperado"
    docker-compose -f "$DOCKER_COMPOSE_FILE" logs --tail=50
    exit 1
}

run_health_checks() {
    log "Ejecutando verificaciones de salud..."
    
    # Verificar backend
    local backend_port=$(docker-compose -f "$DOCKER_COMPOSE_FILE" port reverse-proxy 80 | cut -d: -f2)
    
    if curl -f "http://localhost:${backend_port}/health" &>/dev/null; then
        success "Backend responde correctamente"
    else
        error "Backend no responde"
        return 1
    fi
    
    # Verificar frontend
    if curl -f "http://localhost:${backend_port}/" &>/dev/null; then
        success "Frontend responde correctamente"
    else
        error "Frontend no responde"
        return 1
    fi
    
    success "Todas las verificaciones de salud pasaron"
}

show_status() {
    log "Estado de los servicios:"
    docker-compose -f "$DOCKER_COMPOSE_FILE" ps
    
    log "\nRecursos utilizados:"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"
    
    local proxy_port=$(docker-compose -f "$DOCKER_COMPOSE_FILE" port reverse-proxy 80 2>/dev/null | cut -d: -f2)
    
    if [[ -n "$proxy_port" ]]; then
        success "\nAplicación disponible en:"
        echo "  Frontend: http://localhost:${proxy_port}"
        echo "  API: http://localhost:${proxy_port}/api"
        echo "  Health: http://localhost:${proxy_port}/health"
    fi
    
    success "\nDespliegue completado exitosamente!"
}

cleanup() {
    log "Limpiando recursos no utilizados..."
    docker system prune -f
    docker image prune -f
    success "Limpieza completada"
}

# =================================================================
# FUNCIÓN PRINCIPAL
# =================================================================

main() {
    log "=== INICIANDO DESPLIEGUE DE ZIENSHIELD ==="
    
    check_requirements
    validate_ports
    build_images
    deploy_services
    wait_for_services
    run_health_checks
    show_status
    
    if [[ "${1:-}" == "--cleanup" ]]; then
        cleanup
    fi
    
    log "=== DESPLIEGUE COMPLETADO ==="
}

# =================================================================
# MANEJO DE ARGUMENTOS
# =================================================================

case "${1:-}" in
    "build")
        build_images
        ;;
    "deploy")
        deploy_services
        wait_for_services
        ;;
    "status")
        show_status
        ;;
    "logs")
        docker-compose -f "$DOCKER_COMPOSE_FILE" logs -f "${2:-}"
        ;;
    "stop")
        log "Deteniendo servicios..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" down
        success "Servicios detenidos"
        ;;
    "restart")
        log "Reiniciando servicios..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" restart
        success "Servicios reiniciados"
        ;;
    "clean")
        log "Limpiando todo (contenedores, imágenes, volúmenes)..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" down -v --remove-orphans
        docker system prune -af
        success "Limpieza completa realizada"
        ;;
    "help"|"-h"|"--help")
        echo "Uso: $0 [comando]"
        echo ""
        echo "Comandos disponibles:"
        echo "  (sin argumentos)  - Despliegue completo"
        echo "  build            - Solo construir imágenes"
        echo "  deploy           - Solo desplegar servicios"
        echo "  status           - Mostrar estado de servicios"
        echo "  logs [servicio]  - Mostrar logs"
        echo "  stop             - Detener servicios"
        echo "  restart          - Reiniciar servicios"
        echo "  clean            - Limpiar todo"
        echo "  help             - Mostrar esta ayuda"
        ;;
    "")
        main "$@"
        ;;
    *)
        error "Comando desconocido: $1"
        error "Usa '$0 help' para ver comandos disponibles"
        exit 1
        ;;
esac