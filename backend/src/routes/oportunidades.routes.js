const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();

const oportunidadesController = require('../controllers/oportunidades.controller');
const { autenticar, permitir } = require('../middlewares/auth.middleware');
const validar = require('../middlewares/validate');

const idValido = param('id').isInt({ min: 1 }).withMessage('ID inválido').toInt();

router.get('/', oportunidadesController.listar);
router.get('/minhas', autenticar, permitir('empresa'), oportunidadesController.listarMinhas);
router.get('/minhas-inscricoes', autenticar, permitir('colaboradora'), oportunidadesController.listarMinhasInscricoes);
router.get('/:id', [idValido], validar, oportunidadesController.obter);

router.post('/', autenticar, permitir('empresa'), [
  body('titulo').trim().notEmpty().withMessage('Título é obrigatório').isLength({ max: 120 }).withMessage('Título muito longo'),
  body('tipo').isIn(['vaga', 'evento', 'palestra', 'bolsa']).withMessage('Tipo inválido'),
  body('descricao').optional().trim().isLength({ max: 1000 }).withMessage('Descrição muito longa'),
  body('local').optional().trim().isLength({ max: 80 }).withMessage('Local muito longo'),
  body('data').optional({ checkFalsy: true }).isISO8601().withMessage('Data inválida'),
  body('habilidades').optional().isArray({ max: 10 }).withMessage('Habilidades inválidas'),
  body('areaId').optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('Área inválida').toInt(),
  body('nivel').optional({ checkFalsy: true }).isIn(['estagio', 'junior', 'pleno', 'senior', 'especialista', 'qualquer']).withMessage('Nível inválido'),
  body('modalidade').optional({ checkFalsy: true }).isIn(['remoto', 'hibrido', 'presencial']).withMessage('Modalidade inválida'),
  body('salario_min').optional({ checkFalsy: true }).isFloat({ min: 0, max: 1000000 }).withMessage('Salário mínimo inválido').toFloat(),
  body('salario_max').optional({ checkFalsy: true }).isFloat({ min: 0, max: 1000000 }).withMessage('Salário máximo inválido').toFloat()
    .custom((v, { req }) => !req.body.salario_min || v >= req.body.salario_min).withMessage('Salário máximo menor que o mínimo'),
  body('requisitos').optional().isArray({ max: 20 }).withMessage('Requisitos inválidos'),
  body('requisitos.*.habilidadeId').isInt({ min: 1 }).withMessage('ID de habilidade inválido').toInt(),
  body('requisitos.*.importancia').optional().isInt({ min: 1, max: 5 }).withMessage('Importância deve ser de 1 a 5').toInt(),
  body('requisitos.*.obrigatoria').optional().isBoolean().withMessage('obrigatoria deve ser verdadeiro ou falso').toBoolean()
], validar, oportunidadesController.criar);

router.post('/:id/inscricoes', autenticar, permitir('colaboradora'), [
  idValido,
  body('mensagem').optional().trim().isLength({ max: 500 }).withMessage('Mensagem muito longa')
], validar, oportunidadesController.inscrever);

router.get('/:id/candidatos', autenticar, permitir('empresa'), [idValido], validar, oportunidadesController.listarCandidatos);

module.exports = router;
