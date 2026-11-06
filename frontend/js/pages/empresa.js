import { $ } from '../core/dom.js';
import { user } from '../core/state.js';
import { api } from '../core/api.js';
import { enviar } from '../core/forms.js';
import { card, vazio } from '../core/render.js';
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

  const carregar = async () => {
    const minhas = await api('/oportunidades/minhas');
    $('#lista').innerHTML = minhas.length
      ? minhas.map(o => card(o)).join('')
      : vazio('Sua empresa ainda não publicou nenhuma oportunidade.');
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
