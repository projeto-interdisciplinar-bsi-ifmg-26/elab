// Sensibilidade: o ranking de vagas muda quando os pesos mudam um pouco?
// Somente leitura. Uso: node scripts/experimento-sensibilidade.js
const { query, closePool } = require('../db/pool');
const { obterContexto } = require('../src/services/grafo.service');
const matchRepo = require('../src/repositories/match.repository');
const { Grafo } = require('../src/graph/Grafo');
const { criarMotor, PESOS_PADRAO } = require('../src/graph/motorMatch');

const TENTATIVAS = 30;
const K = 5;

// Gerador pseudoaleatorio com semente fixa (mulberry32): mesma saida a cada execucao.
function criarRng(semente) {
  let a = semente | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const media = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const desvio = (a) => {
  const m = media(a);
  return Math.sqrt(media(a.map((x) => (x - m) * (x - m))));
};
const pct = (x) => (100 * x).toFixed(1) + '%';

// Copia o grafo somando +delta ou -delta (sorteado) ao peso de cada aresta, limitado a [0,1; 1].
function perturbarArestas(grafo, delta, rng) {
  const g = new Grafo();
  for (const v of grafo.adj.keys()) g.adicionarVertice(v);
  for (const [a, viz] of grafo.adj) {
    for (const [b, w] of viz) {
      if (a < b) {
        const novo = Number(w) + (rng() < 0.5 ? -delta : delta);
        g.adicionarAresta(a, b, Math.min(1, Math.max(0.1, novo)));
      }
    }
  }
  return g;
}

// Multiplica cada peso do score por um fator sorteado em [1 - f, 1 + f] (o motor normaliza pela soma).
function perturbarPesos(f, rng) {
  const p = {};
  for (const k of Object.keys(PESOS_PADRAO)) p[k] = PESOS_PADRAO[k] * (1 - f + 2 * f * rng());
  return p;
}

function pontuarTodas(motor, candidatas, vagas) {
  return candidatas.map((c) => {
    const prep = motor.prepararCandidata(c);
    return vagas.map((v) => motor.pontuar(prep, v).score);
  });
}

const topK = (scores, k) =>
  scores
    .map((s, i) => [s, i])
    .sort((a, b) => b[0] - a[0] || a[1] - b[1])
    .slice(0, k)
    .map((x) => x[1]);

function comparar(base, outro) {
  let sobre = 0;
  let top1 = 0;
  base.forEach((linha, i) => {
    const a = topK(linha, K);
    const b = new Set(topK(outro[i], K));
    sobre += a.filter((x) => b.has(x)).length / K;
    if (topK(linha, 1)[0] === topK(outro[i], 1)[0]) top1++;
  });
  return { sobre: sobre / base.length, top1: top1 / base.length };
}

const CONFIGS = [
  { nome: 'arestas +-0,05', tipo: 'arestas', valor: 0.05 },
  { nome: 'arestas +-0,10', tipo: 'arestas', valor: 0.1 },
  { nome: 'arestas +-0,20', tipo: 'arestas', valor: 0.2 },
  { nome: 'pesos do score +-20%', tipo: 'pesos', valor: 0.2 }
];

async function main() {
  const { motor, grafo, areas } = await obterContexto();
  const vagas = (await matchRepo.listarVagasAtivas()).filter((v) => v.requisitos.length > 0);
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

  const base = pontuarTodas(motor, candidatas, vagas);
  console.log('=== SENSIBILIDADE: ranking de vagas (nota final) sob perturbacao dos pesos ===');
  console.log('Candidatas: ' + candidatas.length + ' | Vagas: ' + vagas.length + ' | Tentativas por configuracao: ' + TENTATIVAS + ' | Semente fixa');
  console.log('Referencia: sobreposicao esperada do top-' + K + ' ao acaso = ' + pct(K / vagas.length));
  console.log('');
  console.log('configuracao           | top-' + K + ' medio (dp)  | pior tentativa | top-1 igual (medio)');

  CONFIGS.forEach((cfg, ci) => {
    const sobre = [];
    const top1 = [];
    for (let t = 0; t < TENTATIVAS; t++) {
      const rng = criarRng(1000 * (ci + 1) + t);
      const m =
        cfg.tipo === 'arestas'
          ? criarMotor({ grafoHabilidades: perturbarArestas(grafo, cfg.valor, rng), areas })
          : criarMotor({ grafoHabilidades: grafo, areas, pesos: perturbarPesos(cfg.valor, rng) });
      const r = comparar(base, pontuarTodas(m, candidatas, vagas));
      sobre.push(r.sobre);
      top1.push(r.top1);
    }
    console.log(
      cfg.nome.padEnd(22) + ' | ' + (pct(media(sobre)) + ' (' + (100 * desvio(sobre)).toFixed(1) + ')').padEnd(14) +
        ' | ' + pct(Math.min(...sobre)).padStart(14) + ' | ' + pct(media(top1))
    );
  });

  console.log('');
  console.log('Leitura: 100% = ranking identico ao original. dp = desvio padrao entre as tentativas.');
  console.log('LIMITES: dados sinteticos; mede estabilidade do ranking, nao acerto; empates do score inteiro sao desempatados pelo indice.');
}

main()
  .catch((err) => {
    console.error('ERRO', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
