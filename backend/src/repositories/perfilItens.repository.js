const { query } = require('../../db/pool');

const q = (n) => '`' + n + '`';

// Coluna nova = migration + adicionar o nome na lista da entidade.
const ENTIDADES = {
  experiencias: {
    tabela: 'Experiencias_Profissionais',
    pk: 'idExperiencia',
    colunas: ['cargo', 'empresa', 'local', 'data_inicio', 'data_fim', 'atual', 'descricao'],
    ordem: 'data_inicio DESC'
  },
  formacoes: {
    tabela: 'Formacoes_Academicas',
    pk: 'idFormacao',
    colunas: ['instituicao', 'curso', 'grau', 'status', 'data_inicio', 'data_fim'],
    ordem: 'data_inicio DESC'
  }
};

function cfg(ent) {
  const c = ENTIDADES[ent];
  if (!c) throw new Error('Entidade desconhecida: ' + ent);
  return c;
}

const valor = (v) => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v);
const selecao = (c) => 'SELECT ' + q(c.pk) + ' AS id, ' + c.colunas.map(q).join(', ') + ' FROM ' + q(c.tabela);

async function listar(ent, profId) {
  const c = cfg(ent);
  return query(selecao(c) + ' WHERE Profissionais_idProfissionais = ? ORDER BY ' + c.ordem, [profId]);
}

async function buscar(ent, profId, id) {
  const c = cfg(ent);
  const rows = await query(
    selecao(c) + ' WHERE ' + q(c.pk) + ' = ? AND Profissionais_idProfissionais = ?',
    [id, profId]
  );
  return rows[0] || null;
}

async function criar(ent, profId, campos) {
  const c = cfg(ent);
  const r = await query(
    'INSERT INTO ' + q(c.tabela) + ' (Profissionais_idProfissionais, ' + c.colunas.map(q).join(', ') +
      ') VALUES (?, ' + c.colunas.map(() => '?').join(', ') + ')',
    [profId, ...c.colunas.map((k) => valor(campos[k]))]
  );
  return buscar(ent, profId, r.insertId);
}

async function atualizar(ent, profId, id, campos) {
  const c = cfg(ent);
  await query(
    'UPDATE ' + q(c.tabela) + ' SET ' + c.colunas.map((k) => q(k) + ' = ?').join(', ') +
      ' WHERE ' + q(c.pk) + ' = ? AND Profissionais_idProfissionais = ?',
    [...c.colunas.map((k) => valor(campos[k])), id, profId]
  );
  return buscar(ent, profId, id);
}

async function remover(ent, profId, id) {
  const c = cfg(ent);
  await query(
    'DELETE FROM ' + q(c.tabela) + ' WHERE ' + q(c.pk) + ' = ? AND Profissionais_idProfissionais = ?',
    [id, profId]
  );
}

module.exports = { ENTIDADES, listar, buscar, criar, atualizar, remover };
