#!/bin/bash
"""
ZienShield Agent Deployment Script
Script para desplegar agentes remotos via SSH
"""

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
ZIENSHIELD_SERVER="194.164.172.92:3001"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
INSTALL_SCRIPT="$SCRIPT_DIR/install-agent.py"

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  ZienShield Agent Deployment  ${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

show_help() {
    echo "ZienShield Agent Deployment Tool"
    echo ""
    echo "Uso:"
    echo "  $0 [OPTIONS] <target_host>"
    echo ""
    echo "Opciones:"
    echo "  -u, --user USER        Usuario SSH (default: root)"
    echo "  -p, --port PORT        Puerto SSH (default: 22)"
    echo "  -k, --key KEY_FILE     Archivo de clave SSH"
    echo "  -s, --server SERVER    Servidor ZienShield (default: $ZIENSHIELD_SERVER)"
    echo "  --dry-run              Modo simulación"
    echo "  -h, --help             Mostrar ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  $0 192.168.1.100                    # Desplegar con usuario root"
    echo "  $0 -u admin 192.168.1.100          # Desplegar con usuario admin"
    echo "  $0 -k ~/.ssh/id_rsa 192.168.1.100  # Usar clave SSH específica"
    echo ""
    echo "El script:"
    echo "  1. Conecta via SSH al host remoto"
    echo "  2. Transfiere el instalador del agente"
    echo "  3. Ejecuta la instalación automática"
    echo "  4. Configura el servicio del sistema"
    echo "  5. Inicia el monitoreo web"
}

# Parámetros por defecto
SSH_USER="root"
SSH_PORT="22"
SSH_KEY=""
TARGET_HOST=""
DRY_RUN=false

# Parsear argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        -u|--user)
            SSH_USER="$2"
            shift 2
            ;;
        -p|--port)
            SSH_PORT="$2"
            shift 2
            ;;
        -k|--key)
            SSH_KEY="$2"
            shift 2
            ;;
        -s|--server)
            ZIENSHIELD_SERVER="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            if [[ -z "$TARGET_HOST" ]]; then
                TARGET_HOST="$1"
            else
                print_error "Argumento desconocido: $1"
                exit 1
            fi
            shift
            ;;
    esac
done

# Validar argumentos
if [[ -z "$TARGET_HOST" ]]; then
    print_error "Host remoto requerido"
    echo ""
    show_help
    exit 1
fi

# Construir comando SSH
SSH_CMD="ssh"
if [[ -n "$SSH_KEY" ]]; then
    SSH_CMD="$SSH_CMD -i $SSH_KEY"
fi
SSH_CMD="$SSH_CMD -p $SSH_PORT $SSH_USER@$TARGET_HOST"

check_connectivity() {
    print_info "Verificando conectividad SSH a $TARGET_HOST..."
    
    if $DRY_RUN; then
        print_warning "Modo simulación - saltando verificación SSH"
        return 0
    fi
    
    if timeout 10 $SSH_CMD "echo 'SSH OK'" >/dev/null 2>&1; then
        print_success "Conectividad SSH verificada"
        return 0
    else
        print_error "No se puede conectar via SSH a $TARGET_HOST"
        print_info "Verificar:"
        echo "  - Host está disponible: ping $TARGET_HOST"
        echo "  - Puerto SSH abierto: nc -zv $TARGET_HOST $SSH_PORT"
        echo "  - Credenciales correctas"
        echo "  - Clave SSH: $SSH_KEY"
        return 1
    fi
}

check_remote_requirements() {
    print_info "Verificando requisitos en host remoto..."
    
    if $DRY_RUN; then
        print_warning "Modo simulación - saltando verificación de requisitos"
        return 0
    fi
    
    # Verificar Python
    if ! $SSH_CMD "python3 --version" >/dev/null 2>&1; then
        print_error "Python 3 no encontrado en host remoto"
        print_info "Instalar Python 3: apt-get install python3 python3-pip"
        return 1
    fi
    
    # Verificar permisos de root
    if ! $SSH_CMD "[ \$(id -u) -eq 0 ]" 2>/dev/null; then
        print_warning "Usuario no es root - puede requerir sudo"
    fi
    
    print_success "Requisitos verificados en host remoto"
    return 0
}

