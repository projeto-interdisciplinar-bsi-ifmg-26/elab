const service = require('../services/curriculo.service');
const asyncHandler = require('../utils/asyncHandler');
const { sucesso } = require('../utils/response');

const enviar = asyncHandler(async (req, res) => sucesso(res, 201, await service.enviar(req.usuario.id, req.file)));

const baixar = asyncHandler(async (req, res) => {
  const { caminho, nome } = await service.caminho(req.usuario.id);
  res.download(caminho, nome);
});

const excluir = asyncHandler(async (req, res) => {
  await service.excluir(req.usuario.id);
  sucesso(res, 200, { removido: true });
});

module.exports = { enviar, baixar, excluir };
