const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const usuarioRepository = require('../repositories/usuario.repository');
const { jwtSecret, jwtExpiresIn } = require('../config/env');
const { withTransaction } = require('../../db/pool');
const { normalizarCnpj } = require('../utils/cnpj');

const SALT_ROUNDS = 10;

async function registrar({ email, senha, tipo, nome = '', cnpj }) {
  try {
    return await withTransaction(async (conn) => {
      // Checagens dentro da mesma conexao da transacao.
      const [usuarios] = await conn.execute('SELECT 1 FROM Usuarios WHERE email = ?', [email]);
      if (usuarios.length) throw new ApiError(409, 'E-mail já cadastrado');

      if (tipo === 'entidade_parceira') {
        const [empresas] = await conn.execute('SELECT 1 FROM Entidades_Parceiras WHERE cnpj = ?', [normalizarCnpj(cnpj)]);
        if (empresas.length) throw new ApiError(409, 'CNPJ já cadastrado');
      }

      const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);

      // Criar usuário
      const usuario = await usuarioRepository.criar({ email, senhaHash, tipo_usuario: tipo }, conn);
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
          [usuarioId, nome, normalizarCnpj(cnpj)]
        );
      }

      // Nunca devolver o hash da senha.
      return { id: usuarioId, email: usuario.email, tipo: tipo };
    });
  } catch (err) {
    // Duas requisicoes simultaneas com o mesmo e-mail/CNPJ: o UNIQUE do banco barra a segunda.
    if (err && err.code === 'ER_DUP_ENTRY') {
      const campo = String(err.message).toLowerCase().includes('cnpj') ? 'CNPJ' : 'E-mail';
      throw new ApiError(409, campo + ' já cadastrado');
    }
    throw err;
  }
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
