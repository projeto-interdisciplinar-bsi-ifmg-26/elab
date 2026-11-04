const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();

const validar = require('../middlewares/validate');
const { permitir } = require('../middlewares/auth.middleware');
const itens = require('../controllers/perfilItens.controller');
const curriculo = require('../controllers/curriculo.controller');
const { receberCurriculo } = require('../middlewares/upload');

const GRAUS = ['tecnico', 'graduacao', 'pos', 'mestrado', 'doutorado', 'bootcamp', 'curso_livre'];
const STATUS = ['concluido', 'cursando', 'trancado'];
const opt = { checkFalsy: true };
const idValido = param('id').isInt({ min: 1 }).withMessage('ID inválido').toInt();

const dataIso = (campo, rotulo) =>
  body(campo).matches(/^\d{4}-\d{2}-\d{2}$/).withMessage(rotulo + ' inválida (use AAAA-MM-DD)')
    .bail().isISO8601({ strict: true }).withMessage(rotulo + ' inválida');

const regras = {
  experiencias: [
    body('cargo').trim().notEmpty().withMessage('Cargo é obrigatório').isLength({ max: 150 }).withMessage('Cargo muito longo'),
    body('empresa').trim().notEmpty().withMessage('Empresa é obrigatória').isLength({ max: 150 }).withMessage('Empresa muito longa'),
    body('local').optional(opt).trim().isLength({ max: 150 }).withMessage('Local muito longo'),
    dataIso('data_inicio', 'Data de início'),
    dataIso('data_fim', 'Data de término').optional(opt),
    body('atual').optional().isBoolean().withMessage('"atual" deve ser verdadeiro ou falso').toBoolean(),
    body('descricao').optional(opt).trim().isLength({ max: 2000 }).withMessage('Descrição muito longa')
  ],
  formacoes: [
    body('instituicao').trim().notEmpty().withMessage('Instituição é obrigatória').isLength({ max: 150 }).withMessage('Instituição muito longa'),
    body('curso').trim().notEmpty().withMessage('Curso é obrigatório').isLength({ max: 150 }).withMessage('Curso muito longo'),
    body('grau').isIn(GRAUS).withMessage('Grau inválido'),
    body('status').optional(opt).isIn(STATUS).withMessage('Status inválido'),
    dataIso('data_inicio', 'Data de início').optional(opt),
    dataIso('data_fim', 'Data de término').optional(opt)
  ]
};

for (const ent of Object.keys(regras)) {
  router.get('/' + ent, permitir('colaboradora'), itens.listar(ent));
  router.post('/' + ent, permitir('colaboradora'), regras[ent], validar, itens.criar(ent));
  router.put('/' + ent + '/:id', permitir('colaboradora'), [idValido, ...regras[ent]], validar, itens.atualizar(ent));
  router.delete('/' + ent + '/:id', permitir('colaboradora'), [idValido], validar, itens.remover(ent));
}

router.post('/curriculo', permitir('colaboradora'), receberCurriculo, curriculo.enviar);
router.get('/curriculo', permitir('colaboradora'), curriculo.baixar);
router.delete('/curriculo', permitir('colaboradora'), curriculo.excluir);

module.exports = router;
