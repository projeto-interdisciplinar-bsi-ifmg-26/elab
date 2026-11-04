const { query } = require('../../db/pool');

async function listarHabilidades() {
  return query(
    'SELECT idHabilidades AS id, nome_habilidade AS nome, categoria FROM Habilidades ORDER BY categoria, nome_habilidade'
  );
}

async function listarAreas() {
  return query('SELECT idArea AS id, nome, slug, Area_Pai_idArea AS paiId FROM Areas_Atuacao ORDER BY nome');
}

// Le os valores de um ENUM direto do schema, assim o front acompanha as migrations.
async function listarEnum(tabela, coluna) {
  const rows = await query(
    'SELECT COLUMN_TYPE AS tipo FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    [tabela, coluna]
  );
  if (!rows[0]) return [];
  return [...rows[0].tipo.matchAll(/'((?:[^']|'')*)'/g)].map((m) => m[1].replace(/''/g, "'"));
}

module.exports = { listarHabilidades, listarAreas, listarEnum };
