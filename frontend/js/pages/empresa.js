import { $ } from '../core/dom.js';
import { user } from '../core/state.js';
import { api } from '../core/api.js';
import { enviar } from '../core/forms.js';
import { card, TIPOS } from '../core/render.js';
import { montarLista } from '../core/lista.js';
import { montarBlocoVaga } from '../core/vagaForm.js';

const CAMPOS_VAGA = ['areaId', 'nivel', 'modalidade', 'salario_min', 'salario_max'];

export async function empresa() {
  if (user.tipo !== 'empresa') return void (location.href = 'feed.html');

  const f = $('main form');
  const blocoEl = $('#bloco-vaga');

  let bloco = null;
  try {
    bloco = await montarBlocoVaga(blocoEl);
  } catch {
    blocoEl.innerHTML = '<p class="mut">Não foi possível carregar os campos da vaga. Recarregue a página.</p>';
  }

  const ajustarBloco = () => {
    blocoEl.hidden = f.elements.tipo.value !== 'vaga';
  };
  f.elements.tipo.addEventListener('change', ajustarBloco);
  ajustarBloco();

  let lista = null;
  const carregar = async () => {
    const minhas = await api('/oportunidades/minhas');
    if (lista) return void lista.atualizar(minhas);
    lista = montarLista($('#lista'), {
      itens: minhas,
      desenhar: o => card(o),
      porPagina: 6,
      rotuloBusca: 'Buscar por título, local ou habilidade',
      busca: o => [o.titulo, o.local, o.tipo, ...(o.habilidades || [])].join(' '),
      vazio: 'Nenhuma publicação encontrada. Publique uma oportunidade ou ajuste os filtros.',
      filtros: [{
        chave: 'tipo', rotulo: 'Tipo',
        opcoes: Object.keys(TIPOS).map(t => ({ valor: t, rotulo: TIPOS[t] })),
        teste: (o, v) => o.tipo === v
      }]
    });
  };

  enviar(f, async d => {
    const body = {};
    for (const [k, v] of Object.entries(d)) {
      if (v !== '') body[k] = v;
    }
    if (d.tipo === 'vaga') {
      body.requisitos = bloco ? bloco.requisitos() : [];
    } else {
      for (const k of CAMPOS_VAGA) delete body[k];
    }

    await api('/oportunidades', { method: 'POST', body });

    f.reset();
    if (bloco) bloco.limpar();
    ajustarBloco();

    const btn = $('button[type=submit]', f);
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Publicar';
    }
    $('.ok', f).textContent = 'Publicação criada.';
    setTimeout(() => { $('.ok', f).textContent = ''; }, 4000);
    await carregar();
  });

  await carregar();
}