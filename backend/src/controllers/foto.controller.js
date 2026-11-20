const service = require('../services/imagem.service');
const asyncHandler = require('../utils/asyncHandler');
const { sucesso } = require('../utils/response');

const enviar = asyncHandler(async (req, res) => sucesso(res, 201, await service.enviarFoto(req.usuario.id, req.file)));

const excluir = asyncHandler(async (req, res) => {
  await service.excluirFoto(req.usuario.id);
  sucesso(res, 200, { removido: true });
});

module.exports = { enviar, excluir };
