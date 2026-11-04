const { dijkstra, caminho } = require('./dijkstra');
const { ArvoreAreas } = require('./arvoreAreas');
const { emparelhamentoOtimo } = require('./hungaro');

// Pesos do score final (somam 1). Ajustaveis em criarMotor({ pesos }).
const PESOS_PADRAO = { habilidades: 0.55, area: 0.2, nivel: 0.15, preferencias: 0.1 };
const SIM_MINIMA = 0.25; // similaridade abaixo disso e tratada como 0
const PENALIDADE_OBRIGATORIA = 0.7; // se faltar habilidade obrigatoria
const NIVEIS = ['estagio', 'junior', 'pleno', 'senior', 'especialista'];

const arred2 = (x) => Math.round(x * 100) / 100;

// Formatos de entrada:
//  candidata: { id, nivel, habilidades:[{habilidadeId}], areas:[{areaId, interesse}],
//               preferencias:{ modalidade, pretensao_min } }
//  vaga:      { id, areaId, nivel, modalidade, salario_max,
//               requisitos:[{habilidadeId, importancia, obrigatoria}] }
// DECIMAL do MySQL chega como string: por isso Number() nos valores monetarios.
function criarMotor({ grafoHabilidades, areas = [], pesos = {} }) {
  const P = { ...PESOS_PADRAO, ...pesos };
  const arvore = new ArvoreAreas(areas);
  const custoMax = -Math.log(SIM_MINIMA);

  // Um unico Dijkstra multi-origem por candidata serve para TODAS as vagas.
  function prepararCandidata(candidata) {
    const origens = (candidata.habilidades || []).map((h) => h.habilidadeId);
    const { dist, pred } = dijkstra(grafoHabilidades, origens, { custoMax });
    return { candidata, origens: new Set(origens), dist, pred };
  }

  function similaridade(prep, id) {
    if (prep.origens.has(id)) return 1;
    const d = prep.dist.get(id);
    return d === undefined ? 0 : Math.exp(-d);
  }

  function scoreHabilidades(prep, vaga) {
    const reqs = vaga.requisitos || [];
    if (reqs.length === 0) return { valor: 0.5, requisitos: [], faltantes: [], eliminatorias: [] };

    let soma = 0;
    let total = 0;
    const detalhe = [];
    const faltantes = [];
    const eliminatorias = [];

    for (const r of reqs) {
      const imp = r.importancia || 3;
      const s = similaridade(prep, r.habilidadeId);
      soma += imp * s;
      total += imp;
      const cam = s > 0 && s < 1 ? caminho(prep.pred, r.habilidadeId) : [];
      detalhe.push({
        habilidadeId: r.habilidadeId,
        similaridade: arred2(s),
        via: s === 1 ? r.habilidadeId : cam.length ? cam[0] : null,
        obrigatoria: !!r.obrigatoria
      });
      if (s < 1) faltantes.push(r.habilidadeId);
      if (r.obrigatoria && s < 0.5) eliminatorias.push(r.habilidadeId);
    }
    return { valor: soma / total, requisitos: detalhe, faltantes, eliminatorias };
  }

  function scoreArea(prep, vaga) {
    if (!vaga.areaId) return 0.5;
    const as = prep.candidata.areas || [];
    if (as.length === 0) return 0.4;
    let melhor = 0;
    for (const a of as) {
      const v = arvore.afinidade(a.areaId, vaga.areaId) * (0.6 + (0.4 * (a.interesse || 3)) / 5);
      if (v > melhor) melhor = v;
    }
    return melhor;
  }

  function scoreNivel(c, v) {
    if (!v.nivel || v.nivel === 'qualquer') return 1;
    if (!c.nivel) return 0.6;
    const d = NIVEIS.indexOf(c.nivel) - NIVEIS.indexOf(v.nivel);
    if (d === 0) return 1;
    if (d > 0) return Math.max(0.5, 1 - 0.15 * d);
    return Math.max(0, 1 - 0.4 * -d);
  }

  function scorePreferencias(c, v) {
    const p = c.preferencias;
    if (!p) return 1;
    let m = 1;
    if (v.modalidade && p.modalidade && p.modalidade !== 'indiferente' && p.modalidade !== v.modalidade) {
      m = p.modalidade === 'hibrido' || v.modalidade === 'hibrido' ? 0.5 : 0;
    }
    let s = 1;
    const pretensao = Number(p.pretensao_min);
    const salarioMax = Number(v.salario_max);
    if (pretensao > 0 && salarioMax > 0) s = Math.min(1, salarioMax / pretensao);
    return (m + s) / 2;
  }

  function pontuar(prep, vaga) {
    const hab = scoreHabilidades(prep, vaga);
    const area = scoreArea(prep, vaga);
    const nivel = scoreNivel(prep.candidata, vaga);
    const pref = scorePreferencias(prep.candidata, vaga);

    const somaPesos = P.habilidades + P.area + P.nivel + P.preferencias;
    let final = (P.habilidades * hab.valor + P.area * area + P.nivel * nivel + P.preferencias * pref) / somaPesos;
    if (hab.eliminatorias.length > 0) final *= PENALIDADE_OBRIGATORIA;

    return {
      score: Math.round(final * 100),
      componentes: {
        habilidades: Math.round(hab.valor * 100),
        area: Math.round(area * 100),
        nivel: Math.round(nivel * 100),
        preferencias: Math.round(pref * 100)
      },
      requisitos: hab.requisitos,
      faltantes: hab.faltantes,
      eliminatorias: hab.eliminatorias
    };
  }

  // Trilha de aprendizado: caminho minimo no grafo, das habilidades que ela ja tem
  // ate cada habilidade que a vaga pede e que ainda nao domina.
  function trilha(prep, vaga, { limite = 5 } = {}) {
    const itens = [];
    for (const r of vaga.requisitos || []) {
      const s = similaridade(prep, r.habilidadeId);
      if (s >= 1) continue;
      const alcancavel = prep.dist.has(r.habilidadeId);
      itens.push({
        alvo: r.habilidadeId,
        importancia: r.importancia || 3,
        similaridade: arred2(s),
        alcancavel,
        caminho: alcancavel ? caminho(prep.pred, r.habilidadeId) : [r.habilidadeId]
      });
    }
    itens.sort((a, b) => b.importancia - a.importancia || b.similaridade - a.similaridade);
    return itens.slice(0, limite);
  }

  function ranquear(prep, vagas) {
    return vagas
      .map((v) => ({ vagaId: v.id, ...pontuar(prep, v) }))
      .sort((a, b) => b.score - a.score);
  }

  // Melhor alocacao GLOBAL (cada candidata em no maximo 1 vaga e vice-versa)
  // via emparelhamento de peso maximo no grafo bipartido (algoritmo hungaro).
  function alocacaoOtima(candidatas, vagas, { minimo = 40 } = {}) {
    const preps = candidatas.map(prepararCandidata);
    const matriz = preps.map((p) => vagas.map((v) => pontuar(p, v).score));
    const r = emparelhamentoOtimo(matriz, minimo);
    return {
      pares: r.pares.map((x) => ({
        candidataId: candidatas[x.linha].id,
        vagaId: vagas[x.coluna].id,
        score: x.score
      })),
      total: r.total
    };
  }

  return { prepararCandidata, pontuar, trilha, ranquear, alocacaoOtima, arvore };
}

module.exports = { criarMotor, PESOS_PADRAO };
