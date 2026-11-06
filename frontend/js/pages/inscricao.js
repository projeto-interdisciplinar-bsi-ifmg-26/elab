import { $ } from '../core/dom.js';
import { params } from '../core/state.js';
import { api } from '../core/api.js';
import { enviar } from '../core/forms.js';
import { TIPOS } from '../core/render.js';

export async function inscricao() {
  const id = params.get('id');
  if (!id) return void (location.href = 'feed.html');

  const o = await api('/oportunidades/' + encodeURIComponent(id), { auth: false });
  const vaga = o.tipo === 'vaga';

  $('#titulo').textContent = vaga ? 'Candidatura para Vaga' : 'Inscrição para Oportunidade';
  $('#resumo-titulo').textContent = o.titulo;
  $('#resumo-meta').textContent = [TIPOS[o.tipo] || o.tipo, o.empresaNome, o.local || 'Remoto'].filter(Boolean).join(' | ');
  $('#enviar').textContent = vaga ? 'Enviar candidatura' : 'Fazer inscrição';

  enviar($('main form'), async d => {
    const mensagem = [d.mensagem.trim(), d.link && `Portfólio: ${d.link.trim()}`].filter(Boolean).join('\n\n');
    if (mensagem.length > 500) {
      throw new Error('A mensagem e o link juntos devem ter no máximo 500 caracteres.');
    }

    const r = await api(`/oportunidades/${encodeURIComponent(id)}/inscricoes`, {
      method: 'POST',
      body: { mensagem }
    });

    sessionStorage.setItem('elab_conf', JSON.stringify(r));
    location.href = 'confirmacao.html';
  });
}