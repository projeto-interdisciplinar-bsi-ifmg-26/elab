const service = require('../services/perfilItens.service');
const asyncHandler = require('../utils/asyncHandler');
const { sucesso } = require('../utils/response');

const listar = (ent) => asyncHandler(async (req, res) => sucesso(res, 200, await service.listar(ent, req.usuario.id)));
const criar = (ent) => asyncHandler(async (req, res) => sucesso(res, 201, await service.criar(ent, req.usuario.id, req.body)));
const atualizar = (ent) => asyncHandler(async (req, res) => sucesso(res, 200, await service.atualizar(ent, req.usuario.id, req.params.id, req.body)));
const remover = (ent) => asyncHandler(async (req, res) => {
  await service.remover(ent, req.usuario.id, req.params.id);
  sucesso(res, 200, { removido: true });
});

module.exports = { listar, criar, atualizar, remover };
