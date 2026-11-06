import { esc, normalizarTexto } from './dom.js';

// Monta busca + filtros + paginacao (em cima e embaixo) dentro do elemento "el".
// Opcoes: itens, desenhar(item), porPagina, busca(item) -> texto pesquisavel,
// filtros: [{ chave, rotulo, opcoes: [{ valor, rotulo }], teste(item, valor), oculto }],
// vazio (mensagem), classeItens (classe CSS do container dos itens), rotuloBusca.
// Devolve { atualizar(novosItens), definirFiltro(chave, valor) }.
export function montarLista(el, opcoes) {
  const { desenhar, busca, filtros = [], porPagina = 9, vazio = 'Nada encontrado.', classeItens = 'lista', rotuloBusca = 'Buscar' } = opcoes;
  let todos = opcoes.itens || [];
  const estado = { termo: '', pagina: 1, valores: {} };
  for (const f of filtros) estado.valores[f.chave] = '';

  const campoBusca = busca
    ? '<input type="search" class="lista-busca" placeholder="' + esc(rotuloBusca) + '" aria-label="' + esc(rotuloBusca) + '">'
    : '';
  const selects = filtros.filter(f => !f.oculto).map(f =>
    '<select data-filtro="' + esc(f.chave) + '" aria-label="' + esc(f.rotulo) + '">' +
    '<option value="">' + esc(f.rotulo) + ': todos</option>' +
    f.opcoes.map(o => '<option value="' + esc(o.valor) + '">' + esc(o.rotulo) + '</option>').join('') +
    '</select>'
  ).join('');

  el.innerHTML =
    '<div class="lista-barra">' + campoBusca + selects + '</div>' +
    '<p class="mut lista-total" role="status"></p>' +
    '<nav class="lista-pag" aria-label="Paginação (topo)"></nav>' +
    '<div class="' + esc(classeItens) + '"></div>' +
    '<nav class="lista-pag" aria-label="Paginação (rodapé)"></nav>';

  const barra = el.children[0];
  const total = el.children[1];
  const pagTopo = el.children[2];
  const area = el.children[3];
  const pagBase = el.children[4];

  const htmlPaginacao = (atual, paginas) => (paginas > 1
    ? '<button type="button" class="btn sm secundario" data-pag="' + (atual - 1) + '"' + (atual === 1 ? ' disabled' : '') + '>Anterior</button>' +
      '<span>Página ' + atual + ' de ' + paginas + '</span>' +
      '<button type="button" class="btn sm secundario" data-pag="' + (atual + 1) + '"' + (atual === paginas ? ' disabled' : '') + '>Próxima</button>'
    : '');

  const passa = item => {
    if (estado.termo && !normalizarTexto(busca(item)).includes(estado.termo)) return false;
    return filtros.every(f => !estado.valores[f.chave] || f.teste(item, estado.valores[f.chave]));
  };

  const desenharTudo = () => {
    const lista = todos.filter(passa);
    const paginas = Math.max(1, Math.ceil(lista.length / porPagina));
    if (estado.pagina > paginas) estado.pagina = paginas;
    const inicio = (estado.pagina - 1) * porPagina;
    total.textContent = lista.length + (lista.length === 1 ? ' resultado' : ' resultados');
    area.innerHTML = lista.length
      ? lista.slice(inicio, inicio + porPagina).map(i => desenhar(i)).join('')
      : '<div class="vazio"><p>' + esc(vazio) + '</p></div>';
    const html = htmlPaginacao(estado.pagina, paginas);
    pagTopo.innerHTML = html;
    pagBase.innerHTML = html;
  };

  barra.addEventListener('input', e => {
    if (!e.target.matches('.lista-busca')) return;
    estado.termo = normalizarTexto(e.target.value.trim());
    estado.pagina = 1;
    desenharTudo();
  });

  barra.addEventListener('change', e => {
    const chave = e.target.dataset ? e.target.dataset.filtro : '';
    if (!chave) return;
    estado.valores[chave] = e.target.value;
    estado.pagina = 1;
    desenharTudo();
  });

  const aoClicarPagina = e => {
    const b = e.target.closest('button[data-pag]');
    if (!b || b.disabled) return;
    estado.pagina = Number(b.dataset.pag);
    desenharTudo();
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  pagTopo.addEventListener('click', aoClicarPagina);
  pagBase.addEventListener('click', aoClicarPagina);

  desenharTudo();

  return {
    atualizar(novos) {
      todos = novos;
      estado.pagina = 1;
      desenharTudo();
    },
    definirFiltro(chave, valor) {
      estado.valores[chave] = valor;
      estado.pagina = 1;
      desenharTudo();
    }
  };
}
