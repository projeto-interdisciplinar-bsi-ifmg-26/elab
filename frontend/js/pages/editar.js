import { $ } from '../core/dom.js';
import { user } from '../core/state.js';
import { api } from '../core/api.js';
import { enviar } from '../core/forms.js';
import { montarCurriculo } from '../core/curriculo.js';
import { montarFoto } from '../core/foto.js';

export function editar() {
  const f = $('main form');
  ['nome', 'area', 'cidade', 'bio'].forEach(k => {
    if (f.elements[k]) f.elements[k].value = user[k] || '';
  });

  enviar(f, async d => {
    const atualizado = await api('/perfil', { method: 'PUT', body: d });
    Object.assign(user, atualizado);
    $('.ok', f).textContent = 'Perfil atualizado.';
    setTimeout(() => { location.href = 'perfil.html'; }, 900);
  });

  // A foto vale para qualquer tipo de usuário; o currículo só para colaboradora.
  montarFoto($('#foto'));
  if (user.tipo === 'colaboradora') montarCurriculo($('#curriculo'));
}
