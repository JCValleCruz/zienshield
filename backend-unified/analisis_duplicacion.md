# 🔍 ANÁLISIS DE DUPLICACIÓN ENTRE BACKENDS

## 📊 COMPARACIÓN ESTRUCTURAL

### **ARQUITECTURA IDENTIFICADA:**

#### **API Backend** (`/api/src/server.js` - 703 líneas)
- **Estilo:** Monolítico - toda la lógica en server.js
- **Puerto:** 3001 (actualmente corriendo en 3002)
- **Funcionalidad principal:** CRUD empresas + Wazuh sync + Impersonación

#### **Super Admin Backend** (`/super-admin/backend/src/server.js` - 98 líneas)  
- **Estilo:** Modular - rutas separadas en archivos
- **Puerto:** 3002 (actualmente corriendo en 3001)
- **Funcionalidad principal:** Dashboard admin + Stats + Múltiples servicios

---

## 🔧 ANÁLISIS DE MIDDLEWARE

### **API Backend (Monolítico):**
```javascript
// Middleware básico
const cors = require('cors');
app.use(cors(corsConfig.getCorsConfig()));
app.use(express.json());
```

### **Super Admin Backend (Modular):**
```javascript
// Middleware avanzado
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));
app.use(cors({ origin: ['http://localhost:3000', 'http://194.164.172.92:3000'] }));
app.use(express.json({ limit: '10mb' }));
app.use(httpMetricsMiddleware);
```

### **MIDDLEWARE COMPARISON:**
| Funcionalidad | API Backend | Super Admin | Acción |
|--------------|-------------|-------------|--------|
| Express | ✅ Basic | ✅ Basic | USAR Basic |
| CORS | ✅ Centralizado | ✅ Hardcoded | USAR Centralizado |
| Helmet Security | ❌ No | ✅ Sí | MIGRAR al unificado |
| Rate Limiting | ❌ No | ✅ Sí (500/15min) | MIGRAR al unificado |
| Body Parser | ✅ JSON | ✅ JSON + URL + Static | USAR JSON + URL |
| Métricas | ❌ No | ✅ Prometheus | MIGRAR al unificado |

---

## 🛣️ ANÁLISIS DE RUTAS

### **API Backend (server.js inline):**
```javascript
// Health check
GET /api/health

// CRUD Empresas (INLINE - 400+ líneas)
GET /api/companies
GET /api/companies/:id  
POST /api/companies
PUT /api/companies/:id
DELETE /api/companies/:id

// Wazuh Sync (INLINE - 100+ líneas)
POST /api/sync/wazuh
GET /api/sync/wazuh/status
GET /api/sync/wazuh/groups

// Autenticación + Impersonación (INLINE - 150+ líneas)  
POST /api/auth/impersonate/:tenantId
GET /api/auth/auto-login/:token
```

### **Super Admin Backend (rutas modulares):**
```javascript
// Rutas principales
app.use('/api/companies', require('./routes/companies'));       // GET, POST, DELETE
app.use('/api/auth', require('./routes/auth'));                // LOGIN multi-tenant
app.use('/api/stats', require('./routes/stats'));              // Estadísticas globales
app.use('/api/company', require('./routes/company-stats'));    // Stats por empresa
app.use('/api/company', require('./routes/vulnerabilities'));  // Vulnerabilidades
app.use('/api/system/server-metrics', require('./routes/server-metrics'));
app.use('/api/sync', require('./routes/sync'));                // Sync con Wazuh
app.use('/', require('./routes/metrics'));                     // Prometheus /metrics
app.use('/api/web-traffic', require('./routes/web-traffic'));  // Tráfico web
app.use('/api/equipment', require('./routes/equipment-monitoring'));
app.use('/api/windows-security', require('./routes/windows-security'));
```

### **MAPEO DE DUPLICACIÓN:**

| Ruta | API Backend | Super Admin | Estado |
|------|-------------|-------------|--------|
| `GET /api/health` | ✅ Inline básico | ✅ Inline avanzado | **DUPLICADO** |
| `GET /api/companies` | ✅ Inline completo | ✅ Modular | **DUPLICADO** |
| `POST /api/companies` | ✅ Inline completo | ✅ Modular | **DUPLICADO** |
| `PUT /api/companies/:id` | ✅ Inline completo | ❌ No existe | **ÚNICA** |
| `GET /api/companies/:id` | ✅ Inline completo | ❌ No existe | **ÚNICA** |
| `DELETE /api/companies/:id` | ✅ Inline completo | ✅ Modular | **DUPLICADO** |
| `POST /api/auth/*` | ✅ Impersonación | ✅ Login normal | **DIFERENTES** |
| `POST /api/sync/wazuh` | ✅ Inline completo | ✅ Modular | **DUPLICADO** |
| `GET /api/sync/wazuh/status` | ✅ Inline completo | ❌ No existe | **ÚNICA** |
| `GET /api/sync/wazuh/groups` | ✅ Inline completo | ❌ No existe | **ÚNICA** |

---

