const { query, withTransaction } = require('../../db/pool');

const q = (n) => '`' + n + '`';

// Listas brancas: somente estas colunas podem ser gravadas via API.
// Coluna nova no perfil = criar migration + adicionar o nome aqui.
const COLUNAS_DADOS = [
  'nome', 'area', 'titulo_profissional', 'bio', 'resumo', 'cidade', 'estado', 'telefone',
  'nivel', 'anos_experiencia', 'disponibilidade', 'link_portfolio', 'link_github',
  'link_linkedin', 'perfil_publico'
];
const COLUNAS_PREFS = [
  'modalidade', 'aceita_clt', 'aceita_pj', 'aceita_estagio', 'pretensao_min',
  'aceita_mudar_cidade', 'interesse_vagas', 'interesse_eventos', 'interesse_palestras',
  'interesse_bolsas'
];

const limpar = (v) => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v);

async function idProfissional(usuarioId) {
  const rows = await query('SELECT idProfissionais AS id FROM Profissionais WHERE Usuario_idUsuario = ?', [usuarioId]);
  return rows[0] ? rows[0].id : null;
}

async function dados(profId) {
  const rows = await query(
    'SELECT idProfissionais AS id, nome, area, titulo_profissional, bio, resumo, cidade, estado, telefone, nivel, anos_experiencia, disponibilidade, link_portfolio, link_github, link_linkedin, curriculo_nome_original, curriculo_atualizado_em, perfil_publico FROM Profissionais WHERE idProfissionais = ?',
    [profId]
  );
  return rows[0] || null;
}

async function preferencias(profId) {
  const rows = await query('SELECT * FROM Preferencias_Profissional WHERE Profissionais_idProfissionais = ?', [profId]);
  if (!rows[0]) return null;
  const { Profissionais_idProfissionais, ...resto } = rows[0];
  return resto;
}

async function experiencias(profId) {
  return query(
    'SELECT idExperiencia AS id, cargo, empresa, `local`, data_inicio, data_fim, atual, descricao FROM Experiencias_Profissionais WHERE Profissionais_idProfissionais = ? ORDER BY data_inicio DESC',
    [profId]
  );
}

async function formacoes(profId) {
  return query(
    'SELECT idFormacao AS id, instituicao, curso, grau, status, data_inicio, data_fim FROM Formacoes_Academicas WHERE Profissionais_idProfissionais = ? ORDER BY data_inicio DESC',
    [profId]
  );
}

async function areas(profId) {
  return query(
    'SELECT pa.Area_idArea AS areaId, a.nome, a.slug, pa.interesse FROM Profissional_Areas pa JOIN Areas_Atuacao a ON a.idArea = pa.Area_idArea WHERE pa.Profissionais_idProfissionais = ? ORDER BY pa.interesse DESC, a.nome',
    [profId]
  );
}

async function habilidades(profId) {
  return query(
    'SELECT h.idHabilidades AS habilidadeId, h.nome_habilidade AS nome, h.categoria, hp.tempo_experiencia_anos AS anos FROM Habilidades_Profissional hp JOIN Habilidades h ON h.idHabilidades = hp.Habilidades_idHabilidades WHERE hp.Profissionais_idProfissionais = ? ORDER BY h.categoria, h.nome_habilidade',
    [profId]
  );
}

async function atualizarDados(profId, campos) {
  const chaves = Object.keys(campos).filter((k) => COLUNAS_DADOS.includes(k));
  if (chaves.length === 0) return;
  await query(
    'UPDATE Profissionais SET ' + chaves.map((k) => q(k) + ' = ?').join(', ') + ' WHERE idProfissionais = ?',
    [...chaves.map((k) => limpar(campos[k])), profId]
  );
}

async function salvarPreferencias(profId, campos) {
  const chaves = Object.keys(campos).filter((k) => COLUNAS_PREFS.includes(k));
  const cols = ['Profissionais_idProfissionais', ...chaves];
  const marcas = cols.map(() => '?').join(', ');
  const valores = [profId, ...chaves.map((k) => limpar(campos[k]))];
  if (chaves.length === 0) {
    await query('INSERT IGNORE INTO Preferencias_Profissional (' + q(cols[0]) + ') VALUES (?)', [profId]);
    return;
  }
  await query(
    'INSERT INTO Preferencias_Profissional (' + cols.map(q).join(', ') + ') VALUES (' + marcas +
      ') ON DUPLICATE KEY UPDATE ' + chaves.map((k) => q(k) + ' = VALUES(' + q(k) + ')').join(', '),
    valores
  );
}

async function existentes(tabela, coluna, ids) {
  if (ids.length === 0) return [];
  const rows = await query(
    'SELECT ' + q(coluna) + ' AS id FROM ' + q(tabela) + ' WHERE ' + q(coluna) + ' IN (' + ids.map(() => '?').join(', ') + ')',
    ids
  );
  return rows.map((r) => r.id);
}

const areasExistentes = (ids) => existentes('Areas_Atuacao', 'idArea', ids);
const habilidadesExistentes = (ids) => existentes('Habilidades', 'idHabilidades', ids);

async function substituirAreas(profId, lista) {
  await withTransaction(async (conn) => {
    await conn.execute('DELETE FROM Profissional_Areas WHERE Profissionais_idProfissionais = ?', [profId]);
    for (const a of lista) {
      await conn.execute(
        'INSERT INTO Profissional_Areas (Profissionais_idProfissionais, Area_idArea, interesse) VALUES (?, ?, ?)',
        [profId, a.areaId, a.interesse ?? 3]
      );
    }
  });
}

async function substituirHabilidades(profId, lista) {
  await withTransaction(async (conn) => {
    await conn.execute('DELETE FROM Habilidades_Profissional WHERE Profissionais_idProfissionais = ?', [profId]);
    for (const h of lista) {
      await conn.execute(
        'INSERT INTO Habilidades_Profissional (Profissionais_idProfissionais, Habilidades_idHabilidades, tempo_experiencia_anos) VALUES (?, ?, ?)',
        [profId, h.habilidadeId, h.anos ?? null]
      );
    }
  });
}

module.exports = {
  idProfissional, dados, preferencias, experiencias, formacoes, areas, habilidades,
  atualizarDados, salvarPreferencias, areasExistentes, habilidadesExistentes,
  substituirAreas, substituirHabilidades
};
