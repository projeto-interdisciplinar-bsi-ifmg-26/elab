const { query } = require('../../db/pool');

async function listar({ tipo, status } = {}) {
  let sql = 'SELECT * FROM Oportunidades';
  const params = [];

  if (tipo) {
    sql += ' WHERE tipo = ?';
    params.push(tipo);
  }
  if (status) {
    sql += (params.length ? ' AND' : ' WHERE') + ' status = ?';
    params.push(status);
  }

  const rows = await query(sql, params);
  return rows;
}

async function buscarPorId(id) {
  const rows = await query('SELECT * FROM Oportunidades WHERE idOportunidade = ?', [id]);
  return rows[0] || null;
}

async function criar({ empresaId, titulo, tipo, descricao = '', local = '', data = '', habilidades = [] }) {
  const status = tipo === 'vaga' ? 'ativo' : 'agendado';

  const result = await query(
    'INSERT INTO Oportunidades (empresaId, titulo, tipo, descricao, local, data, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [empresaId, titulo, tipo, descricao, local, data, status]
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

async function buscarInscricao(oportunidadeId, usuarioId) {
  const rows = await query(
    'SELECT * FROM Inscricoes WHERE oportunidadeId = ? AND usuarioId = ?',
    [oportunidadeId, usuarioId]
  );
  return rows[0] || null;
}

async function criarInscricao({ oportunidadeId, usuarioId, mensagem = '' }) {
  const result = await query(
    'INSERT INTO Inscricoes (oportunidadeId, usuarioId, mensagem) VALUES (?, ?, ?)',
    [oportunidadeId, usuarioId, mensagem]
  );
  return { id: result.insertId, oportunidadeId, usuarioId, mensagem };
}

module.exports = { listar, buscarPorId, criar, buscarInscricao, criarInscricao };
