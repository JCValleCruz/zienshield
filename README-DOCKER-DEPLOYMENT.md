# 🐋 ZienShield - Guía de Despliegue Docker

## 📋 Resumen Ejecutivo

Esta guía documenta la **estrategia completa de migración** de ZienShield a un entorno Docker listo para producción en un servidor con múltiples servicios.

### ✅ Estado del Proyecto
- **Arquitectura**: Limpiada y optimizada
- **Dockerización**: Completada y lista para producción  
- **Configuración**: Centralizada y segura
- **Scripts**: Automatizados para despliegue
- **Documentación**: Completa y actualizada

---

## 🏗️ Arquitectura de la Solución

### Servicios Containerizados
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Reverse Proxy  │    │    Frontend     │    │    Backend      │
│   (Nginx)       │◄──►│   (React)       │◄──►│   (Node.js)     │
│   Port: 3080    │    │   Port: 80      │    │   Port: 3001    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                                              │
         │              ┌─────────────────┐             │
         └─────────────►│     Redis       │◄────────────┘
                        │   (Cache)       │
                        │   Port: 6379    │
                        └─────────────────┘
```

### Red Interna Docker: 172.20.0.0/16
- **Reverse Proxy**: 172.20.0.5
- **Backend**: 172.20.0.10  
- **Frontend**: 172.20.0.20
- **Redis**: 172.20.0.30

---

## 🚀 Despliegue Rápido

### 1. Preparación del Entorno
```bash
cd /home/gacel/zienshield-desastre

# Copiar template de configuración
cp .env.production.template .env.production

# Editar variables obligatorias
nano .env.production
```

### 2. Variables Críticas a Configurar
```bash
# Base de datos
DB_HOST=tu-servidor-postgres
DB_PASSWORD=tu-password-seguro
DB_NAME=zienshield

# JWT Security
JWT_SECRET=$(openssl rand -base64 64)

# Wazuh
WAZUH_API_URL=https://tu-wazuh-server:55000
WAZUH_USERNAME=tu-usuario-wazuh
WAZUH_PASSWORD=tu-password-wazuh

# CORS
CORS_ORIGINS=https://tu-dominio.com,https://www.tu-dominio.com
```

### 3. Despliegue Automatizado
```bash
# Hacer script ejecutable
chmod +x deploy.sh

# Despliegue completo
./deploy.sh

# O por pasos
./deploy.sh build    # Solo construir imágenes
./deploy.sh deploy   # Solo desplegar
./deploy.sh status   # Ver estado
```

---

## 📁 Archivos de Configuración

### Archivos Docker Core
- **`Dockerfile.backend`** - Backend Node.js multi-stage optimizado
- **`Dockerfile.frontend`** - Frontend React con Nginx multi-stage  
- **`docker-compose.yml`** - Configuración desarrollo
- **`docker-compose.production.yml`** - Configuración producción con proxy

### Configuración y Scripts
- **`.env.production.template`** - Template de variables de entorno
- **`nginx.conf`** - Reverse proxy con rate limiting y cache
- **`deploy.sh`** - Script automatizado de despliegue
- **`.dockerignore`** - Optimización de contexto de build

---

## 🔧 Configuración de Puertos

### Puertos Expuestos (Servidor Destino)
- **3080** - HTTP (Reverse Proxy)
- **3443** - HTTPS (Reverse Proxy) 
- **9090** - Prometheus Metrics (Opcional)

### Puertos Internos Docker
- **3001** - Backend API
- **80** - Frontend Nginx
- **6379** - Redis Cache

### ✅ Verificación de Conflictos
Los puertos elegidos **NO CONFLICTAN** con servicios existentes:
```
OCUPADOS EN SERVIDOR: 80, 443, 22, 25, 161, 783, 1514, 1515, 
                      3333, 5601, 5666, 8080, 8443, 9001, 
                      9200, 9300, 33569, 55000

LIBRES PARA NOSOTROS: 3000, 3001, 3080, 3443, 9090
```

---

## 🛡️ Seguridad y Optimizaciones

### Características de Seguridad
- ✅ **Contenedores no-root** con usuarios dedicados
- ✅ **Read-only filesystems** donde sea posible  
- ✅ **Security headers** configurados en Nginx
- ✅ **Rate limiting** por endpoints
- ✅ **Variables de entorno** para secrets
- ✅ **Health checks** para todos los servicios

### Optimizaciones de Performance  
- ✅ **Multi-stage builds** para imágenes mínimas
- ✅ **Nginx cache** para assets estáticos
- ✅ **Redis cache** para sesiones y datos
- ✅ **Resource limits** configurados
- ✅ **Logs rotation** automática

---

## 📊 Monitoreo y Logs

### Health Checks
```bash
# Verificar salud de servicios
curl http://localhost:3080/health

