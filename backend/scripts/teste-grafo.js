// Testes do motor de grafos. Nao usa banco nem servidor: node scripts/teste-grafo.js
const assert = require('node:assert/strict');
const { MinHeap } = require('../src/graph/MinHeap');
const { Grafo } = require('../src/graph/Grafo');
const { dijkstra, caminho } = require('../src/graph/dijkstra');
const { ArvoreAreas } = require('../src/graph/arvoreAreas');
const { emparelhamentoOtimo } = require('../src/graph/hungaro');
const { criarMotor } = require('../src/graph/motorMatch');

let falhas = 0;
function t(nome, fn) {
  try {
    fn();
    console.log('OK     ' + nome);
  } catch (e) {
    falhas++;
    console.log('FALHOU ' + nome + ' -> ' + e.message);
  }
}

// PRNG deterministico (mulberry32)
function prng(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t0 = Math.imul(a ^ (a >>> 15), 1 | a);
    t0 = (t0 + Math.imul(t0 ^ (t0 >>> 7), 61 | t0)) ^ t0;
    return ((t0 ^ (t0 >>> 14)) >>> 0) / 4294967296;
  };
}

t('MinHeap devolve em ordem crescente', () => {
  const rnd = prng(1);
  const h = new MinHeap();
  const nums = Array.from({ length: 200 }, () => Math.floor(rnd() * 1000));
  nums.forEach((n) => h.push(n, n));
  const saida = [];
  while (h.tamanho) saida.push(h.pop()[0]);
  assert.deepEqual(saida, [...nums].sort((a, b) => a - b));
  assert.equal(h.pop(), null);
});

t('Grafo: ordem, tamanho e simetria', () => {
  const g = Grafo.deArestas([[1, 2, 0.5], [2, 3, 0.5]]);
  assert.equal(g.ordem, 3);
  assert.equal(g.tamanho, 2);
  assert.equal(g.vizinhos(2).get(1), 0.5);
  assert.equal(g.vizinhos(1).get(2), 0.5);
  assert.equal(g.vizinhos(99).size, 0);
});

t('Dijkstra escolhe o caminho de maior produto de pesos', () => {
  const g = Grafo.deArestas([['a', 'b', 0.5], ['b', 'c', 0.5], ['a', 'c', 0.2]]);
  const { dist, pred } = dijkstra(g, ['a']);
  assert.ok(Math.abs(Math.exp(-dist.get('c')) - 0.25) < 1e-9);
  assert.deepEqual(caminho(pred, 'c'), ['a', 'b', 'c']);
  assert.deepEqual(caminho(pred, 'zzz'), []);
});

t('Dijkstra multi-origem e poda por custoMax', () => {
  const g = Grafo.deArestas([[1, 2, 0.9], [2, 3, 0.9], [3, 4, 0.9], [10, 11, 0.9]]);
  const { dist } = dijkstra(g, [1, 10], { custoMax: -Math.log(0.85) });
  assert.equal(dist.get(1), 0);
  assert.equal(dist.get(10), 0);
  assert.ok(dist.has(2) && dist.has(11));
  assert.ok(!dist.has(3));
});

const areas = [
  { id: 1, paiId: null }, { id: 2, paiId: 1 }, { id: 3, paiId: 1 },
  { id: 4, paiId: 2 }, { id: 5, paiId: 2 }
];

t('ArvoreAreas: distancia e afinidade pelo ancestral comum', () => {
  const a = new ArvoreAreas(areas);
  assert.equal(a.distancia(4, 4), 0);
  assert.equal(a.distancia(4, 2), 1);
  assert.equal(a.distancia(4, 5), 2);
  assert.equal(a.distancia(4, 3), 3);
  assert.equal(a.afinidade(4, 4), 1);
  assert.ok(Math.abs(a.afinidade(4, 5) - 0.49) < 1e-9);
  assert.equal(a.afinidade(4, 999), 0);
});

function melhorForca(M) {
  const n = M.length;
  const m = M[0].length;
  let melhor = -Infinity;
  const usado = new Array(m).fill(false);
  (function rec(i, soma) {
    if (i === n) { melhor = Math.max(melhor, soma); return; }
    for (let j = 0; j < m; j++) {
      if (usado[j]) continue;
      usado[j] = true;
      rec(i + 1, soma + M[i][j]);
      usado[j] = false;
    }
  })(0, 0);
  return melhor;
}

