import { $, esc } from './dom.js';
import { api } from './api.js';

const ROTULOS = {
  estagio: 'Estágio',
  junior: 'Júnior',
  pleno: 'Pleno',
  senior: 'Sênior',
  especialista: 'Especialista',
  qualquer: 'Qualquer nível',
  remoto: 'Remoto',
  hibrido: 'Híbrido',
  presencial: 'Presencial'
};

const MAX_REQUISITOS = 20;

const opcao = (valor, texto, marcada) =>
  '<option value="' + esc(valor) + '"' + (marcada ? ' selected' : '') + '>' + esc(texto) + '</option>';

const achatarAreas = (nos, profundidade = 0) =>
  nos.flatMap(n => [
    { id: n.id, nome: '\u00a0\u00a0'.repeat(profundidade) + n.nome },
    ...achatarAreas(n.filhas || [], profundidade + 1)
  ]);

const opcoesHabilidades = habs => {
  const grupos = {};
  for (const h of habs) {
    const cat = h.categoria || 'outros';
    if (!grupos[cat]) grupos[cat] = [];
    grupos[cat].push(h);
  }
  return Object.keys(grupos).sort().map(cat =>
    '<optgroup label="' + esc(cat) + '">' +
    grupos[cat].map(h => opcao(h.id, h.nome)).join('') +
    '</optgroup>'
  ).join('');
};

// Preenche o elemento "el" com os campos da vaga (area, nivel, modalidade, salario, requisitos).
// Devolve { requisitos(), limpar() }. Lanca erro se o catalogo nao carregar.
export async function montarBlocoVaga(el) {
  const [habs, areas, opcoes] = await Promise.all([
    api('/catalogo/habilidades', { auth: false }),
    api('/catalogo/areas', { auth: false }),
    api('/catalogo/opcoes', { auth: false })
  ]);

  const escolhidos = [];

  const htmlAreas = achatarAreas(areas.arvore || []).map(a => opcao(a.id, a.nome)).join('');
  const htmlNiveis = opcoes.nivel_oportunidade
    .map(v => opcao(v, ROTULOS[v] || v, v === 'qualquer')).join('');
  const htmlModalidades = opcoes.modalidade_oportunidade
    .map(v => opcao(v, ROTULOS[v] || v)).join('');
  const htmlImportancia = [1, 2, 3, 4, 5]
    .map(n => opcao(n, n === 1 ? '1 (baixa)' : n === 5 ? '5 (muito alta)' : String(n), n === 3)).join('');

  el.innerHTML = `
    <label>Área
      <select name="areaId"><option value="">Selecione (opcional)</option>${htmlAreas}</select>
    </label>
    <label>Nível
      <select name="nivel">${htmlNiveis}</select>
    </label>
    <label>Modalidade
      <select name="modalidade"><option value="">Selecione (opcional)</option>${htmlModalidades}</select>
    </label>
    <label>Salário mínimo (R$)
      <input type="number" name="salario_min" min="0" step="100">
    </label>
    <label>Salário máximo (R$)
      <input type="number" name="salario_max" min="0" step="100">
    </label>
    <fieldset class="req-campo">
      <legend>Requisitos da vaga</legend>
      <select data-req="hab"><option value="">Escolha uma habilidade</option>${opcoesHabilidades(habs)}</select>
      <select data-req="imp">${htmlImportancia}</select>
      <label class="req-obr"><input type="checkbox" data-req="obr"> Obrigatória</label>
      <button type="button" class="btn sm secundario" data-req="add">Adicionar requisito</button>
      <ul class="req-lista" data-req="lista"></ul>
    </fieldset>`;

  const lista = $('[data-req="lista"]', el);

  const desenhar = () => {
    lista.innerHTML = escolhidos.map((r, i) =>
      '<li>' + esc(r.nome) + ' | importância ' + r.importancia +
      (r.obrigatoria ? ' | obrigatória' : '') +
      ' <button type="button" class="btn sm ghost" data-remover="' + i + '">Remover</button></li>'
    ).join('');
  };

  el.addEventListener('click', e => {
    const botao = e.target.closest('button');
    if (!botao) return;

    if (botao.dataset.remover !== undefined) {
      escolhidos.splice(Number(botao.dataset.remover), 1);
      desenhar();
      return;
    }

    if (botao.dataset.req === 'add') {
      const selHab = $('[data-req="hab"]', el);
      const selImp = $('[data-req="imp"]', el);
      const chkObr = $('[data-req="obr"]', el);
      const id = Number(selHab.value);
      if (!id) return;
      if (escolhidos.length >= MAX_REQUISITOS) return;
      if (escolhidos.some(r => r.habilidadeId === id)) return;
      escolhidos.push({
        habilidadeId: id,
        nome: selHab.selectedOptions[0].textContent,
        importancia: Number(selImp.value),
        obrigatoria: chkObr.checked
      });
      selHab.value = '';
      chkObr.checked = false;
      desenhar();
    }
  });

  return {
    requisitos: () => escolhidos.map(r => ({
      habilidadeId: r.habilidadeId,
      importancia: r.importancia,
      obrigatoria: r.obrigatoria
    })),
    limpar: () => {
      escolhidos.length = 0;
      desenhar();
    }
  };
}
