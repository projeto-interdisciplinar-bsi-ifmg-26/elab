const ApiError = require('../utils/ApiError');
const repo = require('../repositories/perfilCompleto.repository');

const NAO_NULOS = ['nome', 'disponibilidade'];

async function obterId(usuarioId) {
  const id = await repo.idProfissional(usuarioId);
  if (!id) throw new ApiError(404, 'Perfil profissional não encontrado');
  return id;
}

// Percentual de completude: cada item vale o mesmo peso.
function completude(d, prefs, exps, forms, areas, habs) {
  const itens = [
    ['Titulo profissional', !!d.titulo_profissional],
    ['Resumo', !!d.resumo],
    ['Nivel', !!d.nivel],
    ['Cidade', !!d.cidade],
    ['Curriculo anexado', !!d.curriculo_nome_original],
    ['Preferencias de trabalho', !!prefs],
    ['Areas de interesse', areas.length > 0],
    ['Pelo menos 3 habilidades', habs.length >= 3],
    ['Experiencia profissional', exps.length > 0],
    ['Formacao academica', forms.length > 0],
    ['Links (GitHub, LinkedIn ou portfolio)', !!(d.link_github || d.link_linkedin || d.link_portfolio)]
  ];
  const feitos = itens.filter((i) => i[1]).length;
  return {
    percentual: Math.round((feitos / itens.length) * 100),
    faltando: itens.filter((i) => !i[1]).map((i) => i[0])
  };
}

async function completo(usuarioId) {
  const profId = await obterId(usuarioId);
  const [dados, preferencias, experiencias, formacoes, areas, habilidades] = await Promise.all([
    repo.dados(profId), repo.preferencias(profId), repo.experiencias(profId),
    repo.formacoes(profId), repo.areas(profId), repo.habilidades(profId)
  ]);
  return {
    ...dados, preferencias, experiencias, formacoes, areas, habilidades,
    completude: completude(dados, preferencias, experiencias, formacoes, areas, habilidades)
  };
}

async function atualizarDados(usuarioId, campos) {
  const profId = await obterId(usuarioId);
  const limpos = { ...campos };
  for (const k of NAO_NULOS) if (limpos[k] === '' || limpos[k] === null) delete limpos[k];
  await repo.atualizarDados(profId, limpos);
  return completo(usuarioId);
}

async function salvarPreferencias(usuarioId, campos) {
  const profId = await obterId(usuarioId);
  await repo.salvarPreferencias(profId, campos);
  return completo(usuarioId);
}

async function substituirAreas(usuarioId, lista) {
  const profId = await obterId(usuarioId);
  const unicas = [...new Map(lista.map((a) => [a.areaId, a])).values()];
  const existem = new Set(await repo.areasExistentes(unicas.map((a) => a.areaId)));
  const invalidas = unicas.filter((a) => !existem.has(a.areaId)).map((a) => a.areaId);
  if (invalidas.length) throw new ApiError(400, 'Áreas inexistentes: ' + invalidas.join(', '));
  await repo.substituirAreas(profId, unicas);
  return completo(usuarioId);
}

async function substituirHabilidades(usuarioId, lista) {
  const profId = await obterId(usuarioId);
  const unicas = [...new Map(lista.map((h) => [h.habilidadeId, h])).values()];
  const existem = new Set(await repo.habilidadesExistentes(unicas.map((h) => h.habilidadeId)));
  const invalidas = unicas.filter((h) => !existem.has(h.habilidadeId)).map((h) => h.habilidadeId);
  if (invalidas.length) throw new ApiError(400, 'Habilidades inexistentes: ' + invalidas.join(', '));
  await repo.substituirHabilidades(profId, unicas);
  return completo(usuarioId);
}

module.exports = { completo, atualizarDados, salvarPreferencias, substituirAreas, substituirHabilidades };