t('Hungaro iguala a forca bruta em 200 matrizes aleatorias (retangulares)', () => {
  const rnd = prng(42);
  for (let k = 0; k < 200; k++) {
    const n = 1 + Math.floor(rnd() * 6);
    const m = 1 + Math.floor(rnd() * 6);
    const M = Array.from({ length: n }, () => Array.from({ length: m }, () => Math.floor(rnd() * 101)));
    const r = emparelhamentoOtimo(M);
    const base = n > m ? M[0].map((_, j) => M.map((l) => l[j])) : M;
    assert.equal(r.total, melhorForca(base), 'matriz ' + n + 'x' + m + ' #' + k);
    assert.equal(r.pares.length, Math.min(n, m));
    assert.equal(new Set(r.pares.map((p) => p.linha)).size, r.pares.length);
    assert.equal(new Set(r.pares.map((p) => p.coluna)).size, r.pares.length);
  }
});

t('Hungaro descarta pares abaixo do minimo', () => {
  const r = emparelhamentoOtimo([[90, 10], [10, 20]], 50);
  assert.equal(r.pares.length, 1);
  assert.equal(r.pares[0].score, 90);
});

// Grafo de habilidades: 1 js, 2 ts, 3 react, 4 nextjs, 5 python (isolada)
const g = Grafo.deArestas([[1, 2, 0.9], [1, 3, 0.7], [3, 4, 0.9]]);
g.adicionarVertice(5);
const motor = criarMotor({ grafoHabilidades: g, areas });
const base = { areaId: 4, nivel: 'junior', modalidade: 'remoto', salario_max: 5000 };
const req = (id, imp = 5) => [{ habilidadeId: id, importancia: imp, obrigatoria: true }];
const v1 = { id: 10, ...base, requisitos: req(3) };
const v2 = { id: 11, ...base, requisitos: req(4) };
const v3 = { id: 12, ...base, requisitos: req(5) };
const cand = {
  id: 1, nivel: 'junior', habilidades: [{ habilidadeId: 3 }],
  areas: [{ areaId: 4, interesse: 5 }], preferencias: { modalidade: 'remoto', pretensao_min: '3000.00' }
};

t('Motor: match perfeito = 100', () => {
  const r = motor.pontuar(motor.prepararCandidata(cand), v1);
  assert.equal(r.score, 100);
  assert.deepEqual(r.eliminatorias, []);
});

t('Motor: credito parcial pela distancia no grafo (react -> nextjs = 0.9)', () => {
  const r = motor.pontuar(motor.prepararCandidata(cand), v2);
  assert.equal(r.componentes.habilidades, 90);
  assert.ok(r.score >= 94 && r.score <= 95, 'score ' + r.score);
  assert.equal(r.requisitos[0].via, 3);
});

t('Motor: habilidade obrigatoria ausente penaliza e vira eliminatoria', () => {
  const r = motor.pontuar(motor.prepararCandidata(cand), v3);
  assert.equal(r.componentes.habilidades, 0);
  assert.deepEqual(r.eliminatorias, [5]);
  assert.ok(r.score >= 31 && r.score <= 32, 'score ' + r.score);
});

t('Motor: ranquear ordena por score', () => {
  const r = motor.ranquear(motor.prepararCandidata(cand), [v3, v1, v2]);
  assert.deepEqual(r.map((x) => x.vagaId), [10, 11, 12]);
});

t('Motor: trilha de aprendizado usa o caminho minimo', () => {
  const vaga = { id: 20, requisitos: [{ habilidadeId: 2, importancia: 4 }, { habilidadeId: 5, importancia: 2 }] };
  const tr = motor.trilha(motor.prepararCandidata(cand), vaga);
  assert.deepEqual(tr[0].caminho, [3, 1, 2]);
  assert.equal(tr[0].alcancavel, true);
  assert.deepEqual(tr[1].caminho, [5]);
  assert.equal(tr[1].alcancavel, false);
});

t('Motor: alocacao otima global (hungaro)', () => {
  const cand2 = { ...cand, id: 2, habilidades: [{ habilidadeId: 5 }] };
  const r = motor.alocacaoOtima([cand, cand2], [v1, v3]);
  const mapa = Object.fromEntries(r.pares.map((p) => [p.candidataId, p.vagaId]));
  assert.deepEqual(mapa, { 1: 10, 2: 12 });
  assert.equal(r.total, 200);
});

console.log(falhas ? falhas + ' falha(s)' : 'TUDO OK');
process.exit(falhas ? 1 : 0);
