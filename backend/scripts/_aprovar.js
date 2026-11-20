// Helpers de bastidor para os testes: liberam direto no banco o que o fluxo
// normal so libera via administrador (aprovacao de empresa e moderacao de
// publicacao), evitando depender de um admin nos cenarios de teste.
const { query } = require('../db/pool');

async function aprovarEmpresa(email) {
  const r = await query(
    "UPDATE Entidades_Parceiras e JOIN Usuarios u ON u.idUsuario = e.Usuario_idUsuario SET e.status_aprovacao = 'aprovada', e.motivo_rejeicao = NULL WHERE u.email = ?",
    [email]
  );
  if (!r.affectedRows) throw new Error('Empresa nao encontrada para aprovar: ' + email);
}

async function aprovarOportunidade(id) {
  const r = await query(
    "UPDATE Oportunidades SET status_moderacao = 'aprovada', moderada_em = NOW() WHERE idOportunidade = ?",
    [id]
  );
  if (!r.affectedRows) throw new Error('Oportunidade nao encontrada para aprovar: ' + id);
}

module.exports = { aprovarEmpresa, aprovarOportunidade };
