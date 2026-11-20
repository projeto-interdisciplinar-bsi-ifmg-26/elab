const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();

const adminController = require('../controllers/admin.controller');
const { autenticar, permitir } = require('../middlewares/auth.middleware');
const validar = require('../middlewares/validate');

router.use(autenticar, permitir('admin'));

// Aprovacao de cadastros de empresa.
router.get(
  '/empresas',
  [query('status').optional().isIn(['pendente', 'aprovada', 'rejeitada']).withMessage('Status inválido')],
  validar,
  adminController.listarEmpresas
);

router.put(
  '/empresas/:id/status',
  [
    param('id').isInt({ min: 1 }).withMessage('ID inválido').toInt(),
    body('status').isIn(['pendente', 'aprovada', 'rejeitada']).withMessage('Status inválido'),
    body('motivo').optional().trim().isLength({ max: 255 }).withMessage('Motivo muito longo')
  ],
  validar,
  adminController.definirStatusEmpresa
);

// Moderacao de publicacoes (vagas, eventos, palestras, bolsas).
router.get(
  '/oportunidades',
  [query('status').optional().isIn(['pendente', 'aprovada', 'rejeitada']).withMessage('Status inválido')],
  validar,
  adminController.listarOportunidades
);

router.put(
  '/oportunidades/:id/moderacao',
  [
    param('id').isInt({ min: 1 }).withMessage('ID inválido').toInt(),
    body('status').isIn(['aprovada', 'rejeitada']).withMessage('Status inválido'),
    body('motivo').optional().trim().isLength({ max: 255 }).withMessage('Motivo muito longo')
  ],
  validar,
  adminController.moderarOportunidade
);

module.exports = router;
