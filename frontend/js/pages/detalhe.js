import { $, esc } from '../core/dom.js';
import { params, user } from '../core/state.js';
import { api } from '../core/api.js';
import { carregarMatch } from "../core/match.js";
import { htmlCandidatas } from '../core/candidatas.js';
import { montarLista } from '../core/lista.js';
import { TIPOS, dataBR } from '../core/render.js';

const temNota = c => typeof c.score === 'number';

// Candidaturas aparecem so para a empresa dona da oportunidade. Qualquer falha (ex: 403) devolve null e esconde o bloco.
const carregarCandidaturas = async (id) => {
  if (user.tipo !== 'empresa') return null;
  try {
    return await api('/oportunidades/' + Number(id) + '/candidatos');
  } catch {
    return null;
  }
};

const montarCandidaturas = (el, candidaturas) => {
  const comNota = candidaturas.some(temNota);
  const filtros = [];
  if (comNota) {
    filtros.push({
      chave: 'faixa', rotulo: 'Compatibilidade',
      opcoes: [
        { valor: 'alta', rotulo: 'Alta (75% ou mais)' },
        { valor: 'media', rotulo: 'Média (50% a 74%)' },
        { valor: 'baixa', rotulo: 'Baixa (abaixo de 50%)' }
      ],
      teste: (c, v) => temNota(c) && (v === 'alta' ? c.score >= 75 : v === 'media' ? c.score >= 50 && c.score < 75 : c.score < 50)
    });
    filtros.push({
      chave: 'obrigatorio', rotulo: 'Requisito obrigatório',
      opcoes: [
        { valor: 'faltando', rotulo: 'Está faltando' },
        { valor: 'ok', rotulo: 'Atendido' }
      ],
      teste: (c, v) => {
        const falta = (c.eliminatorias || []).length > 0;
        return v === 'faltando' ? falta : !falta;
      }
    });
  }
  montarLista(el, {
    itens: candidaturas,
    desenhar: c => htmlCandidatas([c]),
    porPagina: 5,
    classeItens: 'cand-lista',
    rotuloBusca: 'Buscar candidata por nome ou e-mail',
    busca: c => [c.nome, c.email].join(' '),
    vazio: 'Nenhuma candidata encontrada com esses filtros.',
    filtros
  });
};

export async function detalhe() {
  const id = params.get('id');
  if (!id) return void (location.href = 'feed.html');

  const o = await api('/oportunidades/' + encodeURIComponent(id), { auth: false });
  const vaga = o.tipo === 'vaga';
  const matchHtml = await carregarMatch(o, user);
  const candidaturas = await carregarCandidaturas(id);
  const candidaturasHtml = candidaturas
    ? `<section class="match-bloco" aria-label="Candidaturas">
      <h3>Candidaturas (${candidaturas.length})</h3>
      <div id="lista-candidaturas"></div>
    </section>`
    : '';
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

  if (candidaturas) montarCandidaturas($('#lista-candidaturas'), candidaturas);
}
