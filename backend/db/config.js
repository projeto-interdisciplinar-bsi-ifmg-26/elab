// Configuracao de conexao MySQL compartilhada entre o app (pool) e o runner
// de migrations. Centralizar aqui evita divergencia de credenciais/SSL.
//
// Escalabilidade: a aplicacao deve usar SEMPRE o pool (getPool), nunca abrir
// conexoes avulsas por request. O pool reaproveita conexoes e limita o numero
// maximo, protegendo o banco de esgotamento de conexoes sob carga.

require('dotenv').config();

function parseSsl() {
  // DB_SSL=true liga TLS. Bancos gerenciados (RDS, PlanetScale, Aiven) exigem.
  // DB_SSL_REJECT_UNAUTHORIZED=false so para casos de CA self-signed em teste.
  if (String(process.env.DB_SSL).toLowerCase() !== 'true') return undefined;
  return {
    rejectUnauthorized:
      String(process.env.DB_SSL_REJECT_UNAUTHORIZED).toLowerCase() !== 'false'
  };
}

function baseConfig() {
  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

  if (!DB_HOST || !DB_USER || !DB_NAME) {
    throw new Error(
      'Variaveis de banco ausentes. Defina DB_HOST, DB_USER e DB_NAME no ambiente.'
    );
  }

  return {
    host: DB_HOST,
    port: Number(DB_PORT) || 3306,
    user: DB_USER,
    password: DB_PASSWORD || '',
    database: DB_NAME,
    ssl: parseSsl(),
    // Boas praticas de escala: fuso em UTC e datas como string (evita surpresa
    // de timezone entre instancias em regioes diferentes).
    timezone: 'Z',
    dateStrings: true,
    // Seguranca: NUNCA habilitar multipleStatements na conexao da aplicacao.
    multipleStatements: false
  };
}

// Config exclusiva do runner de migrations: precisa rodar varios statements por
// arquivo. Isolado aqui para o app jamais herdar multipleStatements=true.
function migrationConfig() {
  return { ...baseConfig(), multipleStatements: true };
}

// Config do pool da aplicacao. connectionLimit controla a concorrencia maxima
// por instancia; ajuste conforme (max_connections do MySQL / numero de instancias).
function poolConfig() {
  return {
    ...baseConfig(),
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_POOL_LIMIT) || 10,
    maxIdle: Number(process.env.DB_POOL_MAX_IDLE) || 10,
    idleTimeout: Number(process.env.DB_POOL_IDLE_TIMEOUT) || 60000,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
  };
}

module.exports = { baseConfig, migrationConfig, poolConfig };
