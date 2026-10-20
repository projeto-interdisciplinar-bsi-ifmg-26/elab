const bcrypt = require('bcryptjs');
const { nodeEnv } = require('../config/env');
const { getDb } = require('../config/db');

// Memória para fallback caso o banco não esteja disponível
const usuariosMock = [];
let proximoIdMock = 1;

async function criar({ email, senhaHash, tipo_usuario }) {
  const db = await getDb();

  if (db) {
    const [result] = await db.execute(
      'INSERT INTO Usuarios (email, senha, tipo_usuario) VALUES (?, ?, ?)',
      [email, senhaHash, tipo_usuario]
    );
    return { idUsuario: result.insertId, email, tipo_usuario };
  }

  // Fallback Mock
  const usuario = { idUsuario: proximoIdMock++, email, senha: senhaHash, tipo_usuario };
  usuariosMock.push(usuario);
  return usuario;
}

async function buscarPorEmail(email) {
  const db = await getDb();

  if (db) {
    const [rows] = await db.execute('SELECT * FROM Usuarios WHERE email = ?', [email]);
    return rows[0] || null;
  }

  return usuariosMock.find(u => u.email === email) || null;
}

async function buscarPorId(id) {
  const db = await getDb();

  if (db) {
    const [rows] = await db.execute('SELECT * FROM Usuarios WHERE idUsuario = ?', [id]);
    return rows[0] || null;
  }

  return usuariosMock.find(u => u.idUsuario === id) || null;
}

async function atualizar(id, campos) {
  const db = await getDb();

  if (db) {
    const keys = Object.keys(campos);
    const values = Object.values(campos);
    const setClause = keys.map(key => `${key} = ?`).join(', ');

    await db.execute(
      `UPDATE Usuarios SET ${setClause} WHERE idUsuario = ?`,
      [...values, id]
    );
    return await buscarPorId(id);
  }

  const usuario = usuariosMock.find(u => u.idUsuario === id);
  if (!usuario) return null;
  Object.assign(usuario, campos);
  return usuario;
}

if (nodeEnv !== 'production') {
  const hash = bcrypt.hashSync('senha12345', 10);
  // Popular mock apenas para garantir que o app funcione sem DB
  usuariosMock.push(
    { idUsuario: proximoIdMock++, email: 'empresa@elab.com', senha: hash, tipo_usuario: 'entidade_parceira' },
    { idUsuario: proximoIdMock++, email: 'colab@elab.com', senha: hash, tipo_usuario: 'profissional' }
  );
}

module.exports = { criar, buscarPorEmail, buscarPorId, atualizar };
