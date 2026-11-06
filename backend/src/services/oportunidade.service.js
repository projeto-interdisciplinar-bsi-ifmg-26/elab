const ApiError = require('../utils/ApiError');
const oportunidadeRepository = require('../repositories/oportunidade.repository');
const usuarioRepository = require('../repositories/usuario.repository');
const { query } = require('../../db/pool');
const detalhesRepo = require('../repositories/oportunidadeDetalhes.repository');
const perfilRepo = require('../repositories/perfilCompleto.repository');

async function listar(filtros) {
  return oportunidadeRepository.listar(filtros);
}

async function listarPorEmpresa(usuarioId) {
  const rows = await query(
    'SELECT idEntidade_Parceira FROM Entidades_Parceiras WHERE Usuario_idUsuario = ?',
    [usuarioId]
  );

  if (!rows || rows.length === 0) {
    return [];
  }

  return oportunidadeRepository.listar({ empresaId: rows[0].idEntidade_Parceira });
}

async function obter(id) {
  const o = await oportunidadeRepository.buscarPorId(id);
  if (!o) throw new ApiError(404, 'Oportunidade não encontrada');
  return o;
}

async function criar(empresaId, dados) {
  const empresa = await query(
    'SELECT idEntidade_Parceira, nome_organizacao FROM Entidades_Parceiras WHERE Usuario_idUsuario = ?',
    [empresaId]
  );

  if (!empresa || empresa.length === 0) {
    throw new ApiError(400, 'Perfil de empresa não encontrado.');
  }

  const idEntidade = empresa[0].idEntidade_Parceira;
  const nomeEmpresa = empresa[0].nome_organizacao;
  const habilidades = (dados.habilidades || []).map(h => String(h).trim().slice(0, 30)).filter(Boolean);

  const requisitos = [...new Map((dados.requisitos || []).map((r) => [r.habilidadeId, r])).values()];
  if (dados.areaId && !(await perfilRepo.areasExistentes([dados.areaId])).length) {
    throw new ApiError(400, 'Área inexistente');
  }
  const existem = new Set(await perfilRepo.habilidadesExistentes(requisitos.map((r) => r.habilidadeId)));
  const invalidas = requisitos.filter((r) => !existem.has(r.habilidadeId)).map((r) => r.habilidadeId);
  if (invalidas.length) throw new ApiError(400, 'Habilidades inexistentes: ' + invalidas.join(', '));

  const criada = await oportunidadeRepository.criar({ ...dados, habilidades, empresaId: idEntidade, empresaNome: nomeEmpresa });
  if (dados.tipo === 'vaga') await detalhesRepo.salvarDetalhes(criada.id, { ...dados, requisitos });
  return criada;
}

// Serve tanto para candidatura (vaga) quanto para inscrição (demais tipos).
async function inscrever(usuarioId, oportunidadeId, mensagem) {
  const o = await obter(oportunidadeId);

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
    usuarioId: profissionalId,
    mensagem,
    protocolo
  });

  return { protocolo: protocolo, oportunidade: { id: o.id, titulo: o.titulo, tipo: o.tipo } };
}

async function listarCandidatos(oportunidadeId) {
  return oportunidadeRepository.buscarCandidatos(oportunidadeId);
}

module.exports = { listar, listarPorEmpresa, obter, criar, inscrever, listarCandidatos };
