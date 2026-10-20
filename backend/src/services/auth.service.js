const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const usuarioRepository = require('../repositories/usuario.repository');
const { jwtSecret, jwtExpiresIn } = require('../config/env');

const SALT_ROUNDS = 10;

async function registrar({ email, senha, tipo }) {
  const existente = await usuarioRepository.buscarPorEmail(email);
  if (existente) throw new ApiError(409, 'E-mail já cadastrado');

  const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);
  const usuario = await usuarioRepository.criar({ email, senhaHash, tipo_usuario: tipo });

  // Nunca devolver o hash da senha.
  return { id: usuario.id, email: usuario.email, tipo: usuario.tipo_usuario };
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