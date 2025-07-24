const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Importar servicio de actualización de vulnerabilidades
const { startVulnerabilityUpdateService } = require('./services/vulnerabilityUpdateService');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware de seguridad
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 500, // máximo 500 requests por ventana
  message: 'Demasiadas solicitudes desde esta IP'
});
app.use('/api', limiter);

// CORS
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://194.164.172.92:3000',
    'http://localhost:3000'
  ],
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname, {setHeaders: function(res) {res.setHeader("Content-Type", "text/html; charset=utf-8");}}));
app.use(express.urlencoded({ extended: true }));

// Rutas principales
app.use('/api/companies', require('./routes/companies'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/stats', require('./routes/stats'));
app.use("/api/company", require("./routes/company-stats"));
app.use("/api/company", require("./routes/vulnerabilities"));
app.use('/api/system/server-metrics', require('./routes/server-metrics'));
app.use('/api/sync', require('./routes/sync'));

// Endpoint de salud
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'ZienSHIELD Super Admin Backend',
    version: '1.0.0'
  });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    timestamp: new Date().toISOString()
  });
});

// Ruta no encontrada
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado' });
});

// Iniciar servidor
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 ZienSHIELD Super Admin Backend funcionando en puerto ${PORT}`);
  console.log(`📊 Dashboard disponible en: http://localhost:${PORT}/api/health`);
  console.log(`🔗 Frontend URL configurada: ${process.env.FRONTEND_URL}`);
  
  // Iniciar servicio de actualización de vulnerabilidades
  startVulnerabilityUpdateService();
});

module.exports = app;
