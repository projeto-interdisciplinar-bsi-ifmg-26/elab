const { query } = require('../../db/pool');

async function atual(profId) {
  const rows = await query(
    'SELECT curriculo_arquivo AS arquivo, curriculo_nome_original AS nome FROM Profissionais WHERE idProfissionais = ?',
    [profId]
  );
  return rows[0] && rows[0].arquivo ? rows[0] : null;
}

async function salvar(profId, arquivo, nome) {
  await query(
    'UPDATE Profissionais SET curriculo_arquivo = ?, curriculo_nome_original = ?, curriculo_atualizado_em = NOW() WHERE idProfissionais = ?',
    [arquivo, nome, profId]
  );
}

async function limpar(profId) {
  await query(
    'UPDATE Profissionais SET curriculo_arquivo = NULL, curriculo_nome_original = NULL, curriculo_atualizado_em = NULL WHERE idProfissionais = ?',
    [profId]
  );
}

module.exports = { atual, salvar, limpar };
