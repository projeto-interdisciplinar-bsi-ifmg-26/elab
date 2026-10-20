const { query } = require('../../db/pool');

async function criar({ email, senhaHash, tipo_usuario }) {
  const result = await query(
    'INSERT INTO Usuarios (email, senha, tipo_usuario) VALUES (?, ?, ?)',
    [email, senhaHash, tipo_usuario]
  );
  return { idUsuario: result.insertId, email, tipo_usuario };
}

async function buscarPorEmail(email) {
  const rows = await query('SELECT * FROM Usuarios WHERE email = ?', [email]);
  return rows[0] || null;
}

async function buscarPorId(id) {
  const rows = await query('SELECT * FROM Usuarios WHERE idUsuario = ?', [id]);
  return rows[0] || null;
}

async function atualizar(id, campos) {
  const keys = Object.keys(campos);
  const values = Object.values(campos);
  const setClause = keys.map(key => `${key} = ?`).join(', ');

  await query(
    `UPDATE Usuarios SET ${setClause} WHERE idUsuario = ?`,
    [...values, id]
  );
  return await buscarPorId(id);
}

module.exports = { criar, buscarPorEmail, buscarPorId, atualizar };
