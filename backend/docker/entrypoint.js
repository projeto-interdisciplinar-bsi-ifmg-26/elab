// Entrypoint do container: espera o banco, aplica migrations/seed e sobe o comando.
//
// Ordem pensada para `docker compose up`: o MariaDB demora alguns segundos para
// aceitar conexões; sem a espera o migrate falharia no primeiro boot. As etapas
// de migration e seed são idempotentes e podem ser desligadas por ambiente
// (RUN_MIGRATIONS=false / RUN_SEED=false).
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const RAIZ = path.join(__dirname, '..');

function log(msg) {
  console.log(`[entrypoint] ${msg}`);
}

async function esperarBanco() {
  // Importado depois do dotenv do config para pegar DB_* do ambiente do container.
  const { baseConfig } = require('../db/config');
  const cfg = baseConfig();
  const limiteMs = Number(process.env.DB_WAIT_TIMEOUT_MS) || 60000;
  const inicio = Date.now();

  for (;;) {
    try {
      const conn = await mysql.createConnection(cfg);
      await conn.end();
      log(`banco pronto em ${cfg.host}:${cfg.port}/${cfg.database}`);
      return;
    } catch (err) {
      if (Date.now() - inicio >= limiteMs) {
        throw new Error(
          `banco indisponivel apos ${limiteMs}ms em ${cfg.host}:${cfg.port}: ${err.message}`
        );
      }
      log(`aguardando banco (${err.code || err.message})...`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

function rodar(script) {
  return new Promise((resolve, reject) => {
    const filho = spawn(process.execPath, [script], {
      cwd: RAIZ,
      stdio: 'inherit',
      env: process.env
    });
    filho.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${script} saiu com codigo ${code}`));
    });
    filho.on('error', reject);
  });
}

async function preparar() {
  for (const dir of ['curriculos', 'fotos', 'postagens']) {
    fs.mkdirSync(path.join(RAIZ, 'uploads', dir), { recursive: true });
  }

  await esperarBanco();

  if (process.env.RUN_MIGRATIONS !== 'false') {
    log('aplicando migrations');
    await rodar(path.join(RAIZ, 'db', 'migrate.js'));
  }
  if (process.env.RUN_SEED !== 'false') {
    log('carregando catalogo (seed idempotente)');
    await rodar(path.join(RAIZ, 'db', 'seed.js'));
  }
}

function iniciarApp() {
  const [cmd, ...args] = process.argv.slice(2);
  // CMD padrao do Dockerfile: `node server.js`.
  const filho = spawn(cmd || process.execPath, args.length ? args : ['server.js'], {
    cwd: RAIZ,
    stdio: 'inherit',
    env: process.env
  });

  // `docker compose stop` manda SIGTERM para o PID 1 (este processo). O PID 1
  // ignora sinais sem handler, por isso repassamos para o node filho e só saímos
  // depois que ele encerrar, em vez de morrer deixando o filho órfão.
  let encerrando = false;
  const repassar = (sinal) => {
    if (encerrando) return;
    encerrando = true;
    setTimeout(() => process.exit(1), 15000).unref(); // força saída se travar
    filho.kill(sinal);
  };
  process.on('SIGTERM', repassar);
  process.on('SIGINT', repassar);
  filho.on('exit', (code, sinal) => process.exit(code == null ? (sinal ? 1 : 0) : code));
  filho.on('error', (err) => {
    console.error(`[entrypoint] falha ao iniciar ${cmd}:`, err.message);
    process.exit(1);
  });
}

preparar()
  .then(iniciarApp)
  .catch((err) => {
    console.error('[entrypoint] erro:', err.message);
    process.exit(1);
  });
