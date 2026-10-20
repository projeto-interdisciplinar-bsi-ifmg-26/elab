const ApiError = require('../utils/ApiError');
const { query } = require('../../db/pool');
const usuarioRepository = require('../repositories/usuario.repository');

// O front trata 'empresa' como entidade parceira; o banco usa 'entidade_parceira'.
const tipoFront = (t) => {
  const map = { 'entidade_parceira': 'empresa', 'profissional': 'colaboradora' };
  return map[t] || t;
};

async function obter(id) {
  const u = await usuarioRepository.buscarPorId(id);
  if (!u) throw new ApiError(404, 'Usuário não encontrado');

  let nome = u.email.split('@')[0];
  let area = '';
  let cidade = '';
  let bio = '';
  let entidadeId = null;

  if (u.tipo_usuario === 'profissional') {
    const rows = await query(
      'SELECT nome, area, cidade, bio FROM Profissionais WHERE Usuario_idUsuario = ?', [id]);
    if (rows[0]) {
      nome = rows[0].nome;
      area = rows[0].area || '';
      cidade = rows[0].cidade || '';
      bio = rows[0].bio || '';
    }
  } else if (u.tipo_usuario === 'entidade_parceira') {
    const rows = await query(
      'SELECT idEntidade_Parceira as id, nome_organizacao, descricao FROM Entidades_Parceiras WHERE Usuario_idUsuario = ?', [id]);
    if (rows[0]) {
      nome = rows[0].nome_organizacao;
      bio = rows[0].descricao || '';
      entidadeId = rows[0].id;
    }
  }

  return {
    id: u.id,
    nome,
    email: u.email,
    tipo: tipoFront(u.tipo_usuario),
    area,
    cidade,
    bio,
    entidadeId: entidadeId
  };
}

async function atualizar(id, { nome, area, cidade, bio }) {
  const u = await usuarioRepository.buscarPorId(id);
  if (!u) throw new ApiError(404, 'Usuário não encontrado');

  if (u.tipo_usuario === 'profissional') {
    await query(
      'UPDATE Profissionais SET nome = ?, area = ?, cidade = ?, bio = ? WHERE Usuario_idUsuario = ?',
      [nome || '', area || '', cidade || '', bio || '', id]);
  } else if (u.tipo_usuario === 'entidade_parceira') {
    await query(
      'UPDATE Entidades_Parceiras SET nome_organizacao = ?, descricao = ? WHERE Usuario_idUsuario = ?',
      [nome || '', bio || '', id]);
  }
  return obter(id);
}

module.exports = { obter, atualizar };