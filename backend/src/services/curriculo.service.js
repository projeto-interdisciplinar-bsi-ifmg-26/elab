const fs = require('fs');
const path = require('path');
const ApiError = require('../utils/ApiError');
const perfilRepo = require('../repositories/perfilCompleto.repository');
const repo = require('../repositories/curriculo.repository');
const { DIR } = require('../middlewares/upload');

const apagar = (nome) => fs.promises.unlink(path.join(DIR, path.basename(nome))).catch(() => {});

// Confere os primeiros bytes: PDF comeca com "%PDF"; DOCX e um zip e comeca com "PK\x03\x04".
function assinaturaValida(caminho, ext) {
  const fd = fs.openSync(caminho, 'r');
  try {
    const buf = Buffer.alloc(4);
    fs.readSync(fd, buf, 0, 4, 0);
    if (ext === '.pdf') return buf.toString('latin1') === '%PDF';
    if (ext === '.docx') return buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;
    return false;
  } finally {
    fs.closeSync(fd);
  }
}

async function obterId(usuarioId) {
  const id = await perfilRepo.idProfissional(usuarioId);
  if (!id) throw new ApiError(404, 'Perfil profissional não encontrado');
  return id;
}

async function enviar(usuarioId, arquivo) {
  if (!arquivo) throw new ApiError(400, 'Arquivo não enviado (campo "curriculo")');
  const ext = path.extname(arquivo.filename).toLowerCase();

  const profId = await perfilRepo.idProfissional(usuarioId);
  if (!profId) {
    await apagar(arquivo.filename);
    throw new ApiError(404, 'Perfil profissional não encontrado');
  }
  if (!assinaturaValida(arquivo.path, ext)) {
    await apagar(arquivo.filename);
    throw new ApiError(400, 'Arquivo inválido: o conteúdo não corresponde a um PDF ou DOCX');
  }

  const anterior = await repo.atual(profId);
  const nome = Buffer.from(arquivo.originalname, 'latin1').toString('utf8').slice(0, 255);
  await repo.salvar(profId, arquivo.filename, nome);
  if (anterior) await apagar(anterior.arquivo);
  return { nome };
}

async function caminho(usuarioId) {
  const atual = await repo.atual(await obterId(usuarioId));
  if (!atual) throw new ApiError(404, 'Nenhum currículo anexado');
  return { caminho: path.join(DIR, path.basename(atual.arquivo)), nome: atual.nome };
}

async function excluir(usuarioId) {
  const profId = await obterId(usuarioId);
  const atual = await repo.atual(profId);
  if (!atual) throw new ApiError(404, 'Nenhum currículo anexado');
  await repo.limpar(profId);
  await apagar(atual.arquivo);
}

module.exports = { enviar, caminho, excluir };
