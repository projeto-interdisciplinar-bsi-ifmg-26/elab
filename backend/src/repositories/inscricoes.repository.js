const { query } = require('../../db/pool');

// Inscricoes/candidaturas de uma profissional, da mais recente para a mais antiga.
async function listarPorProfissional(profissionalId) {
  return query(
    'SELECT o.idOportunidade AS oportunidadeId, o.titulo, o.tipo, o.status, e.nome_organizacao AS empresaNome, ' +
      'c.protocolo, c.mensagem, c.data_aplicacao AS dataInscricao ' +
      'FROM Cadastros_Oportunidades c ' +
      'JOIN Oportunidades o ON o.idOportunidade = c.Oportunidade_idOportunidade ' +
      'JOIN Entidades_Parceiras e ON e.idEntidade_Parceira = o.Entidade_Parceira_idEntidade_Parceira ' +
      'WHERE c.Profissionais_idProfissionais = ? ' +
      'ORDER BY c.data_aplicacao DESC, o.idOportunidade DESC',
    [profissionalId]
  );
}

module.exports = { listarPorProfissional };