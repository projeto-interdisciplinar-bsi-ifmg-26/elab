const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const ApiError = require('../utils/ApiError');

// Fora de /frontend: nunca e servido como arquivo estatico.
const DIR = path.join(__dirname, '..', '..', 'uploads', 'curriculos');
fs.mkdirSync(DIR, { recursive: true });

const EXTENSOES = ['.pdf', '.docx'];

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, DIR),
    // Nome aleatorio: ignora totalmente o nome enviado pelo cliente (evita path traversal).
    filename: (req, file, cb) =>
      cb(null, crypto.randomBytes(16).toString('hex') + path.extname(file.originalname).toLowerCase())
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!EXTENSOES.includes(ext)) return cb(new ApiError(400, 'Envie o currículo em PDF ou DOCX'));
    cb(null, true);
  }
});

function receberCurriculo(req, res, next) {
  upload.single('curriculo')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return next(new ApiError(400, 'O currículo deve ter no máximo 5 MB'));
    if (err instanceof ApiError) return next(err);
    return next(new ApiError(400, 'Falha no envio do currículo'));
  });
}

module.exports = { receberCurriculo, DIR };