## 🔍 ANÁLISIS DE FUNCIONES DUPLICADAS

### **FUNCIONES EXACTAMENTE IDÉNTICAS:**

#### 1. **Validación de Email** (DUPLICADO 100%)
```javascript
// API Backend líneas 48-51
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Super Admin: CONFIRMADO que usa la misma lógica en controladores
```

#### 2. **Validación de Teléfono** (DUPLICADO 100%)
```javascript
// API Backend líneas 54-57
function isValidPhone(phone) {
  const phoneRegex = /^[+]?[\d\s\-()]{9,20}$/;
  return phoneRegex.test(phone);
}
```

#### 3. **Generación de tenant_id** (DUPLICADO 100%)
```javascript
// API Backend líneas 33-46
function generateTenantId(companyName, sector) {
  const cleanName = companyName.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const cleanSector = sector.toLowerCase().substring(0, 3);
  const randomSuffix = crypto.randomBytes(3).toString('hex');
  return `${cleanName}-${cleanSector}-${randomSuffix}`.substring(0, 50);
}
```

#### 4. **Configuración de Base de Datos** (DUPLICADO ~80%)
```javascript
// API Backend líneas 16-31
const { createPool } = require('../../shared/config/database');
const pool = createPool(Pool);

async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Conexión PostgreSQL exitosa:', result.rows[0].now);
    client.release();
  } catch (error) {
    console.error('❌ Error conectando a PostgreSQL:', error.message);
  }
}
```

---

## 🎯 MATRIZ DE COMPATIBILIDAD COMPLETA

| Funcionalidad | API Backend | Super Admin Backend | Estado | Acción Recomendada |
|--------------|-------------|-------------------|--------|-------------------|
| **MIDDLEWARE** |
| Express Setup | ✅ Básico | ✅ Básico | IDÉNTICO | ✅ USAR cualquiera |
| CORS | ✅ Centralizado | ✅ Hardcoded | DIFERENTE | ✅ USAR centralizado |
| Helmet Security | ❌ No | ✅ Configurado | FALTANTE | ✅ MIGRAR del Super Admin |
| Rate Limiting | ❌ No | ✅ 500 req/15min | FALTANTE | ✅ MIGRAR del Super Admin |
| Body Parser | ✅ JSON | ✅ JSON+URL+Static | DIFERENTE | ✅ COMBINAR características |
| Métricas Prometheus | ❌ No | ✅ Middleware | FALTANTE | ✅ MIGRAR del Super Admin |
| **BASE DE DATOS** |
| Pool Connection | ✅ Shared config | ✅ Local config | DIFERENTE | ✅ USAR shared config |
| Test Connection | ✅ Al inicio | ❌ No | FALTANTE | ✅ MIGRAR del API |
| **EMPRESAS CRUD** |
| GET /api/companies | ✅ Completo (15 líneas) | ✅ Controlador modular | DUPLICADO | ⚠️ CONSOLIDAR |
| POST /api/companies | ✅ Completo (85 líneas) | ✅ Controlador modular | DUPLICADO | ⚠️ CONSOLIDAR |
| PUT /api/companies/:id | ✅ Completo (105 líneas) | ❌ No existe | ÚNICO | ✅ MIGRAR del API |
| GET /api/companies/:id | ✅ Completo (35 líneas) | ❌ No existe | ÚNICO | ✅ MIGRAR del API |
| DELETE /api/companies/:id | ✅ Completo (57 líneas) | ✅ Controlador modular | DUPLICADO | ⚠️ CONSOLIDAR |
| **AUTENTICACIÓN** |
| Super Admin Login | ❌ No | ✅ Hardcoded creds | ÚNICO | ⚠️ MIGRAR + FIX security |
| Company Login | ❌ No | ✅ DB lookup | ÚNICO | ✅ MIGRAR del Super Admin |
| Impersonación | ✅ Completo (108 líneas) | ❌ No | ÚNICO | ✅ MIGRAR del API |
| Auto-login Token | ✅ Completo (91 líneas) | ❌ No | ÚNICO | ✅ MIGRAR del API |
| **WAZUH SYNC** |
| POST /api/sync/wazuh | ✅ Completo (45 líneas) | ✅ Modular | DUPLICADO | ⚠️ CONSOLIDAR |
| GET /api/sync/wazuh/status | ✅ Completo (18 líneas) | ❌ No | ÚNICO | ✅ MIGRAR del API |
| GET /api/sync/wazuh/groups | ✅ Completo (21 líneas) | ❌ No | ÚNICO | ✅ MIGRAR del API |
| **FUNCIONALIDADES ÚNICAS** |
| Stats Globales | ❌ No | ✅ /api/stats | ÚNICO | ✅ MANTENER en Super Admin |
| Company Stats | ❌ No | ✅ /api/company | ÚNICO | ✅ MANTENER en Super Admin |
| Vulnerabilities | ❌ No | ✅ /api/company | ÚNICO | ✅ MANTENER en Super Admin |
| Web Traffic | ❌ No | ✅ /api/web-traffic | ÚNICO | ✅ MANTENER en Super Admin |
| Equipment Monitor | ❌ No | ✅ /api/equipment | ÚNICO | ✅ MANTENER en Super Admin |
| Windows Security | ❌ No | ✅ /api/windows-security | ÚNICO | ✅ MANTENER en Super Admin |
| Server Metrics | ❌ No | ✅ /api/system/server-metrics | ÚNICO | ✅ MANTENER en Super Admin |
| Prometheus Metrics | ❌ No | ✅ /metrics | ÚNICO | ✅ MANTENER en Super Admin |

