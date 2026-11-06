import { $ } from '../core/dom.js';
import { api } from '../core/api.js';
import { card } from '../core/render.js';
import { montarLista } from '../core/lista.js';

export async function oportunidades() {
  const todas = (await api('/oportunidades', { auth: false })).filter(o => o.tipo !== 'vaga');
  const fil = $('#filtros');

  const lista = montarLista($('#lista'), {
    itens: todas,
    desenhar: o => card(o),
    porPagina: 8,
    classeItens: 'lista duas',
    rotuloBusca: 'Buscar por título ou empresa',
    busca: o => [o.titulo, o.empresaNome, o.local, o.tipo].join(' '),
    vazio: 'Nenhuma oportunidade encontrada.',
    filtros: [
      { chave: 'tipo', rotulo: 'Tipo', oculto: true, opcoes: [], teste: (o, v) => o.tipo === v }
    ]
  });

  fil.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn || btn.dataset.t === undefined) return;
    fil.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    lista.definirFiltro('tipo', btn.dataset.t);
  });
}
