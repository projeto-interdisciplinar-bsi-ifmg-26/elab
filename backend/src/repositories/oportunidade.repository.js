const { query } = require('../../db/pool');

async function listar({ tipo, status, empresaId } = {}) {
  let sql = 'SELECT * FROM Oportunidades';
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
    'INSERT INTO Cadastros_Oportunidades (Oportunidade_idOportunidade, Profissionais_idProfissionais, mensagem) VALUES (?, ?, ?)',
    [oportunidadeId, usuarioId, mensagem]
  );
  return { id: result.insertId, oportunidadeId, usuarioId, mensagem };
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
