const multer = require('multer');
const ApiError = require('../utils/ApiError');

// memoryStorage: a imagem vai para o sharp antes de tocar o disco, entao um arquivo
// malicioso nunca chega a ser gravado sem passar pelo reprocessamento.
const TIPOS = ['image/jpeg', 'image/png', 'image/webp'];

function recebedor(campo, limiteMb) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: limiteMb * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => {
      if (!TIPOS.includes(file.mimetype)) return cb(new ApiError(400, 'Envie uma imagem JPEG, PNG ou WebP'));
      cb(null, true);
    }
  });

  return (req, res, next) => {
    upload.single(campo)(req, res, (err) => {
      if (!err) return next();
      if (err.code === 'LIMIT_FILE_SIZE') return next(new ApiError(400, 'A imagem deve ter no máximo ' + limiteMb + ' MB'));
      if (err instanceof ApiError) return next(err);
      return next(new ApiError(400, 'Falha no envio da imagem'));
    });
  };
}

const receberFoto = recebedor('foto', 2);
const receberImagem = recebedor('imagem', 2);

module.exports = { receberFoto, receberImagem };
