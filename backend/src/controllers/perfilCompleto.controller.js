const service = require('../services/perfilCompleto.service');
const asyncHandler = require('../utils/asyncHandler');
const { sucesso } = require('../utils/response');

const completo = asyncHandler(async (req, res) => sucesso(res, 200, await service.completo(req.usuario.id)));
const atualizarDados = asyncHandler(async (req, res) => sucesso(res, 200, await service.atualizarDados(req.usuario.id, req.body)));
const salvarPreferencias = asyncHandler(async (req, res) => sucesso(res, 200, await service.salvarPreferencias(req.usuario.id, req.body)));
const substituirAreas = asyncHandler(async (req, res) => sucesso(res, 200, await service.substituirAreas(req.usuario.id, req.body.areas)));
const substituirHabilidades = asyncHandler(async (req, res) => sucesso(res, 200, await service.substituirHabilidades(req.usuario.id, req.body.habilidades)));

module.exports = { completo, atualizarDados, salvarPreferencias, substituirAreas, substituirHabilidades };
