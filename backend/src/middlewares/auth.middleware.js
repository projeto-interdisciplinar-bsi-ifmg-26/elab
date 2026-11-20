const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const { jwtSecret } = require('../config/env');

function autenticar(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Token não fornecido'));
  }

  const token = authHeader.split(' ')[1];
  try {
    req.usuario = jwt.verify(token, jwtSecret); // { id, tipo }
    next();
  } catch {
    next(new ApiError(401, 'Token inválido ou expirado'));
  }
}

// Token opcional: se vier um Bearer valido preenche req.usuario; sem token (ou token
// invalido) segue como anonimo, para rotas publicas que mudam conforme o papel.
function autenticarOpcional(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next();

  try {
    req.usuario = jwt.verify(authHeader.split(' ')[1], jwtSecret);
  } catch {
    // token invalido: segue anonimo; a rota decide o que expor.
  }
  next();
}

function permitir(...tipos) {
  return (req, res, next) => {
    const usuarioTipo = req.usuario?.tipo;

    // Mapeamento de tipos para compatibilidade entre banco e frontend/rotas
    const mapeamento = {
      'profissional': 'colaboradora',
      'entidade_parceira': 'empresa',
      'admin': 'admin'
    };

    const tipoNormalizado = mapeamento[usuarioTipo] || usuarioTipo;

    if (!tipos.includes(tipoNormalizado)) {
      return next(new ApiError(403, 'Acesso não permitido para este perfil'));
    }
    next();
  };
}

module.exports = { autenticar, autenticarOpcional, permitir };