import { $ } from '../core/dom.js';
import { user } from '../core/state.js';
import { api } from '../core/api.js';
import { enviar } from '../core/forms.js';
import { card, vazio } from '../core/render.js';

export async function empresa() {
  if (user.tipo !== 'empresa') return void (location.href = 'feed.html');

  const f = $('main form');
  const carregar = async () => {
    const todas = await api('/oportunidades', { auth: false });
    const minhas = todas.filter(o => (o.empresaId || o.Entidade_Parceira_idEntidade_Parceira) === user.id);
    $('#lista').innerHTML = minhas.length ? minhas.map(card).join('') : vazio('Sua empresa ainda não publicou nenhuma oportunidade.');
  };

  enviar(f, async d => {
    const habilidades = (d.habilidades || '').split(',').map(s => s.trim()).filter(Boolean);
    await api('/oportunidades', { method: 'POST', body: { ...d, habilidades } });
    f.reset();
    const btn = $('button[type=submit]', f);
    if (btn) btn.disabled = false;
    $('.ok', f).textContent = 'Publicação criada.';
    setTimeout(() => { $('.ok', f).textContent = ''; }, 4000);
    await carregar();
  });

  await carregar();
}
