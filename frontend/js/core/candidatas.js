import { esc } from './dom.js';

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

const candidata = c => {
  const faltantes = (c.faltantes || []).map(f => '<span class="chip">' + esc(f.nome || 'Habilidade') + '</span>').join('');
  const elim = (c.eliminatorias || []).map(e => esc(e.nome || 'Habilidade')).join(', ');
  return '<article class="cand">' +
    '<header><strong>' + esc(c.nome) + '</strong> ' + selo(c.score) + '</header>' +
    '<p class="mut">' + esc(c.email) + (dataInscricao(c.data_inscricao) ? ' | inscrita em ' + esc(dataInscricao(c.data_inscricao)) : '') + '</p>' +
    (c.mensagem ? '<p class="cand-msg">' + esc(c.mensagem) + '</p>' : '') +
    (elim ? '<p class="erro" role="note">Não tem requisito obrigatório: ' + elim + '</p>' : '') +
    barras(c.componentes) +
    (faltantes ? '<p class="mut">Habilidades que faltam:</p><div class="chips">' + faltantes + '</div>' : '') +
    '</article>';
};

export const htmlCandidatas = lista =>
  lista.length
    ? lista.map(candidata).join('')
    : '<p class="mut">Nenhuma candidata inscrita nesta oportunidade ainda.</p>';
