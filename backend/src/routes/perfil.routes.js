const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const perfilController = require('../controllers/perfil.controller');
const { autenticar, permitir } = require('../middlewares/auth.middleware');
const validar = require('../middlewares/validate');
const perfilCompletoController = require('../controllers/perfilCompleto.controller');
const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
const NIVEIS = ['estagio', 'junior', 'pleno', 'senior', 'especialista'];
const DISPONIBILIDADES = ['imediata', '15_dias', '30_dias', 'empregada_aberta', 'nao_procurando'];
const MODALIDADES = ['remoto', 'hibrido', 'presencial', 'indiferente'];
const opt = { checkFalsy: true };

router.use(autenticar);

router.get('/', perfilController.obter);

router.put('/', [
  body('nome').trim().notEmpty().withMessage('Nome é obrigatório').isLength({ max: 80 }).withMessage('Nome muito longo'),
  body('area').optional().trim().isLength({ max: 80 }).withMessage('Área muito longa'),
  body('cidade').optional().trim().isLength({ max: 80 }).withMessage('Cidade muito longa'),
  body('bio').optional().trim().isLength({ max: 255 }).withMessage('Bio deve ter no máximo 255 caracteres')
], validar, perfilController.atualizar);

router.get('/completo', permitir('colaboradora'), perfilCompletoController.completo);

router.put('/dados', permitir('colaboradora'), [
  body('nome').optional().trim().notEmpty().withMessage('Nome não pode ficar vazio').isLength({ max: 80 }).withMessage('Nome muito longo'),
  body('area').optional().trim().isLength({ max: 80 }).withMessage('Área muito longa'),
  body('titulo_profissional').optional().trim().isLength({ max: 120 }).withMessage('Título muito longo'),
  body('bio').optional().trim().isLength({ max: 255 }).withMessage('Bio deve ter no máximo 255 caracteres'),
  body('resumo').optional().trim().isLength({ max: 3000 }).withMessage('Resumo deve ter no máximo 3000 caracteres'),
  body('cidade').optional().trim().isLength({ max: 100 }).withMessage('Cidade muito longa'),
  body('estado').optional(opt).isIn(UFS).withMessage('Estado inválido'),
  body('telefone').optional().trim().isLength({ max: 45 }).withMessage('Telefone muito longo'),
  body('nivel').optional(opt).isIn(NIVEIS).withMessage('Nível inválido'),
  body('anos_experiencia').optional(opt).isInt({ min: 0, max: 60 }).withMessage('Anos de experiência inválido').toInt(),
  body('disponibilidade').optional(opt).isIn(DISPONIBILIDADES).withMessage('Disponibilidade inválida'),
  body('link_portfolio').optional(opt).isURL().withMessage('Link de portfólio inválido').isLength({ max: 255 }),
  body('link_github').optional(opt).isURL().withMessage('Link do GitHub inválido').isLength({ max: 255 }),
  body('link_linkedin').optional(opt).isURL().withMessage('Link do LinkedIn inválido').isLength({ max: 255 }),
  body('perfil_publico').optional().isBoolean().withMessage('perfil_publico deve ser verdadeiro ou falso').toBoolean()
], validar, perfilCompletoController.atualizarDados);

router.put('/preferencias', permitir('colaboradora'), [
  body('modalidade').optional().isIn(MODALIDADES).withMessage('Modalidade inválida'),
  body(['aceita_clt', 'aceita_pj', 'aceita_estagio', 'aceita_mudar_cidade', 'interesse_vagas', 'interesse_eventos', 'interesse_palestras', 'interesse_bolsas'])
    .optional().isBoolean().withMessage('Valor deve ser verdadeiro ou falso').toBoolean(),
  body('pretensao_min').optional(opt).isFloat({ min: 0, max: 1000000 }).withMessage('Pretensão inválida').toFloat()
], validar, perfilCompletoController.salvarPreferencias);

router.put('/areas', permitir('colaboradora'), [
  body('areas').isArray({ max: 15 }).withMessage('Áreas inválidas'),
  body('areas.*.areaId').isInt({ min: 1 }).withMessage('ID de área inválido').toInt(),
  body('areas.*.interesse').optional().isInt({ min: 1, max: 5 }).withMessage('Interesse deve ser de 1 a 5').toInt()
], validar, perfilCompletoController.substituirAreas);

router.put('/habilidades', permitir('colaboradora'), [
  body('habilidades').isArray({ max: 40 }).withMessage('Habilidades inválidas'),
  body('habilidades.*.habilidadeId').isInt({ min: 1 }).withMessage('ID de habilidade inválido').toInt(),
  body('habilidades.*.anos').optional(opt).isInt({ min: 0, max: 50 }).withMessage('Anos inválidos').toInt()
], validar, perfilCompletoController.substituirHabilidades);

router.use(require('./perfilExtras.routes'));
module.exports = router;
