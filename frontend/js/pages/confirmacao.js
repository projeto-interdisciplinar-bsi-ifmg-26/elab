import { $ } from '../core/dom.js';

export function confirmacao() {
  const r = JSON.parse(sessionStorage.getItem('elab_conf') || 'null');
  if (!r || !r.oportunidade) return void (location.href = 'feed.html');

  const vaga = r.oportunidade.tipo === 'vaga';
  $('#msg-titulo').textContent = vaga ? 'Candidatura registrada' : 'Inscrição registrada';
  $('#conf-titulo').textContent = r.oportunidade.titulo;
  $('#conf-protocolo').textContent = '#' + r.protocolo;
}
