const rateLimit = require('express-rate-limit');

// Limita tentativas de login/registro por IP — mitiga brute-force e credential stuffing.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 20,
  message: { sucesso: false, erro: 'Muitas tentativas. Tente novamente mais tarde.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Uploads reprocessam imagem (CPU): limita por IP para nao virar alvo de abuso.
const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 min
  max: Number(process.env.UPLOAD_RATE_LIMIT_MAX) || 30,
  message: { sucesso: false, erro: 'Muitos envios de arquivo. Aguarde um pouco.' },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { authLimiter, uploadLimiter };