const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const usuarioRepository = require('../repositories/usuario.repository');
const { jwtSecret, jwtExpiresIn } = require('../config/env');
const { withTransaction } = require('../../db/pool');

const SALT_ROUNDS = 10;

async function registrar({ email, senha, tipo, nome = '' }) {
  return await withTransaction(async (conn) => {
    const existente = await usuarioRepository.buscarPorEmail(email);
    if (existente) throw new ApiError(409, 'E-mail já cadastrado');

    const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);

    // Criar usuário
    const usuario = await usuarioRepository.criar({ email, senhaHash, tipo_usuario: tipo });
    const usuarioId = usuario.id;

    // Se for profissional, criar perfil básico automaticamente
    if (tipo === 'profissional') {
      await conn.execute(
        'INSERT INTO Profissionais (Usuario_idUsuario, nome) VALUES (?, ?)',
        [usuarioId, nome]
      );
    } else if (tipo === 'entidade_parceira') {
      await conn.execute(
        'INSERT INTO Entidades_Parceiras (Usuario_idUsuario, nome_organizacao, cnpj) VALUES (?, ?, ?)',
        [usuarioId, nome, '00000000000000']
      );
    }

    // Nunca devolver o hash da senha.
    return { id: usuarioId, email: usuario.email, tipo: tipo };
  });
}

async function login({ email, senha }) {
  const usuario = await usuarioRepository.buscarPorEmail(email);

  // Mensagem genérica de propósito: evita enumeração de contas.
  if (!usuario) throw new ApiError(401, 'E-mail ou senha inválidos');

  const senhaValida = await bcrypt.compare(senha, usuario.senha);
  if (!senhaValida) throw new ApiError(401, 'E-mail ou senha inválidos');

  const token = jwt.sign(
    { id: usuario.id, tipo: usuario.tipo_usuario },
    jwtSecret,
    { expiresIn: jwtExpiresIn }
  );
  return { token, tipo: usuario.tipo_usuario };
}

module.exports = { registrar, login };