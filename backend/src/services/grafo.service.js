const { Grafo } = require('../graph/Grafo');
const { criarMotor } = require('../graph/motorMatch');
const grafoRepo = require('../repositories/grafo.repository');
const catalogoRepo = require('../repositories/catalogo.repository');

// Cache em memoria. Guarda a Promise para que requests simultaneos
// nao carreguem o grafo duas vezes.
let cache = null;

async function carregar() {
  const [habilidades, arestas, areas] = await Promise.all([
    catalogoRepo.listarHabilidades(),
    grafoRepo.listarArestasHabilidades(),
    catalogoRepo.listarAreas()
  ]);
  const grafo = Grafo.deArestas(arestas);
  // Habilidades sem nenhuma aresta tambem precisam existir como vertice.
  habilidades.forEach((h) => grafo.adicionarVertice(h.id));
  const nomes = new Map(habilidades.map((h) => [h.id, h.nome]));
  const motor = criarMotor({ grafoHabilidades: grafo, areas });
  return { motor, grafo, nomes, areas };
}

// Devolve { motor, grafo, nomes, areas }. Carrega do banco na primeira chamada.
function obterContexto() {
  if (!cache) {
    cache = carregar().catch((erro) => {
      cache = null;
      throw erro;
    });
  }
  return cache;
}

// Chame depois de alterar habilidades, arestas ou areas para recarregar no proximo uso.
function invalidarCache() {
  cache = null;
}

module.exports = { obterContexto, invalidarCache };
