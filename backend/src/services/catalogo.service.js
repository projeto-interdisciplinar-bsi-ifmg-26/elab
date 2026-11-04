const repo = require('../repositories/catalogo.repository');

// chave exposta na API -> [tabela, coluna] do ENUM
const ENUMS = {
  nivel: ['Profissionais', 'nivel'],
  disponibilidade: ['Profissionais', 'disponibilidade'],
  modalidade_preferida: ['Preferencias_Profissional', 'modalidade'],
  grau_formacao: ['Formacoes_Academicas', 'grau'],
  status_formacao: ['Formacoes_Academicas', 'status'],
  tipo_oportunidade: ['Oportunidades', 'tipo'],
  nivel_oportunidade: ['Oportunidades', 'nivel'],
  modalidade_oportunidade: ['Oportunidades', 'modalidade']
};

async function habilidades() {
  return repo.listarHabilidades();
}

async function areas() {
  const lista = await repo.listarAreas();
  const porId = new Map(lista.map((a) => [a.id, { ...a, filhas: [] }]));
  const arvore = [];
  for (const a of porId.values()) {
    const pai = a.paiId ? porId.get(a.paiId) : null;
    if (pai) pai.filhas.push(a);
    else arvore.push(a);
  }
  return { arvore, lista };
}

async function opcoes() {
  const entradas = await Promise.all(
    Object.entries(ENUMS).map(async ([chave, [tabela, coluna]]) => [chave, await repo.listarEnum(tabela, coluna)])
  );
  return Object.fromEntries(entradas);
}

module.exports = { habilidades, areas, opcoes };
