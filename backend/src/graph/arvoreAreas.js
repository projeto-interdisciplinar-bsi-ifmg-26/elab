// Arvore de areas de atuacao (TI > Backend > Backend Node.js ...).
// Distancia entre duas areas = arestas ate o ancestral comum mais proximo (LCA).
// Afinidade = base^distancia (mesma area = 1; sem ancestral comum = 0).
class ArvoreAreas {
  // lista: [{ id, paiId }]
  constructor(lista, base = 0.7) {
    this.base = base;
    this.pai = new Map();
    for (const a of lista) this.pai.set(a.id, a.paiId === undefined ? null : a.paiId);
  }

  // [id, pai, avo, ..., raiz]
  ancestrais(id) {
    const c = [];
    const vistos = new Set();
    let x = id;
    while (x !== null && x !== undefined && this.pai.has(x) && !vistos.has(x)) {
      vistos.add(x);
      c.push(x);
      x = this.pai.get(x);
    }
    return c;
  }

  distancia(a, b) {
    const A = this.ancestrais(a);
    const B = this.ancestrais(b);
    if (A.length === 0 || B.length === 0) return Infinity;
    const idxB = new Map(B.map((x, i) => [x, i]));
    for (let i = 0; i < A.length; i++) {
      if (idxB.has(A[i])) return i + idxB.get(A[i]);
    }
    return Infinity;
  }

  afinidade(a, b) {
    const d = this.distancia(a, b);
    return d === Infinity ? 0 : Math.pow(this.base, d);
  }
}

module.exports = { ArvoreAreas };
