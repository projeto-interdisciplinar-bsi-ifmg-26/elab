import { $ } from '../core/dom.js';
import { params } from '../core/state.js';
import { api } from '../core/api.js';
import { filtrar, card } from '../core/render.js';
import { montarLista } from '../core/lista.js';

const NIVEIS = [
  { valor: 'estagio', rotulo: 'Estágio' },
  { valor: 'junior', rotulo: 'Júnior' },
  { valor: 'pleno', rotulo: 'Pleno' },
  { valor: 'senior', rotulo: 'Sênior' },
  { valor: 'especialista', rotulo: 'Especialista' }
];

export async function vagas() {
  const q = params.get('q') || '';
  const todas = await api('/oportunidades?tipo=vaga', { auth: false });

  const lista = montarLista($('#lista'), {
    itens: filtrar(todas, q),
    desenhar: o => card(o),
    porPagina: 9,
    rotuloBusca: 'Buscar por título, empresa ou habilidade',
    busca: o => [o.titulo, o.empresaNome, o.local, ...(o.habilidades || [])].join(' '),
    vazio: q ? `Nenhuma vaga encontrada para "${q}".` : 'Nenhuma vaga encontrada.',
    filtros: [
      { chave: 'modalidade', rotulo: 'Modalidade', oculto: true, opcoes: [], teste: (o, v) => o.modalidade === v },
      { chave: 'nivel', rotulo: 'Nível', opcoes: NIVEIS, teste: (o, v) => o.nivel === v }
    ]
  });

  const boxMod = $('#filtros-modalidade');
  if (boxMod) {
    boxMod.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      boxMod.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      lista.definirFiltro('modalidade', b.dataset.mod || '');
    });
  }
}
