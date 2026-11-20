const adminService = require('../services/admin.service');
const oportunidadeService = require('../services/oportunidade.service');
const asyncHandler = require('../utils/asyncHandler');
const { sucesso } = require('../utils/response');

const listarEmpresas = asyncHandler(async (req, res) => {
  sucesso(res, 200, await adminService.listarEmpresas({ status: req.query.status }));
});

const definirStatusEmpresa = asyncHandler(async (req, res) => {
  const empresa = await adminService.definirStatusEmpresa(req.params.id, req.body);
  sucesso(res, 200, empresa);
});

const listarOportunidades = asyncHandler(async (req, res) => {
  sucesso(res, 200, await oportunidadeService.listarParaAdmin({ status: req.query.status }));
});

const moderarOportunidade = asyncHandler(async (req, res) => {
  const publicacao = await oportunidadeService.moderar(req.params.id, req.body);
  sucesso(res, 200, publicacao);
});

module.exports = { listarEmpresas, definirStatusEmpresa, listarOportunidades, moderarOportunidade };
