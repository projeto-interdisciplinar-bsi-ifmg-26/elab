const { query, withTransaction } = require('../../db/pool');

async function atual(usuarioId) {
  const rows = await query('SELECT foto_arquivo AS arquivo FROM Usuarios WHERE idUsuario = ?', [usuarioId]);
  return rows[0] ? rows[0].arquivo : null;
}

// Troca a foto sob a trava da linha e devolve o arquivo anterior. Dois envios
// simultaneos serializam aqui: cada um apaga o que efetivamente substituiu, entao
// o arquivo do envio vencido nao fica orfao servido em /media.
async function trocar(usuarioId, arquivo) {
  return withTransaction(async (conn) => {
    const [rows] = await conn.execute('SELECT foto_arquivo AS arquivo FROM Usuarios WHERE idUsuario = ? FOR UPDATE', [usuarioId]);
    const anterior = rows[0] ? rows[0].arquivo : null;
    await conn.execute('UPDATE Usuarios SET foto_arquivo = ? WHERE idUsuario = ?', [arquivo, usuarioId]);
    return anterior;
  });
}

// Zera a foto sob a trava e devolve o arquivo removido (null se nao havia foto).
async function limpar(usuarioId) {
  return withTransaction(async (conn) => {
    const [rows] = await conn.execute('SELECT foto_arquivo AS arquivo FROM Usuarios WHERE idUsuario = ? FOR UPDATE', [usuarioId]);
    const anterior = rows[0] ? rows[0].arquivo : null;
    if (!anterior) return null;
    await conn.execute('UPDATE Usuarios SET foto_arquivo = NULL WHERE idUsuario = ?', [usuarioId]);
    return anterior;
  });
}

module.exports = { atual, trocar, limpar };
