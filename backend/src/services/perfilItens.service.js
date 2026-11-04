const ApiError = require('../utils/ApiError');
const perfilRepo = require('../repositories/perfilCompleto.repository');
const repo = require('../repositories/perfilItens.repository');

// Valores usados quando o campo vem vazio e a coluna e NOT NULL.
const DEFAULTS = { experiencias: { atual: false }, formacoes: { status: 'concluido' } };

async function obterId(usuarioId) {
  const id = await perfilRepo.idProfissional(usuarioId);
  if (!id) throw new ApiError(404, 'Perfil profissional não encontrado');
  return id;
}

function normalizar(ent, campos) {
  const { colunas } = repo.ENTIDADES[ent];
  const defs = DEFAULTS[ent] || {};
  const r = {};
  for (const k of colunas) {
    let v = campos[k];
    if (v === undefined || v === '') v = Object.prototype.hasOwnProperty.call(defs, k) ? defs[k] : null;
    r[k] = v;
  }
  if (ent === 'experiencias' && r.atual) r.data_fim = null;
  if (r.data_inicio && r.data_fim && r.data_fim < r.data_inicio) {
    throw new ApiError(400, 'A data de término não pode ser anterior à data de início');
  }
  return r;
}

async function existente(ent, profId, id) {
  const item = await repo.buscar(ent, profId, id);
  if (!item) throw new ApiError(404, 'Item não encontrado');
  return item;
}

async function listar(ent, usuarioId) {
  return repo.listar(ent, await obterId(usuarioId));
}

async function criar(ent, usuarioId, campos) {
  const profId = await obterId(usuarioId);
  return repo.criar(ent, profId, normalizar(ent, campos));
}

async function atualizar(ent, usuarioId, id, campos) {
  const profId = await obterId(usuarioId);
  await existente(ent, profId, id);
  return repo.atualizar(ent, profId, id, normalizar(ent, campos));
}

async function remover(ent, usuarioId, id) {
  const profId = await obterId(usuarioId);
  await existente(ent, profId, id);
  await repo.remover(ent, profId, id);
}

module.exports = { listar, criar, atualizar, remover };
