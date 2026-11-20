const { query } = require('../../db/pool');

// Empresas (Entidades_Parceiras) com o e-mail do usuario dono, para o admin moderar.
async function listarEmpresas({ status } = {}) {
  let sql =
    'SELECT e.idEntidade_Parceira AS id, e.nome_organizacao AS nome, e.cnpj, u.email, ' +
    'e.status_aprovacao AS statusAprovacao, e.motivo_rejeicao AS motivoRejeicao ' +
    'FROM Entidades_Parceiras e JOIN Usuarios u ON u.idUsuario = e.Usuario_idUsuario';
  const params = [];
  if (status) {
    sql += ' WHERE e.status_aprovacao = ?';
    params.push(status);
  }
  sql += ' ORDER BY e.nome_organizacao';
  return query(sql, params);
}

async function buscarEmpresa(id) {
  const rows = await query(
    'SELECT e.idEntidade_Parceira AS id, e.nome_organizacao AS nome, e.cnpj, u.email, ' +
    'e.status_aprovacao AS statusAprovacao, e.motivo_rejeicao AS motivoRejeicao ' +
    'FROM Entidades_Parceiras e JOIN Usuarios u ON u.idUsuario = e.Usuario_idUsuario ' +
    'WHERE e.idEntidade_Parceira = ?',
    [id]
  );
  return rows[0] || null;
}

async function atualizarStatus(id, status, motivo) {
  await query('UPDATE Entidades_Parceiras SET status_aprovacao = ?, motivo_rejeicao = ? WHERE idEntidade_Parceira = ?', [
    status,
    status === 'rejeitada' ? motivo || '' : null,
    id
  ]);
}

module.exports = { listarEmpresas, buscarEmpresa, atualizarStatus };
