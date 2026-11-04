const { query } = require('../../db/pool');

// id da empresa (Entidades_Parceiras) a partir do usuario logado. Devolve null se nao for empresa.
async function idEmpresaPorUsuario(usuarioId) {
  const rows = await query(
    'SELECT idEntidade_Parceira AS id FROM Entidades_Parceiras WHERE Usuario_idUsuario = ?',
    [usuarioId]
  );
  return rows[0] ? rows[0].id : null;
}

// Inscritos numa oportunidade, com o id da profissional (necessario para pontuar no motor).
async function listarInscritos(oportunidadeId) {
  return query(
    'SELECT p.idProfissionais AS profissionalId, p.nome, u.email, c.mensagem, c.data_aplicacao AS data_inscricao ' +
      'FROM Cadastros_Oportunidades c ' +
      'JOIN Profissionais p ON c.Profissionais_idProfissionais = p.idProfissionais ' +
      'JOIN Usuarios u ON p.Usuario_idUsuario = u.idUsuario ' +
      'WHERE c.Oportunidade_idOportunidade = ?',
    [oportunidadeId]
  );
}

module.exports = { idEmpresaPorUsuario, listarInscritos };
