import { esc } from './dom.js';
import { avatarHtml } from './avatar.js';

const ROTULOS = { habilidades: 'Habilidades', area: 'Área', nivel: 'Nível', preferencias: 'Preferências' };

const dataInscricao = d => {
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? '' : t.toLocaleDateString('pt-BR');
};

const selo = score => {
  if (typeof score !== 'number') return '';
  const nivel = score >= 75 ? 'alto' : score >= 50 ? 'medio' : 'baixo';
  return '<span class="badge-match ' + nivel + '">' + score + '% compatível</span>';
};

const barras = comp => Object.entries(comp || {}).map(([k, v]) =>
  '<div class="match-linha"><span>' + esc(ROTULOS[k] || k) + '</span>' +
  '<div class="match-barra"><i style="width:' + Number(v) + '%"></i></div>' +
  '<b>' + Number(v) + '%</b></div>'
).join('');

// Botao de download do curriculo; so aparece quando a candidata anexou um arquivo.
// O clique e tratado por delegacao na lista (pages/detalhe.js).
const botaoCurriculo = c =>
  c.curriculoNome
    ? '<button class="btn sm ghost" type="button" data-curriculo="' + esc(c.profissionalId) + '" ' +
      'title="' + esc('Baixar ' + c.curriculoNome) + '">Baixar currículo</button>'
    : '';

const candidata = c => {
  const faltantes = (c.faltantes || []).map(f => '<span class="chip">' + esc(f.nome || 'Habilidade') + '</span>').join('');
  const elim = (c.eliminatorias || []).map(e => esc(e.nome || 'Habilidade')).join(', ');
  const botao = botaoCurriculo(c);
  return '<article class="cand">' +
    '<header><span class="avatar cand-avatar">' + avatarHtml(c.nome, c.fotoUrl) + '</span><strong>' + esc(c.nome) + '</strong> ' + selo(c.score) + '</header>' +
    '<p class="mut">' + esc(c.email) + (dataInscricao(c.data_inscricao) ? ' | inscrita em ' + esc(dataInscricao(c.data_inscricao)) : '') + '</p>' +
    (c.mensagem ? '<p class="cand-msg">' + esc(c.mensagem) + '</p>' : '') +
    (elim ? '<p class="erro" role="note">Não tem requisito obrigatório: ' + elim + '</p>' : '') +
    barras(c.componentes) +
    (faltantes ? '<p class="mut">Habilidades que faltam:</p><div class="chips">' + faltantes + '</div>' : '') +
    (botao ? '<div class="cand-acoes">' + botao + '</div>' : '') +
    '</article>';
};

export const htmlCandidatas = lista =>
  lista.length
    ? lista.map(candidata).join('')
    : '<p class="mut">Nenhuma candidata inscrita nesta oportunidade ainda.</p>';
