const mysql = require('mysql2/promise');
const { dbHost, dbUser, dbPass, dbName } = require('../config/env');

let pool = null;

async function getDb() {
  if (pool) return pool;

  try {
    pool = mysql.createPool({
      host: dbHost || 'localhost',
      user: dbUser || 'root',
      password: dbPass || '',
      database: dbName || 'elabproj',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // Testar conexão
    const connection = await pool.getConnection();
    connection.release();
    console.log('✅ Conectado ao MySQL com sucesso.');
    return pool;
  } catch (error) {
    console.error('⚠️ Falha ao conectar ao MySQL. Usando modo MOCK/MEMÓRIA.');
    console.error('Erro:', error.message);
    pool = null; // Mantém null para que os repositórios saibam que devem usar mocks
    return null;
  }
}

module.exports = { getDb };