---

## 📊 ESTADÍSTICAS DE DUPLICACIÓN

### **LÍNEAS DE CÓDIGO DUPLICADAS:**
- **Funciones de validación:** ~25 líneas
- **CRUD Empresas:** ~300 líneas (GET, POST, DELETE)
- **Wazuh Sync:** ~45 líneas
- **Configuración DB:** ~20 líneas
- **Health check:** ~10 líneas

**TOTAL DUPLICADO:** ~400 líneas de 703 = **57% duplicación**

### **FUNCIONALIDADES ÚNICAS POR BACKEND:**

#### **API Backend únicamente:**
- PUT /api/companies/:id (105 líneas)
- GET /api/companies/:id (35 líneas) 
- Impersonación completa (200 líneas)
- Wazuh status/groups (40 líneas)

#### **Super Admin únicamente:**
- Helmet + Rate limiting + Métricas (seguridad)
- 8 rutas modulares especializadas (stats, vulnerabilities, web-traffic, etc.)
- Sistema de login multi-tenant
- Arquitectura modular vs monolítica

---

## 🎯 PLAN DE CONSOLIDACIÓN

### **PRIORIDAD 1 - FUNCIONES EXACTAMENTE DUPLICADAS:**
1. ✅ `isValidEmail()` → YA ESTÁ en ValidationService
2. ✅ `isValidPhone()` → YA ESTÁ en ValidationService  
3. ✅ `generateTenantId()` → YA ESTÁ en ValidationService
4. ⚠️ Database pool setup → USAR shared config

### **PRIORIDAD 2 - RUTAS DUPLICADAS CON LÓGICA SIMILAR:**
1. ⚠️ GET /api/companies → CONSOLIDAR (API inline vs Super Admin modular)
2. ⚠️ POST /api/companies → CONSOLIDAR (validaciones idénticas)
3. ⚠️ DELETE /api/companies/:id → CONSOLIDAR
4. ⚠️ POST /api/sync/wazuh → CONSOLIDAR

### **PRIORIDAD 3 - MIDDLEWARE Y CONFIGURACIÓN:**
1. ✅ CORS → USAR configuración centralizada (ya implementada)
2. ⚠️ Helmet + Rate limiting → MIGRAR del Super Admin
3. ⚠️ Prometheus metrics → MIGRAR del Super Admin
4. ⚠️ Body parsing → COMBINAR características

### **PRIORIDAD 4 - FUNCIONALIDADES ÚNICAS:**
1. ✅ MANTENER rutas especializadas del Super Admin
2. ⚠️ MIGRAR impersonación del API Backend
3. ⚠️ MIGRAR Wazuh status/groups del API Backend
4. ⚠️ MIGRAR PUT/GET individual empresas del API Backend

---

## ⚠️ RIESGOS IDENTIFICADOS

### **RIESGO 1: Diferencias en Validación de Empresas**
- API Backend: Validación inline extensa
- Super Admin: Validación en controlador separado
- **Mitigación:** Usar ValidationService unificado ya creado

### **RIESGO 2: Autenticación Incompatible**
- API Backend: Solo impersonación
- Super Admin: Login normal + hardcoded creds
- **Mitigación:** Crear sistema auth unificado con ambas funcionalidades

### **RIESGO 3: Configuración de Puerto**
- Ambos backends corriendo en puertos intercambiados (3001 ↔ 3002)
- **Mitigación:** Backend unificado en puerto 3001, deprecar 3002

### **RIESGO 4: Base de Datos**
- API Backend: Shared config (/shared/config/database)
- Super Admin: Local config (./config/database)
- **Mitigación:** Usar shared config + environment.js

---

## 📋 CHECKLIST PASO 1 COMPLETADO

- [x] **Comparar línea por línea ambos server.js**
- [x] **Catalogar funciones idénticas vs diferentes**  
- [x] **Mapear rutas duplicadas vs únicas**
- [x] **Identificar middleware común vs específico**
- [x] **Crear matriz de compatibilidad completa**
- [ ] **Verificar operatividad backends originales**

---

## 🚀 PRÓXIMO PASO: PASO 2 - CONFIGURAR MIDDLEWARE UNIFICADO

**Acción inmediata:** Crear middleware centralizado usando los mejores elementos de ambos backends:
- Helmet security del Super Admin
- Rate limiting del Super Admin  
- CORS centralizado del API Backend
- Prometheus metrics del Super Admin
- Error handling consistente