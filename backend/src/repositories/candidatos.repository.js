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
// curriculo_nome_original diz se a empresa pode oferecer o download sem outra consulta.
async function listarInscritos(oportunidadeId) {
  return query(
    'SELECT p.idProfissionais AS profissionalId, p.nome, u.email, u.foto_arquivo, ' +
      'p.curriculo_nome_original AS curriculoNome, c.mensagem, c.data_aplicacao AS data_inscricao ' +
      'FROM Cadastros_Oportunidades c ' +
      'JOIN Profissionais p ON c.Profissionais_idProfissionais = p.idProfissionais ' +
      'JOIN Usuarios u ON p.Usuario_idUsuario = u.idUsuario ' +
      'WHERE c.Oportunidade_idOportunidade = ?',
    [oportunidadeId]
  );
}

// Confere se a profissional se inscreveu nesta oportunidade (evita expor o curriculo
// de alguem que nao aplicou, bastando adivinhar o id).
async function inscritaNaOportunidade(oportunidadeId, profissionalId) {
  const rows = await query(
    'SELECT 1 AS existe FROM Cadastros_Oportunidades WHERE Oportunidade_idOportunidade = ? AND Profissionais_idProfissionais = ? LIMIT 1',
    [oportunidadeId, profissionalId]
  );
  return rows.length > 0;
}

module.exports = { idEmpresaPorUsuario, listarInscritos, inscritaNaOportunidade };
