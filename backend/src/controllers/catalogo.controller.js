const service = require('../services/catalogo.service');
const asyncHandler = require('../utils/asyncHandler');
const { sucesso } = require('../utils/response');

// Dados de referencia mudam raramente: cache curto no navegador.
const cache = (res) => res.set('Cache-Control', 'public, max-age=300');

const habilidades = asyncHandler(async (req, res) => {
  cache(res);
  sucesso(res, 200, await service.habilidades());
});

const areas = asyncHandler(async (req, res) => {
  cache(res);
  sucesso(res, 200, await service.areas());
});

const opcoes = asyncHandler(async (req, res) => {
  cache(res);
  sucesso(res, 200, await service.opcoes());
});

module.exports = { habilidades, areas, opcoes };
