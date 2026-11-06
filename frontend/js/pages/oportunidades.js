import { $ } from '../core/dom.js';
import { api } from '../core/api.js';
import { card, vazio } from '../core/render.js';

export async function oportunidades() {
  const todas = (await api('/oportunidades', { auth: false })).filter(o => o.tipo !== 'vaga');
  const box = $('#lista');
  const fil = $('#filtros');

  const pintar = t => {
    fil.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.t === t)));
    const l = todas.filter(o => !t || o.tipo === t);
    box.innerHTML = l.length ? l.map(card).join('') : vazio('Nenhuma oportunidade nesta categoria.');
  };

  fil.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (btn && btn.dataset.t !== undefined) pintar(btn.dataset.t);
  });

  pintar('');
}
