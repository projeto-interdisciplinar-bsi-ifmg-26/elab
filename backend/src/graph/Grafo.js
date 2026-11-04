// Grafo nao direcionado e ponderado (lista de adjacencia).
// Vertice: qualquer valor usavel como chave de Map (aqui, ids numericos).
// Peso: similaridade em (0, 1].
class Grafo {
  constructor() {
    this.adj = new Map();
  }

  adicionarVertice(v) {
    if (!this.adj.has(v)) this.adj.set(v, new Map());
  }

  adicionarAresta(a, b, peso) {
    if (a === b) return;
    this.adicionarVertice(a);
    this.adicionarVertice(b);
    this.adj.get(a).set(b, peso);
    this.adj.get(b).set(a, peso);
  }

  vizinhos(v) {
    return this.adj.get(v) || new Map();
  }

  get ordem() {
    return this.adj.size;
  }

  get tamanho() {
    let soma = 0;
    for (const m of this.adj.values()) soma += m.size;
    return soma / 2;
  }

  static deArestas(arestas) {
    const g = new Grafo();
    for (const [a, b, peso] of arestas) g.adicionarAresta(a, b, peso);
    return g;
  }
}

module.exports = { Grafo };
