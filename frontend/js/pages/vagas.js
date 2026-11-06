import { $, normalizarTexto } from '../core/dom.js';
import { params } from '../core/state.js';
import { api } from '../core/api.js';
import { filtrar, card, vazio } from '../core/render.js';

export async function vagas() {
  const q = params.get('q') || '';
  const todas = await api('/oportunidades?tipo=vaga', { auth: false });
  let filtradas = filtrar(todas, q);

  const render = itens => {
    const el = $('#lista');
    el.innerHTML = itens.length ? itens.map(card).join('') : vazio(q ? `Nenhuma vaga encontrada para "${q}".` : 'Nenhuma vaga cadastrada no momento.');
  };

  render(filtradas);

  const boxMod = $('#filtros-modalidade');
  if (boxMod) {
    boxMod.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      boxMod.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      const mod = b.dataset.mod;
      const res = mod ? filtradas.filter(o => normalizarTexto(o.local).includes(normalizarTexto(mod))) : filtradas;
      render(res);
    });
  }
}
