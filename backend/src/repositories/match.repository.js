const { query } = require('../../db/pool');
const perfilRepo = require('./perfilCompleto.repository');

const SELECT_VAGA =
  "SELECT idOportunidade AS id, Area_idArea AS areaId, nivel, modalidade, salario_max FROM Oportunidades WHERE tipo = 'vaga'";

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
  return vagas.map((v) => ({
    id: v.id,
    areaId: v.areaId,
    nivel: v.nivel,
    modalidade: v.modalidade,
    salario_max: v.salario_max == null ? null : Number(v.salario_max),
    requisitos: porVaga.get(v.id)
  }));
}

// Vagas ativas, prontas para o motor.
async function listarVagasAtivas() {
  const vagas = await query(SELECT_VAGA + " AND status = 'ativo'");
  return anexarRequisitos(vagas);
}

// Uma vaga (qualquer status) pelo id, pronta para o motor. Devolve null se nao existir.
async function buscarVaga(id) {
  const vagas = await query(SELECT_VAGA + ' AND idOportunidade = ?', [id]);
  const lista = await anexarRequisitos(vagas);
  return lista[0] || null;
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

module.exports = { listarVagasAtivas, buscarVaga, carregarCandidata };
