const ApiError = require('../utils/ApiError');
const { obterContexto } = require('./grafo.service');
const perfilRepo = require('../repositories/perfilCompleto.repository');
const matchRepo = require('../repositories/match.repository');
const inscricoesRepo = require('../repositories/inscricoes.repository');

// Historico da colaboradora logada. Para vagas inclui a nota de compatibilidade (score); para os demais tipos, score null.
async function listarMinhas(usuarioId) {
  const profId = await perfilRepo.idProfissional(usuarioId);
  if (!profId) throw new ApiError(404, 'Perfil profissional não encontrado');

  const lista = await inscricoesRepo.listarPorProfissional(profId);
  if (!lista.some((i) => i.tipo === 'vaga')) return lista.map((i) => ({ ...i, score: null }));

  const candidata = await matchRepo.carregarCandidata(profId);
  if (!candidata) throw new ApiError(404, 'Perfil profissional não encontrado');
  const { motor } = await obterContexto();
  const prep = motor.prepararCandidata(candidata);

  const saida = [];
  for (const i of lista) {
    let score = null;
    if (i.tipo === 'vaga') {
      const vaga = await matchRepo.buscarVaga(i.oportunidadeId);
      if (vaga) score = motor.pontuar(prep, vaga).score;
    }
    saida.push({ ...i, score });
  }
  return saida;
}

module.exports = { listarMinhas };