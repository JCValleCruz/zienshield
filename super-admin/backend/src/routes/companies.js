const express = require('express');
const router = express.Router();
const { getAllCompanies, createCompany, deleteCompany } = require('../controllers/companies');

// GET /api/companies - Obtener todas las empresas
router.get('/', getAllCompanies);

// POST /api/companies - Crear nueva empresa
router.post('/', createCompany);

// DELETE /api/companies/:id - Eliminar empresa
router.delete('/:id', deleteCompany);

module.exports = router;
