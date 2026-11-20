const { query } = require('../../db/pool');

async function atual(usuarioId) {
  const rows = await query('SELECT foto_arquivo AS arquivo FROM Usuarios WHERE idUsuario = ?', [usuarioId]);
  return rows[0] ? rows[0].arquivo : null;
}

async function salvar(usuarioId, arquivo) {
  await query('UPDATE Usuarios SET foto_arquivo = ? WHERE idUsuario = ?', [arquivo, usuarioId]);
}

async function limpar(usuarioId) {
  await query('UPDATE Usuarios SET foto_arquivo = NULL WHERE idUsuario = ?', [usuarioId]);
}

module.exports = { atual, salvar, limpar };
