const { MinHeap } = require('./MinHeap');

// Peso (similaridade) -> custo aditivo. O caminho de menor custo e o de MAIOR produto
// de pesos: custo = -ln(peso). Como peso <= 1, o custo nunca e negativo (Dijkstra valido).
const custoAresta = (peso) => Math.max(0, -Math.log(peso));

// Dijkstra multi-origem com min-heap: O((V + E) log V).
// origens: array de vertices com distancia 0. custoMax: poda vertices alem desse custo.
function dijkstra(grafo, origens, { custoMax = Infinity } = {}) {
  const dist = new Map();
  const pred = new Map();
  const fechado = new Set();
  const heap = new MinHeap();

  for (const o of origens) {
    dist.set(o, 0);
    pred.set(o, null);
    heap.push(0, o);
  }

  while (heap.tamanho > 0) {
    const [d, u] = heap.pop();
    if (fechado.has(u)) continue;
    fechado.add(u);

    for (const [v, peso] of grafo.vizinhos(u)) {
      if (fechado.has(v)) continue;
      const nd = d + custoAresta(peso);
      if (nd > custoMax + 1e-12) continue;
      if (!dist.has(v) || nd < dist.get(v)) {
        dist.set(v, nd);
        pred.set(v, u);
        heap.push(nd, v);
      }
    }
  }

  return { dist, pred };
}

// Reconstroi o caminho origem -> destino a partir dos predecessores.
function caminho(pred, destino) {
  if (!pred.has(destino)) return [];
  const c = [];
  let x = destino;
  while (x !== null && x !== undefined) {
    c.push(x);
    x = pred.get(x);
  }
  return c.reverse();
}

module.exports = { dijkstra, caminho, custoAresta };
