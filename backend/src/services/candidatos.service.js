const ApiError = require('../utils/ApiError');
const { obterContexto } = require('./grafo.service');
const oportunidadeRepo = require('../repositories/oportunidade.repository');
const candidatosRepo = require('../repositories/candidatos.repository');
const curriculoService = require('./curriculo.service');
const matchRepo = require('../repositories/match.repository');

// Garante que a oportunidade e da empresa logada e devolve o registro.
async function oportunidadeDaEmpresa(usuarioId, oportunidadeId) {
  const empresaId = await candidatosRepo.idEmpresaPorUsuario(usuarioId);
  if (!empresaId) throw new ApiError(403, 'Acesso não permitido para este perfil');

  const oportunidade = await oportunidadeRepo.buscarPorId(oportunidadeId);
  if (!oportunidade) throw new ApiError(404, 'Oportunidade não encontrada');
  if (oportunidade.Entidade_Parceira_idEntidade_Parceira !== empresaId) {
    throw new ApiError(403, 'Esta oportunidade não pertence à sua empresa');
  }
  return oportunidade;
}

// Inscritos numa oportunidade da empresa logada, ordenados por score de match (quando for vaga).
async function listarRanqueados(usuarioId, oportunidadeId) {
  await oportunidadeDaEmpresa(usuarioId, oportunidadeId);

  const inscritos = (await candidatosRepo.listarInscritos(oportunidadeId)).map(
    ({ foto_arquivo, ...resto }) => ({ ...resto, fotoUrl: foto_arquivo ? '/media/fotos/' + foto_arquivo : null })
  );
  const vaga = await matchRepo.buscarVaga(oportunidadeId);

  // Eventos, palestras e bolsas nao tem requisitos: devolve sem score, por data de inscricao.
  if (!vaga) {
    return inscritos
      .map((i) => ({ ...i, score: null }))
      .sort((a, b) => String(a.data_inscricao).localeCompare(String(b.data_inscricao)));
  }

  const { motor, nomes } = await obterContexto();
  const pontuados = [];
  for (const i of inscritos) {
    const candidata = await matchRepo.carregarCandidata(i.profissionalId);
    const r = motor.pontuar(motor.prepararCandidata(candidata), vaga);
    pontuados.push({
      ...i,
      score: r.score,
      componentes: r.componentes,
      faltantes: r.faltantes.map((id) => ({ id, nome: nomes.get(id) || null })),
      eliminatorias: r.eliminatorias.map((id) => ({ id, nome: nomes.get(id) || null }))
    });
  }
  return pontuados.sort((a, b) => b.score - a.score);
}

// Curriculo de uma candidata inscrita numa oportunidade da empresa logada.
// So libera para quem aplicou naquela oportunidade e so para a empresa dona dela.
async function curriculoDaCandidata(usuarioId, oportunidadeId, profissionalId) {
  await oportunidadeDaEmpresa(usuarioId, oportunidadeId);
  if (!(await candidatosRepo.inscritaNaOportunidade(oportunidadeId, profissionalId))) {
    throw new ApiError(404, 'Candidatura não encontrada');
  }
  return curriculoService.caminhoPorProfissional(profissionalId);
}

module.exports = { listarRanqueados, curriculoDaCandidata };
