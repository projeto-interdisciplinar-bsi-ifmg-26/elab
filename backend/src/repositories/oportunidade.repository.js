const { query } = require('../../db/pool');

// Anexa "habilidades" (lista de nomes) a cada oportunidade: requisitos novos + texto livre legado.
async function anexarHabilidades(lista) {
  if (lista.length === 0) return lista;
  const ids = lista.map((o) => o.idOportunidade);
  const marcas = ids.map(() => '?').join(', ');
  const novos = await query(
    'SELECT oh.Oportunidade_idOportunidade AS oid, h.nome_habilidade AS nome FROM Oportunidades_Habilidades oh JOIN Habilidades h ON h.idHabilidades = oh.Habilidade_idHabilidades WHERE oh.Oportunidade_idOportunidade IN (' + marcas + ') ORDER BY oh.importancia DESC',
    ids
  );
  const legados = await query(
    'SELECT oportunidadeId AS oid, habilidade AS nome FROM Habilidades_Oportunidade WHERE oportunidadeId IN (' + marcas + ')',
    ids
  );
  const mapa = new Map(ids.map((i) => [i, []]));
  for (const r of [...novos, ...legados]) {
    const l = mapa.get(r.oid);
    if (!l.includes(r.nome)) l.push(r.nome);
  }
  return lista.map((o) => ({ ...o, habilidades: mapa.get(o.idOportunidade) }));
}


async function listar({ tipo, status, empresaId } = {}) {
  let sql = 'SELECT o.*, o.idOportunidade AS id, e.nome_organizacao AS empresaNome FROM Oportunidades o JOIN Entidades_Parceiras e ON e.idEntidade_Parceira = o.Entidade_Parceira_idEntidade_Parceira';
  const params = [];

  if (tipo) {
    sql += (params.length ? ' AND' : ' WHERE') + ' tipo = ?';
    params.push(tipo);
  }
  if (status) {
    sql += (params.length ? ' AND' : ' WHERE') + ' status = ?';
    params.push(status);
  }
  if (empresaId) {
    sql += (params.length ? ' AND' : ' WHERE') + ' Entidade_Parceira_idEntidade_Parceira = ?';
    params.push(empresaId);
  }

  return anexarHabilidades(await query(sql, params));
}

async function buscarPorId(id) {
  const rows = await anexarHabilidades(await query('SELECT o.*, o.idOportunidade AS id, e.nome_organizacao AS empresaNome FROM Oportunidades o JOIN Entidades_Parceiras e ON e.idEntidade_Parceira = o.Entidade_Parceira_idEntidade_Parceira WHERE o.idOportunidade = ?', [id]));
  return rows[0] || null;
}

async function criar({ empresaId, titulo, tipo, descricao = '', local = '', data = null, habilidades = [] }) {
  const status = tipo === 'vaga' ? 'ativo' : 'agendado';

  const result = await query(
    'INSERT INTO Oportunidades (Entidade_Parceira_idEntidade_Parceira, titulo, tipo, descricao, local, data, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [empresaId, titulo, tipo, descricao, local, data === '' ? null : data, status]
  );

  const id = result.insertId;

  // Inserir habilidades se houver
  if (habilidades.length > 0) {
    for (const h of habilidades) {
      await query('INSERT INTO Habilidades_Oportunidade (oportunidadeId, habilidade) VALUES (?, ?)', [id, h]);
    }
  }

  return { id: id, empresaId, titulo, tipo, descricao, local, data, status };
}

async function buscarInscricao(oportunidadeId, profissionalId) {
  const rows = await query(
    'SELECT * FROM Cadastros_Oportunidades WHERE Oportunidade_idOportunidade = ? AND Profissionais_idProfissionais = ?',
    [oportunidadeId, profissionalId]
  );
  return rows[0] || null;
}

async function criarInscricao({ oportunidadeId, profissionalId, mensagem = '', protocolo }) {
  const result = await query(
    'INSERT INTO Cadastros_Oportunidades (Oportunidade_idOportunidade, Profissionais_idProfissionais, mensagem, protocolo) VALUES (?, ?, ?, ?)',
    [oportunidadeId, profissionalId, mensagem, protocolo]
  );
  return { id: result.insertId, oportunidadeId, profissionalId, mensagem, protocolo };
}

async function buscarCandidatos(oportunidadeId) {
  const sql = `
    SELECT p.nome, u.email, c.mensagem, c.data_aplicacao as data_inscricao
    FROM Cadastros_Oportunidades c
    JOIN Profissionais p ON c.Profissionais_idProfissionais = p.idProfissionais
    JOIN Usuarios u ON p.Usuario_idUsuario = u.idUsuario
    WHERE c.Oportunidade_idOportunidade = ?
  `;
  return await query(sql, [oportunidadeId]);
}

module.exports = { listar, buscarPorId, criar, buscarInscricao, criarInscricao, buscarCandidatos };
