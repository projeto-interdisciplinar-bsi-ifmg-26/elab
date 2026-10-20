// Runner de migrations MySQL, pensado para deploy com multiplas instancias.
//
// Garantias de escalabilidade/seguranca:
//  - LOCK DISTRIBUIDO (GET_LOCK): se duas instancias subirem e rodarem migrate
//    ao mesmo tempo, apenas uma aplica; a outra espera e encontra tudo aplicado.
//  - IDEMPOTENCIA: so aplica o que falta, controlado por `schema_migrations`.
//  - CHECKSUM: detecta se uma migration ja aplicada foi alterada depois
//    (divergencia entre ambientes), e aborta em vez de rodar algo inconsistente.
//  - PREPARED STATEMENTS no controle de versao (placeholders ?).
//  - DDL estatico do projeto (sem entrada de usuario). multipleStatements fica
//    restrito a este runner via db/config.js (migrationConfig).
//
// Observacao sobre DDL no MySQL: comandos DDL fazem commit implicito, entao a
// transacao nao desfaz um CREATE TABLE ja executado. Por isso a convencao do
// projeto e: uma operacao logica por arquivo, para o replay ser previsivel.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mysql = require('mysql2/promise');
const { migrationConfig } = require('./config');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const LOCK_NAME = 'elab_schema_migration_lock';
const LOCK_TIMEOUT_SECONDS = 60;

async function ensureControlTable(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`schema_migrations\` (
      \`nome\`        VARCHAR(255) NOT NULL,
      \`checksum\`    CHAR(64) NOT NULL,
      \`aplicada_em\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`nome\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

async function getApplied(conn) {
  const [rows] = await conn.query('SELECT `nome`, `checksum` FROM `schema_migrations`');
  const map = new Map();
  for (const r of rows) map.set(r.nome, r.checksum);
  return map;
}

function getMigrationFiles() {
  return fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();
}

function checksum(conteudo) {
  return crypto.createHash('sha256').update(conteudo).digest('hex');
}

async function acquireLock(conn) {
  const [rows] = await conn.query('SELECT GET_LOCK(?, ?) AS ok', [
    LOCK_NAME,
    LOCK_TIMEOUT_SECONDS
  ]);
  return rows[0].ok === 1;
}

async function releaseLock(conn) {
  await conn.query('SELECT RELEASE_LOCK(?)', [LOCK_NAME]);
}

async function run() {
  const conn = await mysql.createConnection(migrationConfig());

  try {
    // Lock primeiro: evita corrida entre instancias no mesmo deploy.
    const travou = await acquireLock(conn);
    if (!travou) {
      throw new Error(
        `Nao foi possivel obter o lock de migration em ${LOCK_TIMEOUT_SECONDS}s. ` +
          'Outra instancia pode estar migrando.'
      );
    }

    try {
      await ensureControlTable(conn);
      const aplicadas = await getApplied(conn);
      const arquivos = getMigrationFiles();

      // Checa integridade das ja aplicadas antes de aplicar novas.
      for (const nome of arquivos) {
        if (!aplicadas.has(nome)) continue;
        const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, nome), 'utf8');
        if (checksum(sql) !== aplicadas.get(nome)) {
          throw new Error(
            `Migration ja aplicada foi alterada: ${nome}. ` +
              'Nunca edite uma migration aplicada; crie uma nova.'
          );
        }
      }

      const pendentes = arquivos.filter(nome => !aplicadas.has(nome));
      if (pendentes.length === 0) {
        console.log('Nenhuma migration pendente. Banco atualizado.');
        return;
      }

      for (const nome of pendentes) {
        const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, nome), 'utf8');
        console.log(`Aplicando: ${nome}`);

        await conn.beginTransaction();
        try {
          await conn.query(sql);
          await conn.execute(
            'INSERT INTO `schema_migrations` (`nome`, `checksum`) VALUES (?, ?)',
            [nome, checksum(sql)]
          );
          await conn.commit();
          console.log(`  ok: ${nome}`);
        } catch (err) {
          await conn.rollback();
          console.error(`  falhou: ${nome} -> ${err.message}`);
          throw err;
        }
      }

      console.log(`Concluido. ${pendentes.length} migration(s) aplicada(s).`);
    } finally {
      await releaseLock(conn);
    }
  } finally {
    await conn.end();
  }
}

run().catch(err => {
  console.error('Erro ao rodar migrations:', err.message);
  process.exit(1);
});
