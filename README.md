# 🛡️ ZienShield Docker - Security Platform Containerized

[![Docker](https://img.shields.io/badge/Docker-Ready-blue?logo=docker)](https://docker.com)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://reactjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Compatible-blue?logo=postgresql)](https://postgresql.org)

**ZienShield** es una plataforma de seguridad multi-tenant desarrollada para monitoreo y gestión de infraestructuras de TI, completamente containerizada con Docker para despliegues en entornos de producción.

## 🚀 **Despliegue Rápido**

```bash
# 1. Clonar repositorio
git clone https://github.com/JCValleCruz/zshielddocker.git
cd zshielddocker

# 2. Configurar variables de entorno
cp .env.production.template .env.production
nano .env.production  # Editar variables obligatorias

# 3. Desplegar automáticamente
chmod +x deploy.sh
./deploy.sh
```

**¡Tu aplicación estará disponible en http://localhost:3080!**

---

## 📋 **Características**

### 🔐 **Seguridad**
- Multi-tenant con aislamiento de datos
- Autenticación JWT con rate limiting
- Integración con Wazuh API para monitoreo
- Headers de seguridad y CORS configurado

### 🏗️ **Arquitectura Docker**
- **Backend**: Node.js 18+ con Express
- **Frontend**: React 19 con TypeScript y Tailwind CSS  
- **Proxy**: Nginx con rate limiting y cache
- **Cache**: Redis para sesiones y datos
- **Monitoring**: Prometheus metrics integrado

### 📊 **Funcionalidades**
- Dashboard de seguridad en tiempo real
- Gestión de empresas multi-tenant
- Monitoreo de equipos y vulnerabilidades
- Análisis de tráfico de red
- Alertas y reportes automáticos

---

## 🐋 **Arquitectura Docker**

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

### Red Interna Docker: `172.20.0.0/16`
- **Reverse Proxy**: `172.20.0.5`
- **Backend**: `172.20.0.10`  
- **Frontend**: `172.20.0.20`
- **Redis**: `172.20.0.30`

---

## ⚙️ **Configuración Requerida**

### Variables de Entorno Críticas

```bash
# Base de datos PostgreSQL
DB_HOST=tu-servidor-postgres
DB_PASSWORD=tu-password-seguro
DB_NAME=zienshield

# JWT Security (generar con: openssl rand -base64 64)
JWT_SECRET=tu-jwt-secret-super-seguro

# Wazuh API
WAZUH_API_URL=https://tu-wazuh-server:55000
WAZUH_USERNAME=tu-usuario-wazuh  
WAZUH_PASSWORD=tu-password-wazuh

# CORS (dominios permitidos)
CORS_ORIGINS=https://tu-dominio.com,https://www.tu-dominio.com

# Frontend API URL
REACT_APP_API_URL=https://tu-dominio.com:3001
```

---

## 🛠️ **Operaciones**

### Comandos Principales
```bash
# Ver estado de servicios
./deploy.sh status

# Ver logs en tiempo real  
./deploy.sh logs
./deploy.sh logs backend
./deploy.sh logs frontend

# Reiniciar servicios
./deploy.sh restart

# Detener servicios
./deploy.sh stop

# Actualizar aplicación
./deploy.sh build && ./deploy.sh deploy

# Limpieza completa
./deploy.sh clean
```

### Monitoreo
- **Application**: http://localhost:3080
- **Health Check**: http://localhost:3080/health  
- **API**: http://localhost:3080/api
- **Prometheus**: http://localhost:9090 (opcional)

---

## 📚 **Documentación**

- **[📖 Guía de Despliegue Completa](README-DOCKER-DEPLOYMENT.md)** - Documentación exhaustiva
- **[📝 Log de Migración](DOCKER_MIGRATION_LOG.md)** - Proceso de dockerización
- **[⚙️ Configuración Environment](.env.production.template)** - Variables de entorno

---

## 🔧 **Requisitos del Sistema**

### Servidor Destino
- **Docker** 20.10+
- **Docker Compose** 1.29+
- **RAM**: Mínimo 2GB, recomendado 4GB
- **Disco**: Mínimo 5GB libres
- **Puertos disponibles**: 3080, 3443, 9090

### Servicios Externos
- **PostgreSQL** 12+ (base de datos)
- **Wazuh API** (monitoreo de seguridad)
- **Conectividad de red** a servicios externos

---

## 🚨 **Puertos Utilizados**

### Expuestos al Host
- **3080** - HTTP (Reverse Proxy)
- **3443** - HTTPS (Reverse Proxy, cuando SSL esté configurado)
- **9090** - Prometheus Metrics (opcional)

### Internos Docker
- **3001** - Backend API
- **80** - Frontend Nginx  
- **6379** - Redis Cache

> ✅ **Sin Conflictos**: Los puertos fueron elegidos para evitar conflictos con servicios comunes (Apache, Nginx, ElasticSearch, etc.)

---

## 🛡️ **Seguridad**

### Características Implementadas
- ✅ Contenedores no-root con usuarios dedicados
- ✅ Read-only filesystems donde sea posible
- ✅ Security headers en Nginx
- ✅ Rate limiting por endpoint
- ✅ Variables de entorno para secrets
- ✅ Health checks automáticos

### Rate Limiting
- **Autenticación**: 3 requests/minuto
- **API General**: 30 requests/minuto  
- **Navegación**: 60 requests/minuto

---

## 🔄 **Actualizaciones**

```bash
# Actualizar desde repositorio
git pull origin main

# Reconstruir y redesplegar
./deploy.sh build
./deploy.sh deploy

# Verificar funcionamiento
./deploy.sh status
```

---

## 📞 **Soporte**

### Resolución de Problemas
1. **Revisar logs**: `./deploy.sh logs`
2. **Verificar configuración**: `./deploy.sh status`
3. **Consultar documentación**: [README-DOCKER-DEPLOYMENT.md](README-DOCKER-DEPLOYMENT.md)
4. **Verificar variables**: Revisar `.env.production`

### Recursos Adicionales
- **Issues**: [GitHub Issues](https://github.com/JCValleCruz/zshielddocker/issues)
- **Docs**: Documentación completa en el repositorio
- **Logs**: Proceso completo en `DOCKER_MIGRATION_LOG.md`

---

## 📄 **Licencia**

Este proyecto está bajo licencia privada. Todos los derechos reservados.

---

**🎉 ¡ZienShield Docker está listo para producción!**

*Plataforma de seguridad containerizada, escalable y robusta.*