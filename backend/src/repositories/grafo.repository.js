const { query } = require('../../db/pool');

// Arestas do grafo de habilidades: [habilidadeA, habilidadeB, peso 0..1].
// O DECIMAL do MySQL chega como string, entao converto para Number aqui.
async function listarArestasHabilidades() {
  const rows = await query('SELECT Habilidade_A AS a, Habilidade_B AS b, peso FROM Habilidades_Relacionadas');
  return rows.map((r) => [r.a, r.b, Number(r.peso)]);
}

module.exports = { listarArestasHabilidades };
