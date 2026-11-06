import { $, esc } from '../core/dom.js';
import { user } from '../core/state.js';
import { api } from '../core/api.js';
import { enviar } from '../core/forms.js';
import { card, vazio } from '../core/render.js';
import { montarBlocoVaga } from '../core/vagaForm.js';
import { htmlCandidatas } from '../core/candidatas.js';

const CAMPOS_VAGA = ['areaId', 'nivel', 'modalidade', 'salario_min', 'salario_max'];

const itemVaga = o => {
  const id = Number(o.id || o.idOportunidade);
  return '<div class="item-vaga">' + card(o) +
    '<div class="item-acoes"><button type="button" class="btn sm secundario" data-candidatas="' + id +
    '" data-titulo="' + esc(o.titulo) + '">Ver candidatas</button></div></div>';
};

export async function empresa() {
  if (user.tipo !== 'empresa') return void (location.href = 'feed.html');

  const f = $('main form');
  const blocoEl = $('#bloco-vaga');
  const lista = $('#lista');

  const painelCand = document.createElement('section');
  painelCand.className = 'painel';
  painelCand.id = 'candidatas';
  painelCand.hidden = true;
  lista.insertAdjacentElement('afterend', painelCand);

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
    lista.innerHTML = minhas.length
      ? minhas.map(itemVaga).join('')
      : vazio('Sua empresa ainda não publicou nenhuma oportunidade.');
  };

  lista.addEventListener('click', async e => {
    const botao = e.target.closest('[data-candidatas]');
    if (!botao) return;
    painelCand.hidden = false;
    painelCand.innerHTML = '<p class="mut">Carregando candidatas...</p>';
    painelCand.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    try {
      const candidatas = await api('/oportunidades/' + Number(botao.dataset.candidatas) + '/candidatos');
      painelCand.innerHTML = '<h3>Candidatas: ' + esc(botao.dataset.titulo) + '</h3>' + htmlCandidatas(candidatas);
    } catch (x) {
      painelCand.innerHTML = '<p class="erro">' + esc(x instanceof Error ? x.message : 'Não foi possível carregar as candidatas.') + '</p>';
    }
  });

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