deploy_agent() {
    print_info "Desplegando agente ZienShield en $TARGET_HOST..."
    
    if $DRY_RUN; then
        print_warning "Modo simulación - saltando despliegue real"
        print_info "Comandos que se ejecutarían:"
        echo "  1. scp $INSTALL_SCRIPT $SSH_USER@$TARGET_HOST:/tmp/"
        echo "  2. ssh $SSH_USER@$TARGET_HOST 'python3 /tmp/install-agent.py'"
        return 0
    fi
    
    # Transferir instalador
    print_info "Transfiriendo instalador..."
    if ! scp $(if [[ -n "$SSH_KEY" ]]; then echo "-i $SSH_KEY"; fi) -P $SSH_PORT "$INSTALL_SCRIPT" "$SSH_USER@$TARGET_HOST:/tmp/"; then
        print_error "Error transfiriendo instalador"
        return 1
    fi
    
    # Ejecutar instalación remota
    print_info "Ejecutando instalación remota..."
    if ! $SSH_CMD "cd /tmp && python3 install-agent.py"; then
        print_error "Error en instalación remota"
        return 1
    fi
    
    print_success "Agente desplegado exitosamente"
    return 0
}

verify_deployment() {
    print_info "Verificando despliegue..."
    
    if $DRY_RUN; then
        print_warning "Modo simulación - saltando verificación"
        return 0
    fi
    
    # Verificar que el servicio esté corriendo
    if $SSH_CMD "systemctl is-active zienshield-web-monitor" >/dev/null 2>&1; then
        print_success "Servicio ZienShield activo"
    else
        print_warning "Servicio no está activo - verificar logs"
        $SSH_CMD "systemctl status zienshield-web-monitor" || true
    fi
    
    # Verificar archivos de instalación
    if $SSH_CMD "[ -f /opt/zienshield/zienshield-agent.py ]"; then
        print_success "Archivos de agente encontrados"
    else
        print_error "Archivos de agente no encontrados"
        return 1
    fi
    
    return 0
}

show_status() {
    print_info "Estado del agente en $TARGET_HOST:"
    
    if $DRY_RUN; then
        print_warning "Modo simulación - no hay estado real que mostrar"
        return 0
    fi
    
    echo ""
    echo "📁 Archivos instalados:"
    $SSH_CMD "ls -la /opt/zienshield/" 2>/dev/null || print_warning "Directorio no encontrado"
    
    echo ""
    echo "🔧 Estado del servicio:"
    $SSH_CMD "systemctl status zienshield-web-monitor --no-pager -l" 2>/dev/null || print_warning "Servicio no encontrado"
    
    echo ""
    echo "📊 Últimas líneas del log:"
    $SSH_CMD "tail -n 5 /opt/zienshield/logs/agent.log 2>/dev/null" || print_warning "Log no encontrado"
}

main() {
    print_header
    
    print_info "Host remoto: $TARGET_HOST"
    print_info "Usuario SSH: $SSH_USER"
    print_info "Puerto SSH: $SSH_PORT"
    print_info "Servidor ZienShield: $ZIENSHIELD_SERVER"
    if [[ -n "$SSH_KEY" ]]; then
        print_info "Clave SSH: $SSH_KEY"
    fi
    if $DRY_RUN; then
        print_warning "Modo SIMULACIÓN activado"
    fi
    
    echo ""
    
    # Verificar conectividad
    if ! check_connectivity; then
        exit 1
    fi
    
    # Verificar requisitos remotos
    if ! check_remote_requirements; then
        exit 1
    fi
    
    # Desplegar agente
    if ! deploy_agent; then
        exit 1
    fi
    
    # Verificar despliegue
    if ! verify_deployment; then
        print_warning "Despliegue completado con advertencias"
    fi
    
    # Mostrar estado
    show_status
    
    echo ""
    print_success "Despliegue completado exitosamente!"
    
    if ! $DRY_RUN; then
        print_info "El agente ahora está monitoreando tráfico web en $TARGET_HOST"
        print_info "Ver métricas en: http://$ZIENSHIELD_SERVER/dashboard"
        print_info "Ver logs: ssh $SSH_USER@$TARGET_HOST 'tail -f /opt/zienshield/logs/agent.log'"
    fi
}

# Ejecutar función principal
main "$@"