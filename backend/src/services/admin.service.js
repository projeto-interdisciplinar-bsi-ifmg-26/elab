const ApiError = require('../utils/ApiError');
const adminRepo = require('../repositories/admin.repository');

const STATUS = ['pendente', 'aprovada', 'rejeitada'];

async function listarEmpresas(filtros) {
  const status = filtros && filtros.status;
  if (status && !STATUS.includes(status)) throw new ApiError(400, 'Status inválido');
  return adminRepo.listarEmpresas({ status });
}

async function definirStatusEmpresa(id, { status, motivo }) {
  if (!STATUS.includes(status)) throw new ApiError(400, 'Status inválido');
  if (status === 'rejeitada' && !String(motivo || '').trim()) {
    throw new ApiError(400, 'Informe o motivo da rejeição');
  }
  const empresa = await adminRepo.buscarEmpresa(id);
  if (!empresa) throw new ApiError(404, 'Empresa não encontrada');

  await adminRepo.atualizarStatus(id, status, motivo);
  return adminRepo.buscarEmpresa(id);
}

module.exports = { listarEmpresas, definirStatusEmpresa, STATUS };
