const service = require('../services/match.service');
const alocacaoService = require('../services/alocacao.service');
const asyncHandler = require('../utils/asyncHandler');
const { sucesso } = require('../utils/response');

const vagas = asyncHandler(async (req, res) => sucesso(res, 200, await service.ranquearVagas(req.usuario.id)));
const trilha = asyncHandler(async (req, res) => sucesso(res, 200, await service.trilhaParaVaga(req.usuario.id, req.params.vagaId)));

const alocacao = asyncHandler(async (req, res) => sucesso(res, 200, await alocacaoService.alocarMelhor(req.usuario.id)));

module.exports = { vagas, trilha, alocacao };
