import { $, esc } from '../core/dom.js';
import { params, user } from '../core/state.js';
import { api } from '../core/api.js';
import { carregarMatch } from "../core/match.js";
import { htmlCandidatas } from '../core/candidatas.js';
import { TIPOS, dataBR } from '../core/render.js';

// Candidaturas aparecem so para a empresa dona da oportunidade. Qualquer falha (ex: 403) esconde o bloco.
const carregarCandidaturas = async (id) => {
  if (user.tipo !== 'empresa') return '';
  try {
    const lista = await api('/oportunidades/' + Number(id) + '/candidatos');
    return `<section class="match-bloco" aria-label="Candidaturas">
      <h3>Candidaturas (${lista.length})</h3>
      ${htmlCandidatas(lista)}
    </section>`;
  } catch {
    return '';
  }
};

export async function detalhe() {
  const id = params.get('id');
  if (!id) return void (location.href = 'feed.html');

  const o = await api('/oportunidades/' + encodeURIComponent(id), { auth: false });
  const vaga = o.tipo === 'vaga';
  const matchHtml = await carregarMatch(o, user);
  const candidaturasHtml = await carregarCandidaturas(id);
  let acao = '';
  if (user.tipo === 'colaboradora') {
    acao = `<a class="btn" href="inscricao.html?id=${Number(id)}">${vaga ? 'Candidatar-se à vaga' : 'Fazer inscrição'}</a>`;
  }

  $('#conteudo').innerHTML = `
    <div style="display:flex; align-items:center; gap:0.6rem; margin-bottom:0.75rem;">
      <span class="tag ${esc(o.tipo)}">${esc(TIPOS[o.tipo] || o.tipo)}</span>
      <span class="status-badge">Disponível</span>
    </div>
    <h1 style="margin-bottom:0.5rem;">${esc(o.titulo)}</h1>
    <p class="mut" style="font-size:1.05rem; margin-bottom:1.25rem;">Publicada por <strong>${esc(o.empresaNome || 'Instituição parceira')}</strong></p>

    <dl>
      <dt>Local / Modalidade</dt>
      <dd>${esc(o.local || 'A definir / Remoto')}</dd>
      ${o.data ? `<dt>Data prevista</dt><dd>${esc(dataBR(o.data))}</dd>` : ''}
      <dt>Sobre a oportunidade</dt>
      <dd style="white-space: pre-line;">${esc(o.descricao || 'Sem descrição adicional fornecida.')}</dd>
    </dl>

    <h3 style="margin-top:1.5rem;">Habilidades e conhecimentos</h3>
    <div class="chips" style="margin-bottom:2rem;">
      ${(o.habilidades && o.habilidades.length)
        ? o.habilidades.map(h => `<span class="chip" style="font-size:0.9rem; padding:0.25rem 0.8rem;">${esc(h)}</span>`).join('')
        : '<span class="mut">A organização não informou requisitos específicos.</span>'}
    </div>

    ${matchHtml}
    ${candidaturasHtml}
    <div style="border-top:1px solid var(--borda); padding-top:1.5rem; display:flex; gap:1rem; align-items:center; flex-wrap:wrap;">
      ${acao}
      <a class="btn ghost" href="feed.html">Voltar ao feed</a>
    </div>`;
}
