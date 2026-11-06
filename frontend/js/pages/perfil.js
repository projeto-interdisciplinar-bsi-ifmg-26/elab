import { $, esc } from '../core/dom.js';
import { user } from '../core/state.js';
import { api } from '../core/api.js';
import { montarLista } from '../core/lista.js';
import { TIPOS, dataBR } from '../core/render.js';

const nivelScore = s => (s >= 75 ? 'alto' : s >= 50 ? 'medio' : 'baixo');

const htmlInscricao = h => `
  <div class="inscricao-item">
    <div>
      <strong style="color:var(--roxo); font-size:1.05rem;">${esc(h.titulo)}</strong>
      <p class="mut" style="margin:0.2rem 0; font-size:0.86rem;">
        ${esc(TIPOS[h.tipo] || h.tipo)} | ${esc(h.empresaNome || 'Empresa')} | Registrada em ${esc(dataBR(String(h.dataInscricao || '').slice(0, 10)))}
      </p>
      <code style="font-size:0.8rem; color:var(--mut);">Protocolo: #${esc(h.protocolo)}</code>
    </div>
    <div>
      ${typeof h.score === 'number'
        ? `<span class="badge-match ${nivelScore(h.score)}" title="Compatibilidade com o seu perfil">${h.score}% compatível</span>`
        : '<span class="status-badge">Confirmada</span>'}
    </div>
  </div>`;

const carregarHistorico = async () => {
  const contagem = $('#contagem-inscricoes');
  const boxLista = $('#lista-inscricoes');
  if (!boxLista) return;

  let historico;
  try {
    historico = await api('/oportunidades/minhas-inscricoes');
  } catch {
    boxLista.innerHTML = '<div class="vazio"><p class="mut">Não foi possível carregar seu histórico agora.</p></div>';
    return;
  }

  if (contagem) contagem.textContent = `${historico.length} registrada${historico.length === 1 ? '' : 's'}`;
  if (!historico.length) return;

  montarLista(boxLista, {
    itens: historico,
    desenhar: htmlInscricao,
    porPagina: 5,
    classeItens: 'inscricoes-lista',
    rotuloBusca: 'Buscar por título, empresa ou protocolo',
    busca: h => [h.titulo, h.empresaNome, h.protocolo].join(' '),
    vazio: 'Nenhuma inscrição encontrada com esses filtros.',
    filtros: [{
      chave: 'tipo', rotulo: 'Tipo',
      opcoes: Object.keys(TIPOS).map(t => ({ valor: t, rotulo: TIPOS[t] })),
      teste: (h, v) => h.tipo === v
    }]
  });
};

export async function perfil() {
  $('#avatar-grande').textContent = (user.nome[0] || 'U').toUpperCase();
  $('#perfil-nome').textContent = user.nome;
  $('#perfil-email').textContent = user.email;
  $('#perfil-tag-tipo').textContent = user.tipo === 'empresa' ? 'Empresa' : 'Profissional';

  const linhas = [
    ['Nome completo', user.nome],
    ['E-mail', user.email],
    ['Tipo de perfil', user.tipo === 'empresa' ? 'Corporativo / Empresa' : 'Individual / Colaboradora'],
    ['Área de atuação', user.area || 'Não informada'],
    ['Cidade / Localização', user.cidade || 'Não informada'],
    ['Sobre / Apresentação', user.bio || 'Nenhuma descrição adicionada.']
  ];
  $('#dados').innerHTML = linhas.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');

  if (user.tipo !== 'colaboradora') {
    const secao = $('#secao-inscricoes');
    if (secao) secao.hidden = true;
    return;
  }
  await carregarHistorico();
}