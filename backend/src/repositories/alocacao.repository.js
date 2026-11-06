const { query } = require('../../db/pool');

// Ids das vagas ativas de uma empresa (Entidades_Parceiras).
async function idsVagasAtivasDaEmpresa(empresaId) {
  const rows = await query(
    "SELECT idOportunidade AS id FROM Oportunidades WHERE tipo = 'vaga' AND status = 'ativo' AND Entidade_Parceira_idEntidade_Parceira = ?",
    [empresaId]
  );
  return rows.map((r) => r.id);
}

// Pares (vaga, profissional) das inscricoes nas vagas informadas, com o nome da profissional.
async function inscricoesDasVagas(vagaIds) {
  if (vagaIds.length === 0) return [];
  return query(
    'SELECT c.Oportunidade_idOportunidade AS vagaId, p.idProfissionais AS profissionalId, p.nome ' +
      'FROM Cadastros_Oportunidades c JOIN Profissionais p ON p.idProfissionais = c.Profissionais_idProfissionais ' +
      'WHERE c.Oportunidade_idOportunidade IN (' + vagaIds.map(() => '?').join(', ') + ')',
    vagaIds
  );
}

module.exports = { idsVagasAtivasDaEmpresa, inscricoesDasVagas };
