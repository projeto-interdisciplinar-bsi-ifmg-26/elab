const { query } = require('../../db/pool');

async function criar({ email, senhaHash, tipo_usuario }) {
  const result = await query(
    'INSERT INTO Usuarios (email, senha, tipo_usuario) VALUES (?, ?, ?)',
    [email, senhaHash, tipo_usuario]
  );
  return { id: result.insertId, email, tipo_usuario };
}

async function buscarPorEmail(email) {
  const rows = await query('SELECT idUsuario as id, email, senha, tipo_usuario FROM Usuarios WHERE email = ?', [email]);
  if (!rows[0]) return null;
  return {
    id: rows[0].id,
    email: rows[0].email,
    senha: rows[0].senha,
    tipo_usuario: rows[0].tipo_usuario
  };
}

async function buscarPorId(id) {
  const rows = await query('SELECT idUsuario as id, email, senha, tipo_usuario FROM Usuarios WHERE idUsuario = ?', [id]);
  if (!rows[0]) return null;
  return {
    id: rows[0].id,
    email: rows[0].email,
    senha: rows[0].senha,
    tipo_usuario: rows[0].tipo_usuario
  };
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

module.exports = { criar, buscarPorEmail, buscarPorId, atualizar };