# Ver estado Docker
docker-compose -f docker-compose.production.yml ps
```

### Logs
```bash
# Ver logs en tiempo real
./deploy.sh logs

# Logs de servicio específico  
./deploy.sh logs backend
./deploy.sh logs frontend
```

### Métricas
- **Prometheus**: http://localhost:9090
- **Nginx Status**: http://localhost:3080/nginx_status (solo red interna)
- **App Metrics**: http://localhost:3080/metrics (solo red interna)

---

## 🔄 Operaciones Comunes

### Gestión de Servicios
```bash
# Reiniciar servicios
./deploy.sh restart

# Detener servicios
./deploy.sh stop  

# Ver estado
./deploy.sh status

# Limpieza completa
./deploy.sh clean
```

### Actualizaciones
```bash
# Reconstruir y redesplegar
./deploy.sh build
./deploy.sh deploy
```

### Backup
```bash
# Backup de volúmenes
docker run --rm -v zienshield_redis-data:/data -v $(pwd):/backup alpine tar czf /backup/redis-backup.tar.gz /data

# Backup de logs  
tar czf logs-backup-$(date +%Y%m%d).tar.gz /var/lib/docker/volumes/zienshield_*-logs/
```

---

## 🚨 Troubleshooting

### Problemas Comunes

**1. Error de variables de entorno**
```bash
# Verificar archivo .env.production existe y está completo
ls -la .env.production
source .env.production && env | grep -E "(DB_|JWT_|WAZUH_)"
```

**2. Puertos ocupados**
```bash
# Verificar puertos disponibles
ss -tuln | grep -E "(3080|3443|9090)"
```

**3. Servicios no saludables**
```bash
# Ver logs detallados
docker-compose -f docker-compose.production.yml logs --tail=100 backend
```

**4. Conectividad con servicios externos**
```bash
# Test conexión DB desde contenedor
docker exec zienshield-backend curl -v telnet://DB_HOST:5432

# Test conexión Wazuh
docker exec zienshield-backend curl -k -v $WAZUH_API_URL
```

### Comandos de Diagnóstico
```bash
# Estado completo del sistema
docker system df
docker stats --no-stream

# Información de red
docker network ls
docker network inspect zienshield_zienshield-network

# Verificar volúmenes
docker volume ls | grep zienshield
```

---

## 📚 Recursos Adicionales

### Archivos de Referencia
- `DOCKER_MIGRATION_LOG.md` - Log completo del proceso de migración
- `backend-unified/src/config/environment.js` - Configuración centralizada
- `super-admin/frontend/src/services/api.ts` - Cliente API frontend

### Servicios Externos Requeridos
- **PostgreSQL** - Base de datos principal
- **Wazuh API** - Servicio de seguridad y monitoreo
- **DNS/Dominio** - Para configuración CORS en producción

### Próximos Pasos Recomendados
1. **SSL/TLS** - Configurar certificados para HTTPS
2. **CI/CD** - Automatizar builds y despliegues  
3. **Monitoring** - Implementar Grafana dashboards
4. **Backup** - Automatizar respaldos de datos
5. **Scaling** - Considerar múltiples instancias

---

## ✅ Checklist de Despliegue

### Pre-despliegue
- [ ] Servidor destino identificado y accesible
- [ ] Docker y Docker Compose instalados  
- [ ] Variables de entorno configuradas en `.env.production`
- [ ] Servicios externos (DB, Wazuh) accesibles
- [ ] Puertos verificados como disponibles

### Despliegue  
- [ ] Imágenes construidas exitosamente
- [ ] Servicios desplegados y saludables
- [ ] Health checks pasando
- [ ] Conectividad frontend ↔ backend funcional
- [ ] APIs respondiendo correctamente

### Post-despliegue
- [ ] Logs configurados y funcionando
- [ ] Monitoreo activo
- [ ] Backup programado
- [ ] Documentación actualizada
- [ ] Equipo notificado del nuevo entorno

---

**🎉 ¡Despliegue Docker de ZienShield completado exitosamente!**

*Para soporte adicional, revisar logs en `DOCKER_MIGRATION_LOG.md` o contactar al equipo de desarrollo.*