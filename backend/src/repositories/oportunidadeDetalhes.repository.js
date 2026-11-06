const { withTransaction } = require('../../db/pool');

// Grava os campos usados pelo match e os requisitos (Oportunidades_Habilidades) de uma oportunidade.
// Tudo na mesma transacao: ou grava os campos e os requisitos, ou nada.
async function salvarDetalhes(oportunidadeId, d) {
  await withTransaction(async (conn) => {
    await conn.execute(
      'UPDATE Oportunidades SET Area_idArea = ?, nivel = ?, modalidade = ?, salario_min = ?, salario_max = ? WHERE idOportunidade = ?',
      [d.areaId ?? null, d.nivel ?? 'qualquer', d.modalidade ?? null, d.salario_min ?? null, d.salario_max ?? null, oportunidadeId]
    );
    await conn.execute('DELETE FROM Oportunidades_Habilidades WHERE Oportunidade_idOportunidade = ?', [oportunidadeId]);
    for (const r of d.requisitos || []) {
      await conn.execute(
        'INSERT INTO Oportunidades_Habilidades (Oportunidade_idOportunidade, Habilidade_idHabilidades, importancia, obrigatoria) VALUES (?, ?, ?, ?)',
        [oportunidadeId, r.habilidadeId, r.importancia ?? 3, r.obrigatoria ? 1 : 0]
      );
    }
  });
}

module.exports = { salvarDetalhes };
