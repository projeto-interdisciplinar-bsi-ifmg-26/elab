// Seeder generico orientado a dados.
// Le db/seeds/seeds.config.json e, para cada entrada, carrega o JSON correspondente
// com UPSERT (idempotente). As colunas vem do information_schema: para um campo novo,
// crie a coluna numa migration e escreva a chave no JSON. Nenhum codigo muda.
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { migrationConfig } = require('./config');

const SEEDS_DIR = path.join(__dirname, 'seeds');
const DATA_DIR = path.join(SEEDS_DIR, 'data');
const q = (nome) => '`' + nome + '`';

async function seed() {
  const conn = await mysql.createConnection(migrationConfig());
  const cacheColunas = new Map();
  const cacheRefs = new Map();

  async function colunas(tabela) {
    if (!cacheColunas.has(tabela)) {
      const [rows] = await conn.query(
        'SELECT COLUMN_NAME AS nome, COLUMN_KEY AS chave FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
        [tabela]
      );
      if (rows.length === 0) throw new Error('Tabela inexistente: ' + tabela + '. Rode npm run migrate.');
      cacheColunas.set(tabela, rows);
    }
    return cacheColunas.get(tabela);
  }

  async function resolverRef(ref, valor) {
    const k = ref.tabela + '|' + ref.por + '|' + valor;
    if (cacheRefs.has(k)) return cacheRefs.get(k);
    const cols = await colunas(ref.tabela);
    const pk = cols.find((c) => c.chave === 'PRI');
    if (!pk) throw new Error('Tabela sem chave primaria: ' + ref.tabela);
    if (!cols.find((c) => c.nome === ref.por)) throw new Error('Coluna inexistente: ' + ref.tabela + '.' + ref.por);
    const [r] = await conn.query(
      'SELECT ' + q(pk.nome) + ' AS id FROM ' + q(ref.tabela) + ' WHERE ' + q(ref.por) + ' = ?',
      [valor]
    );
    if (!r[0]) throw new Error('Referencia nao encontrada: ' + ref.tabela + '.' + ref.por + ' = ' + valor);
    cacheRefs.set(k, r[0].id);
    return r[0].id;
  }

  try {
    const config = JSON.parse(fs.readFileSync(path.join(SEEDS_DIR, 'seeds.config.json'), 'utf8'));
    await conn.beginTransaction();

    for (const cfg of config) {
      const linhas = JSON.parse(fs.readFileSync(path.join(DATA_DIR, cfg.arquivo), 'utf8'));
      const nomes = new Set((await colunas(cfg.tabela)).map((c) => c.nome));

      for (const [i, linha] of linhas.entries()) {
        const reg = { ...linha };

        for (const k of Object.keys(reg)) {
          if (!nomes.has(k)) {
            throw new Error(cfg.arquivo + ' item ' + (i + 1) + ': coluna inexistente "' + k + '" em ' + cfg.tabela + '. Crie uma migration para adiciona-la.');
          }
        }

        for (const [col, ref] of Object.entries(cfg.refs || {})) {
          if (reg[col] !== null && reg[col] !== undefined) reg[col] = await resolverRef(ref, reg[col]);
        }

        if (cfg.normalizarPar) {
          const [a, b] = cfg.normalizarPar;
          if (reg[a] > reg[b]) [reg[a], reg[b]] = [reg[b], reg[a]];
        }

        const keys = Object.keys(reg);
        const atualizaveis = keys.filter((k) => !cfg.chave.includes(k));
        const upd = (atualizaveis.length ? atualizaveis : cfg.chave)
          .map((k) => q(k) + ' = VALUES(' + q(k) + ')')
          .join(', ');

        await conn.execute(
          'INSERT INTO ' + q(cfg.tabela) + ' (' + keys.map(q).join(', ') + ') VALUES (' +
            keys.map(() => '?').join(', ') + ') ON DUPLICATE KEY UPDATE ' + upd,
          keys.map((k) => reg[k])
        );
      }
      console.log('  ' + cfg.tabela + ': ' + linhas.length + ' registro(s) sincronizado(s)');
    }

    await conn.commit();
    console.log('Seed concluido.');
  } catch (err) {
    await conn.rollback();
    console.error('Erro no seed:', err.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

seed();
