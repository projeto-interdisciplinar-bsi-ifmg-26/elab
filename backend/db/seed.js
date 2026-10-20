const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { migrationConfig } = require('./config');

const MOCK_DATA_FILE = path.join(__dirname, 'mock_data.sql');

async function seed() {
  const conn = await mysql.createConnection(migrationConfig());

  try {
    const sql = fs.readFileSync(MOCK_DATA_FILE, 'utf8');
    console.log('Aplicando dados mockados...');

    // O mock_data.sql pode conter múltiplos statements,
    // por isso usamos migrationConfig que permite multipleStatements: true
    await conn.query(sql);

    console.log('✅ Dados mockados inseridos com sucesso!');
  } catch (err) {
    console.error('❌ Erro ao inserir dados mockados:', err.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

seed();
