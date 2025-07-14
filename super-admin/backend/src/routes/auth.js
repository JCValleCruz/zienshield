const express = require('express');
const router = express.Router();

// POST /api/auth/login - Login básico (por ahora simple)
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  // Validación muy básica por ahora
  if (email === 'admin@zienshield.com' && password === 'ZienAdmin2025') {
    res.json({ 
      success: true, 
      token: 'demo-token-super-admin',
      user: {
        email: 'admin@zienshield.com',
        role: 'super_admin',
        name: 'Super Administrator'
      }
    });
  } else {
    res.status(401).json({ 
      success: false, 
      error: 'Credenciales inválidas' 
    });
  }
});

module.exports = router;
