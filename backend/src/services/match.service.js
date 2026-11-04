const ApiError = require('../utils/ApiError');
const { obterContexto } = require('./grafo.service');
const perfilRepo = require('../repositories/perfilCompleto.repository');
const matchRepo = require('../repositories/match.repository');

// Carrega a candidata (formato do motor) a partir do id do usuario logado.
async function obterCandidata(usuarioId) {
  const profId = await perfilRepo.idProfissional(usuarioId);
  if (!profId) throw new ApiError(404, 'Perfil profissional não encontrado');
  const candidata = await matchRepo.carregarCandidata(profId);
  if (!candidata) throw new ApiError(404, 'Perfil profissional não encontrado');
  return candidata;
}

const nomear = (nomes, id) => ({ id, nome: nomes.get(id) || null });

// Ranking das vagas ativas para a colaboradora logada.
async function ranquearVagas(usuarioId) {
  const candidata = await obterCandidata(usuarioId);
  const [{ motor, nomes }, vagas] = await Promise.all([obterContexto(), matchRepo.listarVagasAtivas()]);
  const prep = motor.prepararCandidata(candidata);
  return motor.ranquear(prep, vagas).map((r) => ({
    vagaId: r.vagaId,
    score: r.score,
    componentes: r.componentes,
    requisitos: r.requisitos.map((q) => ({ ...q, nome: nomes.get(q.habilidadeId) || null })),
    faltantes: r.faltantes.map((id) => nomear(nomes, id)),
    eliminatorias: r.eliminatorias.map((id) => nomear(nomes, id))
  }));
}

// Trilha de aprendizado: caminho minimo ate cada habilidade que a vaga pede e ela ainda nao tem.
async function trilhaParaVaga(usuarioId, vagaId) {
  const candidata = await obterCandidata(usuarioId);
  const vaga = await matchRepo.buscarVaga(vagaId);
  if (!vaga) throw new ApiError(404, 'Vaga não encontrada');
  const { motor, nomes } = await obterContexto();
  const prep = motor.prepararCandidata(candidata);
  const itens = motor.trilha(prep, vaga).map((t) => ({
    alvo: nomear(nomes, t.alvo),
    importancia: t.importancia,
    similaridade: t.similaridade,
    alcancavel: t.alcancavel,
    caminho: t.caminho.map((id) => nomear(nomes, id))
  }));
  return { vagaId, trilha: itens };
}

module.exports = { ranquearVagas, trilhaParaVaga };
