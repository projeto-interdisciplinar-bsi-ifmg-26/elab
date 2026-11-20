const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const ApiError = require('../utils/ApiError');
const repo = require('../repositories/foto.repository');

// Fora de /frontend: as fotos sao servidas apenas por express.static em /media (ver server.js).
const DIR_FOTOS = path.join(__dirname, '..', '..', 'uploads', 'fotos');
const DIR_POSTAGENS = path.join(__dirname, '..', '..', 'uploads', 'postagens');
fs.mkdirSync(DIR_FOTOS, { recursive: true });
fs.mkdirSync(DIR_POSTAGENS, { recursive: true });

const urlFoto = (arquivo) => (arquivo ? '/media/fotos/' + arquivo : null);
const urlPostagem = (arquivo) => (arquivo ? '/media/postagens/' + arquivo : null);

const apagar = (dir, nome) => fs.promises.unlink(path.join(dir, path.basename(nome))).catch(() => {});

// Confere os primeiros bytes: a extensao/mimetype do cliente nao serve como garantia.
function assinaturaValida(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true; // JPEG
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return true; // PNG
  if (buf.length >= 12 && buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') return true; // WebP
  return false;
}

// Reprocessa: corrige orientacao, recorta/preenche no enquadramento pedido, converte para
// WebP e descarta metadados (inclusive localizacao) — o padrao do sharp ja remove EXIF.
async function processar(buffer, largura, altura, fit) {
  try {
    return await sharp(buffer)
      .rotate()
      .resize(largura, altura, { fit, withoutEnlargement: fit === 'inside' })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    throw new ApiError(400, 'Arquivo de imagem inválido');
  }
}

async function gerar(arquivo, dir, largura, altura, fit) {
  if (!arquivo) throw new ApiError(400, 'Imagem não enviada');
  if (!assinaturaValida(arquivo.buffer)) throw new ApiError(400, 'Arquivo de imagem inválido');
  const saida = await processar(arquivo.buffer, largura, altura, fit);
  const nome = crypto.randomBytes(16).toString('hex') + '.webp';
  await fs.promises.writeFile(path.join(dir, nome), saida);
  return nome;
}

// Banner de postagem: cabe inteiro em 1280x720 sem cortar (fit "inside").
async function gerarPostagem(arquivo) {
  return gerar(arquivo, DIR_POSTAGENS, 1280, 720, 'inside');
}

async function enviarFoto(usuarioId, arquivo) {
  const nome = await gerar(arquivo, DIR_FOTOS, 512, 512, 'cover');
  const anterior = await repo.atual(usuarioId);
  await repo.salvar(usuarioId, nome);
  if (anterior) await apagar(DIR_FOTOS, anterior);
  return { fotoUrl: urlFoto(nome) };
}

async function excluirFoto(usuarioId) {
  const anterior = await repo.atual(usuarioId);
  if (!anterior) throw new ApiError(404, 'Nenhuma foto de perfil');
  await repo.limpar(usuarioId);
  await apagar(DIR_FOTOS, anterior);
}

module.exports = { enviarFoto, excluirFoto, gerar, gerarPostagem, apagar, urlFoto, urlPostagem, DIR_FOTOS, DIR_POSTAGENS };
