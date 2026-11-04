const express = require('express');
const router = express.Router();
const catalogoController = require('../controllers/catalogo.controller');

// Dados de referencia publicos (usados ate na tela de registro).
router.get('/habilidades', catalogoController.habilidades);
router.get('/areas', catalogoController.areas);
router.get('/opcoes', catalogoController.opcoes);

module.exports = router;
