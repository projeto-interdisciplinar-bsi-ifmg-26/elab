import { $, esc } from '../core/dom.js';
import { user } from '../core/state.js';
import { api } from '../core/api.js';
import { montarLista } from '../core/lista.js';

const ROTULO_STATUS = { pendente: 'Pendente', aprovada: 'Aprovada', rejeitada: 'Rejeitada' };

const htmlEmpresa = e => `
  <div class="inscricao-item">
    <div>
      <strong style="color:var(--roxo); font-size:1.05rem;">${esc(e.nome)}</strong>
      <p class="mut" style="margin:0.2rem 0; font-size:0.86rem;">CNPJ ${esc(e.cnpj)} | ${esc(e.email)}</p>
      ${e.statusAprovacao === 'rejeitada' && e.motivoRejeicao
        ? `<p class="mut" style="margin:0.2rem 0; font-size:0.86rem;">Motivo: ${esc(e.motivoRejeicao)}</p>`
        : ''}
    </div>
    <div class="acoes" style="margin:0;">
      <span class="status-badge status-${esc(e.statusAprovacao || 'pendente')}">${esc(ROTULO_STATUS[e.statusAprovacao] || e.statusAprovacao)}</span>
      <button type="button" class="btn sm" data-acao="aprovada" data-id="${Number(e.id)}">Aprovar</button>
      <button type="button" class="btn sm ghost" data-acao="rejeitada" data-id="${Number(e.id)}">Rejeitar</button>
    </div>
  </div>`;

export async function admin() {
  if (user.tipo !== 'admin') return void (location.href = 'feed.html');

  const listaEl = $('#lista');
  const erroEl = $('#admin-erro');
  const okEl = $('#admin-ok');
  let lista = null;

  const aviso = (el, msg) => {
    el.textContent = msg || '';
    if (msg) setTimeout(() => { el.textContent = ''; }, 5000);
  };

  const carregar = async () => {
    const empresas = await api('/admin/empresas');
    if (lista) return void lista.atualizar(empresas);
    lista = montarLista(listaEl, {
      itens: empresas,
      desenhar: htmlEmpresa,
      porPagina: 6,
      rotuloBusca: 'Buscar por nome ou CNPJ',
      busca: e => [e.nome, e.cnpj, e.email].join(' '),
      vazio: 'Nenhuma empresa encontrada com esses filtros.',
      filtros: [{
        chave: 'status', rotulo: 'Status',
        opcoes: Object.keys(ROTULO_STATUS).map(k => ({ valor: k, rotulo: ROTULO_STATUS[k] })),
        teste: (e, v) => e.statusAprovacao === v
      }]
    });
  };

  listaEl.addEventListener('click', async ev => {
    const btn = ev.target.closest('button[data-acao]');
    if (!btn) return;

    const status = btn.dataset.acao;
    const id = Number(btn.dataset.id);
    let motivo;
    if (status === 'rejeitada') {
      motivo = window.prompt('Motivo da rejeição:');
      if (motivo === null) return;
      if (!motivo.trim()) return void aviso(erroEl, 'Informe o motivo da rejeição.');
    }

    btn.disabled = true;
    try {
      await api('/admin/empresas/' + id + '/status', {
        method: 'PUT',
        body: status === 'rejeitada' ? { status, motivo: motivo.trim() } : { status }
      });
      aviso(okEl, status === 'aprovada' ? 'Empresa aprovada.' : 'Empresa rejeitada.');
      await carregar();
    } catch (x) {
      aviso(erroEl, x instanceof Error ? x.message : 'Não foi possível atualizar a empresa.');
      btn.disabled = false;
    }
  });

  await carregar();
}
