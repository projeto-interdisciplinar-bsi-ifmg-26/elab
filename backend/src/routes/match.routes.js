const express = require('express');
const { param } = require('express-validator');
const router = express.Router();

const matchController = require('../controllers/match.controller');
const { autenticar, permitir } = require('../middlewares/auth.middleware');
const validar = require('../middlewares/validate');

router.use(autenticar);

// Ranking de vagas ativas para a colaboradora logada.
router.get('/vagas', permitir('colaboradora'), matchController.vagas);

// Trilha de aprendizado ate as habilidades que faltam para a vaga.
router.get(
  '/trilha/:vagaId',
  permitir('colaboradora'),
  [param('vagaId').isInt({ min: 1 }).withMessage('ID inválido').toInt()],
  validar,
  matchController.trilha
);

module.exports = router;
