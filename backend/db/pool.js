// Pool de conexoes da aplicacao (singleton).
//
// Por que pool: sob carga, abrir uma conexao por request derruba o banco por
// esgotamento de conexoes. O pool reusa um conjunto limitado e enfileira o resto.
//
// Uso nos repositories (sempre parametrizado, nunca concatenando strings):
//   const { query } = require('../../db/pool');
//   const rows = await query('SELECT * FROM Usuarios WHERE email = ?', [email]);

const mysql = require('mysql2/promise');
const { poolConfig } = require('./config');

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool(poolConfig());
  }
  return pool;
}

// Helper de query parametrizada. Usa execute (prepared statement) por padrao,
// o que previne SQL injection e aproveita o cache de statements do servidor.
async function query(sql, params = []) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

// Executa varias operacoes na mesma conexao dentro de uma transacao.
// callback recebe a conexao; faz commit no sucesso e rollback no erro.
async function withTransaction(callback) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const resultado = await callback(conn);
    await conn.commit();
    return resultado;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

module.exports = { getPool, query, withTransaction, closePool };
