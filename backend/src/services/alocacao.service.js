const ApiError = require('../utils/ApiError');
const { obterContexto } = require('./grafo.service');
const { emparelhamentoOtimo } = require('../graph/hungaro');
const candidatosRepo = require('../repositories/candidatos.repository');
const matchRepo = require('../repositories/match.repository');
const alocacaoRepo = require('../repositories/alocacao.repository');

const SCORE_MINIMO = 40;

// Melhor alocacao global (hungaro) entre as candidatas inscritas e as vagas ativas da empresa logada.
// Cada candidata fica em no maximo 1 vaga e cada vaga recebe no maximo 1 candidata.
async function alocarMelhor(usuarioId) {
  const empresaId = await candidatosRepo.idEmpresaPorUsuario(usuarioId);
  if (!empresaId) throw new ApiError(403, 'Acesso não permitido para este perfil');

  const vagaIds = await alocacaoRepo.idsVagasAtivasDaEmpresa(empresaId);
  const inscricoes = await alocacaoRepo.inscricoesDasVagas(vagaIds);
  if (inscricoes.length === 0) return { pares: [], total: 0, minimo: SCORE_MINIMO };

  const doGrupo = new Set(vagaIds);
  const vagas = (await matchRepo.listarVagasAtivas()).filter((v) => doGrupo.has(v.id));
  const nomes = new Map(inscricoes.map((i) => [i.profissionalId, i.nome]));
  const profIds = [...nomes.keys()];
  const inscrito = new Set(inscricoes.map((i) => i.profissionalId + ':' + i.vagaId));

  const { motor } = await obterContexto();
  const matriz = [];
  for (const profId of profIds) {
    const candidata = await matchRepo.carregarCandidata(profId);
    const prep = motor.prepararCandidata(candidata);
    matriz.push(vagas.map((v) => (inscrito.has(profId + ':' + v.id) ? motor.pontuar(prep, v).score : 0)));
  }

  const r = emparelhamentoOtimo(matriz, SCORE_MINIMO);
  return {
    pares: r.pares.map((p) => ({
      vagaId: vagas[p.coluna].id,
      profissionalId: profIds[p.linha],
      nome: nomes.get(profIds[p.linha]),
      score: p.score
    })),
    total: r.total,
    minimo: SCORE_MINIMO
  };
}

module.exports = { alocarMelhor };
