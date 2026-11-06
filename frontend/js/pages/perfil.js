import { $, esc } from '../core/dom.js';
import { user } from '../core/state.js';
import { TIPOS } from '../core/render.js';

export function perfil() {
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

  const historico = JSON.parse(localStorage.getItem(`elab_inscricoes_${user.id}`) || '[]');
  const contagem = $('#contagem-inscricoes');
  const boxLista = $('#lista-inscricoes');

  if (contagem) contagem.textContent = `${historico.length} registrada${historico.length === 1 ? '' : 's'}`;

  if (boxLista && historico.length) {
    boxLista.innerHTML = historico.map(h => `
      <div class="inscricao-item">
        <div>
          <strong style="color:var(--roxo); font-size:1.05rem;">${esc(h.titulo)}</strong>
          <p class="mut" style="margin:0.2rem 0; font-size:0.86rem;">
            ${esc(TIPOS[h.tipo] || h.tipo)} | ${esc(h.empresa || 'Empresa')} | Registrada em ${esc(h.dataRegistro)}
          </p>
          <code style="font-size:0.8rem; color:var(--mut);">Protocolo: #${esc(h.protocolo)}</code>
        </div>
        <div>
          <span class="status-badge">Confirmada</span>
        </div>
      </div>
    `).join('');
  }
}
