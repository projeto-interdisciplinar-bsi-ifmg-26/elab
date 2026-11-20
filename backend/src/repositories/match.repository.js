const { query } = require('../../db/pool');
const perfilRepo = require('./perfilCompleto.repository');

const SELECT_VAGA =
  "SELECT o.idOportunidade AS id, o.Area_idArea AS areaId, o.nivel, o.modalidade, o.salario_max, o.status_moderacao, e.status_aprovacao AS empresa_status_aprovacao FROM Oportunidades o JOIN Entidades_Parceiras e ON e.idEntidade_Parceira = o.Entidade_Parceira_idEntidade_Parceira WHERE o.tipo = 'vaga'";

// Anexa os requisitos (Oportunidades_Habilidades) a cada vaga, no formato do motor de match.
async function anexarRequisitos(vagas) {
  if (vagas.length === 0) return [];
  const ids = vagas.map((v) => v.id);
  const rows = await query(
    'SELECT Oportunidade_idOportunidade AS vagaId, Habilidade_idHabilidades AS habilidadeId, importancia, obrigatoria FROM Oportunidades_Habilidades WHERE Oportunidade_idOportunidade IN (' +
      ids.map(() => '?').join(', ') +
      ')',
    ids
  );
  const porVaga = new Map(vagas.map((v) => [v.id, []]));
  rows.forEach((r) => {
    porVaga.get(r.vagaId).push({
      habilidadeId: r.habilidadeId,
      importancia: Number(r.importancia),
      obrigatoria: Boolean(r.obrigatoria)
    });
  });
  // O spread preserva status_moderacao: buscarVagaAprovada depende dele.
  return vagas.map((v) => ({
    ...v,
    salario_max: v.salario_max == null ? null : Number(v.salario_max),
    requisitos: porVaga.get(v.id)
  }));
}

// Vagas ativas e aprovadas de empresas ativas, prontas para o motor.
async function listarVagasAtivas() {
  const vagas = await query(
    SELECT_VAGA + " AND o.status = 'ativo' AND o.status_moderacao = 'aprovada' AND e.status_aprovacao = 'aprovada'"
  );
  return anexarRequisitos(vagas);
}

// Uma vaga (qualquer status) pelo id, pronta para o motor. Devolve null se nao existir.
// A moderacao fica no resultado para o chamador decidir se a vaga e visivel.
async function buscarVaga(id) {
  const vagas = await query(SELECT_VAGA + ' AND o.idOportunidade = ?', [id]);
  const lista = await anexarRequisitos(vagas);
  return lista[0] || null;
}

// Vaga visivel (aprovada, de empresa ativa) pelo id. Devolve null caso contrario.
async function buscarVagaAprovada(id) {
  const vaga = await buscarVaga(id);
  return vaga && vaga.status_moderacao === 'aprovada' && vaga.empresa_status_aprovacao === 'aprovada' ? vaga : null;
}

// Candidata (idProfissionais) no formato do motor. Devolve null se nao existir.
async function carregarCandidata(profId) {
  const [dados, habilidades, areas, prefs] = await Promise.all([
    perfilRepo.dados(profId),
    perfilRepo.habilidades(profId),
    perfilRepo.areas(profId),
    perfilRepo.preferencias(profId)
  ]);
  if (!dados) return null;
  return {
    id: profId,
    nivel: dados.nivel,
    habilidades: habilidades.map((h) => ({ habilidadeId: h.habilidadeId })),
    areas: areas.map((a) => ({ areaId: a.areaId, interesse: a.interesse })),
    preferencias: prefs ? { modalidade: prefs.modalidade, pretensao_min: prefs.pretensao_min } : {}
  };
}

module.exports = { listarVagasAtivas, buscarVaga, buscarVagaAprovada, carregarCandidata };
