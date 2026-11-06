// Experimento: motor de grafos x baselines (Jaccard e cobertura ponderada, ambos sem grafo).
// Somente leitura. Compara apenas o componente de HABILIDADES, que e onde o grafo atua.
// Uso: node scripts/experimento-baseline.js
const { query, closePool } = require('../db/pool');
const { obterContexto } = require('../src/services/grafo.service');
const matchRepo = require('../src/repositories/match.repository');

const EPS = 1e-9;
const media = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const pct = (x) => (100 * x).toFixed(1) + '%';
const f2 = (x) => x.toFixed(2);

const idsDe = (c) => new Set(c.habilidades.map((h) => h.habilidadeId));

const METODOS = {
  grafo: (c, prep, v, motor) => motor.pontuar(prep, v).componentes.habilidades / 100,
  cobertura: (c, prep, v) => {
    const tem = idsDe(c);
    let soma = 0;
    let total = 0;
    for (const r of v.requisitos) {
      const imp = r.importancia || 3;
      total += imp;
      if (tem.has(r.habilidadeId)) soma += imp;
    }
    return total ? soma / total : 0;
  },
  jaccard: (c, prep, v) => {
    const A = idsDe(c);
    const B = new Set(v.requisitos.map((r) => r.habilidadeId));
    let inter = 0;
    for (const x of B) if (A.has(x)) inter++;
    const uniao = A.size + B.size - inter;
    return uniao ? inter / uniao : 0;
  }
};
const NOMES = Object.keys(METODOS);

// Posicao (1 = melhor) com desempate pela media das posicoes empatadas.
function posicao(scores, i) {
  let maior = 0;
  let igual = 0;
  scores.forEach((s, j) => {
    if (j === i) return;
    if (s > scores[i] + EPS) maior++;
    else if (Math.abs(s - scores[i]) <= EPS) igual++;
  });
  return 1 + maior + igual / 2;
}

const topK = (scores, k) =>
  scores
    .map((s, i) => [s, i])
    .sort((a, b) => b[0] - a[0] || a[1] - b[1])
    .slice(0, k)
    .map((x) => x[1]);

const sobreposicao = (a, b) => {
  const B = new Set(b);
  return a.filter((x) => B.has(x)).length / a.length;
};

