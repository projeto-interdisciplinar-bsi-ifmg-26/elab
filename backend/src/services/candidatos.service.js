const ApiError = require('../utils/ApiError');
const { obterContexto } = require('./grafo.service');
const oportunidadeRepo = require('../repositories/oportunidade.repository');
const candidatosRepo = require('../repositories/candidatos.repository');
const matchRepo = require('../repositories/match.repository');

// Inscritos numa oportunidade da empresa logada, ordenados por score de match (quando for vaga).
async function listarRanqueados(usuarioId, oportunidadeId) {
  const empresaId = await candidatosRepo.idEmpresaPorUsuario(usuarioId);
  if (!empresaId) throw new ApiError(403, 'Acesso não permitido para este perfil');

  const oportunidade = await oportunidadeRepo.buscarPorId(oportunidadeId);
  if (!oportunidade) throw new ApiError(404, 'Oportunidade não encontrada');
  if (oportunidade.Entidade_Parceira_idEntidade_Parceira !== empresaId) {
    throw new ApiError(403, 'Esta oportunidade não pertence à sua empresa');
  }

  const inscritos = await candidatosRepo.listarInscritos(oportunidadeId);
  const vaga = await matchRepo.buscarVaga(oportunidadeId);

  // Eventos, palestras e bolsas nao tem requisitos: devolve sem score, por data de inscricao.
  if (!vaga) {
    return inscritos
      .map((i) => ({ ...i, score: null }))
      .sort((a, b) => String(a.data_inscricao).localeCompare(String(b.data_inscricao)));
  }

  const { motor, nomes } = await obterContexto();
  const pontuados = [];
  for (const i of inscritos) {
    const candidata = await matchRepo.carregarCandidata(i.profissionalId);
    const r = motor.pontuar(motor.prepararCandidata(candidata), vaga);
    pontuados.push({
      ...i,
      score: r.score,
      componentes: r.componentes,
      faltantes: r.faltantes.map((id) => ({ id, nome: nomes.get(id) || null })),
      eliminatorias: r.eliminatorias.map((id) => ({ id, nome: nomes.get(id) || null }))
    });
  }
  return pontuados.sort((a, b) => b.score - a.score);
}

module.exports = { listarRanqueados };
