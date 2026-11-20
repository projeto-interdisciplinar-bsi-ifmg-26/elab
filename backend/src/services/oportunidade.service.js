const ApiError = require('../utils/ApiError');
const oportunidadeRepository = require('../repositories/oportunidade.repository');
const usuarioRepository = require('../repositories/usuario.repository');
const { query } = require('../../db/pool');
const detalhesRepo = require('../repositories/oportunidadeDetalhes.repository');
const perfilRepo = require('../repositories/perfilCompleto.repository');

const STATUS_MODERACAO = ['pendente', 'aprovada', 'rejeitada'];

const ehAdmin = (usuario) => usuario?.tipo === 'admin';

// Id da empresa (Entidades_Parceiras) do usuario logado, ou null.
async function idEmpresaDoUsuario(usuarioId) {
  if (!usuarioId) return null;
  const rows = await query(
    'SELECT idEntidade_Parceira AS id FROM Entidades_Parceiras WHERE Usuario_idUsuario = ?',
    [usuarioId]
  );
  return rows[0] ? rows[0].id : null;
}

async function listar(filtros = {}, usuario) {
  const params = { tipo: filtros.tipo, status: filtros.status };

  // Visitantes, colaboradoras e empresas enxergam apenas publicacoes aprovadas.
  // O admin pode filtrar qualquer estado pela fila de moderacao.
  if (ehAdmin(usuario)) {
    if (filtros.moderacao) params.moderacao = filtros.moderacao;
  } else {
    params.moderacao = 'aprovada';
  }

  return oportunidadeRepository.listar(params);
}

async function listarPorEmpresa(usuarioId) {
  const empresaId = await idEmpresaDoUsuario(usuarioId);
  if (!empresaId) return [];
  // A empresa ve todas as suas publicacoes, inclusive pendentes e rejeitadas.
  return oportunidadeRepository.listar({ empresaId });
}

// Visibilidade da publicacao: aprovada para todos; qualquer estado para o admin
// e para a empresa dona; para os demais, 404 (nao revela que existe).
async function obter(id, usuario) {
  const o = await oportunidadeRepository.buscarPorId(id);
  if (!o) throw new ApiError(404, 'Oportunidade não encontrada');
  if (o.status_moderacao === 'aprovada') return o;
  if (ehAdmin(usuario)) return o;

  if (usuario?.tipo === 'entidade_parceira') {
    const empresaId = await idEmpresaDoUsuario(usuario.id);
    if (empresaId && empresaId === o.Entidade_Parceira_idEntidade_Parceira) return o;
  }

  throw new ApiError(404, 'Oportunidade não encontrada');
}

async function criar(empresaId, dados) {
  const empresa = await query(
    'SELECT idEntidade_Parceira, nome_organizacao, status_aprovacao FROM Entidades_Parceiras WHERE Usuario_idUsuario = ?',
    [empresaId]
  );

  if (!empresa || empresa.length === 0) {
    throw new ApiError(400, 'Perfil de empresa não encontrado.');
  }

  if (empresa[0].status_aprovacao !== 'aprovada') {
    throw new ApiError(403, 'Sua empresa ainda não foi aprovada');
  }

  const idEntidade = empresa[0].idEntidade_Parceira;
  const nomeEmpresa = empresa[0].nome_organizacao;

  const requisitos = [...new Map((dados.requisitos || []).map((r) => [r.habilidadeId, r])).values()];
  if (dados.areaId && !(await perfilRepo.areasExistentes([dados.areaId])).length) {
    throw new ApiError(400, 'Área inexistente');
  }
  const existem = new Set(await perfilRepo.habilidadesExistentes(requisitos.map((r) => r.habilidadeId)));
  const invalidas = requisitos.filter((r) => !existem.has(r.habilidadeId)).map((r) => r.habilidadeId);
  if (invalidas.length) throw new ApiError(400, 'Habilidades inexistentes: ' + invalidas.join(', '));

  const criada = await oportunidadeRepository.criar({ ...dados, empresaId: idEntidade, empresaNome: nomeEmpresa });
  if (dados.tipo === 'vaga') await detalhesRepo.salvarDetalhes(criada.id, { ...dados, requisitos });
  return criada;
}

// Serve tanto para candidatura (vaga) quanto para inscrição (demais tipos).
async function inscrever(usuarioId, oportunidadeId, mensagem) {
  const o = await oportunidadeRepository.buscarPorId(oportunidadeId);

  // Publicacao pendente ou rejeitada nao existe para a colaboradora.
  if (!o || o.status_moderacao !== 'aprovada') {
    throw new ApiError(404, 'Oportunidade não encontrada');
  }

  // Buscar o ID do profissional vinculado ao usuário
  const profissional = await query(
    'SELECT idProfissionais FROM Profissionais WHERE Usuario_idUsuario = ?',
    [usuarioId]
  );

  if (!profissional || profissional.length === 0) {
    throw new ApiError(400, 'Seu perfil de profissional não foi encontrado.');
  }

  const profissionalId = profissional[0].idProfissionais;

  if (await oportunidadeRepository.buscarInscricao(oportunidadeId, profissionalId)) {
    throw new ApiError(409, 'Você já se inscreveu nesta oportunidade');
  }

  const protocolo = Math.floor(100000 + Math.random() * 900000).toString();

  const i = await oportunidadeRepository.criarInscricao({
    oportunidadeId,
    profissionalId,
    mensagem,
    protocolo
  });

  return { protocolo: protocolo, oportunidade: { id: o.id, titulo: o.titulo, tipo: o.tipo } };
}

async function listarCandidatos(oportunidadeId) {
  return oportunidadeRepository.buscarCandidatos(oportunidadeId);
}

// Fila do admin: todas as publicacoes, opcionalmente filtradas por estado.
async function listarParaAdmin({ status } = {}) {
  if (status && !STATUS_MODERACAO.includes(status)) throw new ApiError(400, 'Status inválido');
  return oportunidadeRepository.listar({ moderacao: status });
}

async function moderar(id, { status, motivo }) {
  if (!STATUS_MODERACAO.includes(status)) throw new ApiError(400, 'Status inválido');
  if (status === 'rejeitada' && !String(motivo || '').trim()) {
    throw new ApiError(400, 'Informe o motivo da rejeição');
  }

  const o = await oportunidadeRepository.buscarPorId(id);
  if (!o) throw new ApiError(404, 'Publicação não encontrada');

  return oportunidadeRepository.definirModeracao(id, status, motivo);
}

module.exports = {
  listar,
  listarPorEmpresa,
  obter,
  criar,
  inscrever,
  listarCandidatos,
  listarParaAdmin,
  moderar,
  STATUS_MODERACAO
};