async function main() {
  const { motor, nomes } = await obterContexto();
  const nome = (id) => nomes.get(id) || '#' + id;

  const vagas = (await matchRepo.listarVagasAtivas()).filter((v) => v.requisitos.length > 0);
  const titulos = new Map(
    (await query("SELECT idOportunidade AS id, titulo FROM Oportunidades WHERE tipo = 'vaga'")).map((r) => [r.id, r.titulo])
  );
  const ids = (await query('SELECT idProfissionais AS id FROM Profissionais ORDER BY idProfissionais')).map((r) => r.id);

  const candidatas = [];
  for (const id of ids) {
    const c = await matchRepo.carregarCandidata(id);
    if (c && c.habilidades.length) candidatas.push(c);
  }
  if (!candidatas.length || !vagas.length) {
    console.log('Sem candidatas com habilidades ou sem vagas ativas. Rode: npm run seed:demo');
    return;
  }

  // ---------- Partes 1 e 2: resgate e divergencia de ranking ----------
  let pares = 0;
  let semBase = 0;
  let resgatados = 0;
  const ganhos = [];
  const exemplos = [];
  const sobGC = [];
  const sobGJ = [];
  const guardaScores = new Map();

  for (const c of candidatas) {
    const prep = motor.prepararCandidata(c);
    const S = {};
    for (const m of NOMES) S[m] = vagas.map((v) => METODOS[m](c, prep, v, motor));
    guardaScores.set(c.id, { prep, S });

    vagas.forEach((v, i) => {
      pares++;
      if (S.cobertura[i] === 0 && S.jaccard[i] === 0) {
        semBase++;
        if (S.grafo[i] > 0) {
          resgatados++;
          ganhos.push(S.grafo[i]);
          exemplos.push({ c, v, i, ganho: S.grafo[i], prep });
        }
      }
    });

    sobGC.push(sobreposicao(topK(S.grafo, 5), topK(S.cobertura, 5)));
    sobGJ.push(sobreposicao(topK(S.grafo, 5), topK(S.jaccard, 5)));
  }

  console.log('=== EXPERIMENTO: grafo x baselines (componente de habilidades) ===');
  console.log('Candidatas: ' + candidatas.length + ' | Vagas ativas com requisitos: ' + vagas.length + ' | Pares: ' + pares);
  console.log('');
  console.log('--- 1) Resgate: pares SEM nenhuma habilidade em comum ---');
  console.log('Pares sem sobreposicao (baselines dao 0): ' + semBase + ' (' + pct(semBase / pares) + ')');
  console.log('  destes, o grafo reconhece alguma afinidade em: ' + resgatados + ' (' + pct(semBase ? resgatados / semBase : 0) + ')');
  console.log('  nota media de habilidades nesses pares (grafo): ' + f2(media(ganhos) * 100) + ' de 100');
  console.log('');
  console.log('Exemplos (maiores afinidades que os baselines nao enxergam):');
  exemplos.sort((a, b) => b.ganho - a.ganho);
  const usados = new Set();
  let mostrados = 0;
  for (const e of exemplos) {
    if (usados.has(e.c.id) || mostrados >= 8) continue;
    const r = motor.pontuar(e.prep, e.v).requisitos.filter((q) => q.similaridade > 0 && q.via != null).sort((a, b) => b.similaridade - a.similaridade)[0];
    if (!r) continue;
    usados.add(e.c.id);
    mostrados++;
    const tem = e.c.habilidades.slice(0, 5).map((h) => nome(h.habilidadeId)).join(', ');
    console.log('  Candidata #' + e.c.id + ' (tem: ' + tem + ')');
    console.log('    x vaga "' + (titulos.get(e.v.id) || '#' + e.v.id) + '": pede ' + nome(r.habilidadeId) + ', afinidade ' + f2(r.similaridade) + ' via ' + nome(r.via));
    console.log('    habilidades: grafo ' + Math.round(e.ganho * 100) + ' | cobertura 0 | jaccard 0');
  }
  console.log('');
  console.log('--- 2) Divergencia de ranking: sobreposicao media do top-5 de vagas por candidata ---');
  console.log('grafo x cobertura: ' + pct(media(sobGC)) + ' | grafo x jaccard: ' + pct(media(sobGJ)));
  console.log('(100% = rankings iguais; quanto menor, mais o grafo muda o resultado)');

  // ---------- Parte 3: habilidade oculta (leave-one-out) ----------
  const res = {};
  for (const m of NOMES) res[m] = { piora: [], retencao: [], top10antes: 0, top10depois: 0 };
  let casos = 0;

  for (const c of candidatas) {
    const { S } = guardaScores.get(c.id);
    const tem = idsDe(c);
    const cache = new Map();
    vagas.forEach((v, i) => {
      const seus = v.requisitos.filter((r) => tem.has(r.habilidadeId)).sort((a, b) => b.importancia - a.importancia);
      if (!seus.length) return;
      const oculto = seus[0].habilidadeId;
      if (!cache.has(oculto)) {
        const c2 = { ...c, habilidades: c.habilidades.filter((h) => h.habilidadeId !== oculto) };
        const prep2 = motor.prepararCandidata(c2);
        const S2 = {};
        for (const m of NOMES) S2[m] = vagas.map((v2) => METODOS[m](c2, prep2, v2, motor));
        cache.set(oculto, S2);
      }
      const S2 = cache.get(oculto);
      casos++;
      for (const m of NOMES) {
        const antes = posicao(S[m], i);
        const depois = posicao(S2[m], i);
        res[m].piora.push(depois - antes);
        res[m].retencao.push(S[m][i] > 0 ? S2[m][i] / S[m][i] : 1);
        if (antes <= 10) {
          res[m].top10antes++;
          if (depois <= 10) res[m].top10depois++;
        }
      }
    });
  }

  console.log('');
  console.log('--- 3) Habilidade oculta: esconde 1 habilidade que a candidata TEM e a vaga pede ---');
  console.log('Casos: ' + casos + ' (uma vaga por caso, ranking entre ' + vagas.length + ' vagas)');
  console.log('metodo     | piora media no ranking | nota retida | continua no top-10');
  for (const m of NOMES) {
    const r = res[m];
    console.log(
      m.padEnd(10) + ' | ' + f2(media(r.piora)).padStart(22) + ' | ' + pct(media(r.retencao)).padStart(11) + ' | ' +
        (r.top10antes ? pct(r.top10depois / r.top10antes) : 'n/a')
    );
  }
  console.log('(piora menor, nota retida maior e top-10 maior = metodo mais robusto a habilidade faltante)');
  console.log('');
  console.log('LIMITES: nao ha gabarito de relevancia no banco. Os resultados dependem da qualidade das arestas');
  console.log('de Habilidades_Relacionadas e do seed:demo. A parte 3 e um proxy de robustez, nao uma prova de acerto.');
}

main()
  .catch((err) => {
    console.error('ERRO', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
