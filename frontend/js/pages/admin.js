import { $, esc } from '../core/dom.js';
import { user } from '../core/state.js';
import { api } from '../core/api.js';
import { montarLista } from '../core/lista.js';
import { TIPOS, dataBR, ROTULO_MODERACAO } from '../core/render.js';

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

const htmlPublicacao = o => `
  <div class="inscricao-item">
    <div>
      <span class="tag ${esc(o.tipo)}" style="margin-right:0.4rem;">${esc(TIPOS[o.tipo] || o.tipo)}</span>
      <strong style="color:var(--roxo); font-size:1.05rem;">${esc(o.titulo)}</strong>
      <p class="mut" style="margin:0.2rem 0; font-size:0.86rem;">${esc(o.empresaNome || 'Empresa')}${o.local ? ' | ' + esc(o.local) : ''}${o.data ? ' | ' + esc(dataBR(o.data)) : ''}</p>
      ${o.descricao ? `<p class="mut" style="margin:0.2rem 0; font-size:0.86rem;">${esc(o.descricao.slice(0, 180))}${o.descricao.length > 180 ? '…' : ''}</p>` : ''}
      ${o.status_moderacao === 'rejeitada' && o.motivo_moderacao
        ? `<p class="mut" style="margin:0.2rem 0; font-size:0.86rem;">Motivo: ${esc(o.motivo_moderacao)}</p>`
        : ''}
    </div>
    <div class="acoes" style="margin:0;">
      <span class="status-badge status-${esc(o.status_moderacao || 'pendente')}">${esc(ROTULO_MODERACAO[o.status_moderacao] || o.status_moderacao)}</span>
      <button type="button" class="btn sm" data-acao="aprovada" data-id="${Number(o.id)}">Aprovar</button>
      <button type="button" class="btn sm ghost" data-acao="rejeitada" data-id="${Number(o.id)}">Rejeitar</button>
      <a class="btn sm secundario" href="detalhe.html?id=${Number(o.id)}">Ver</a>
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

  // ---- Aba de publicações ----
  const listaPubEl = $('#lista-publicacoes');
  if (!listaPubEl) return;

  let listaPub = null;
  const carregarPublicacoes = async () => {
    const publicacoes = await api('/admin/oportunidades');
    if (listaPub) return void listaPub.atualizar(publicacoes);
    listaPub = montarLista(listaPubEl, {
      itens: publicacoes,
      desenhar: htmlPublicacao,
      porPagina: 6,
      rotuloBusca: 'Buscar por título, empresa ou local',
      busca: o => [o.titulo, o.empresaNome, o.local, o.tipo].join(' '),
      vazio: 'Nenhuma publicação encontrada com esses filtros.',
      filtros: [{
        chave: 'status', rotulo: 'Moderação',
        opcoes: Object.keys(ROTULO_MODERACAO).map(k => ({ valor: k, rotulo: ROTULO_MODERACAO[k] })),
        teste: (o, v) => o.status_moderacao === v
      }, {
        chave: 'tipo', rotulo: 'Tipo',
        opcoes: Object.keys(TIPOS).map(t => ({ valor: t, rotulo: TIPOS[t] })),
        teste: (o, v) => o.tipo === v
      }]
    });
  };

  listaPubEl.addEventListener('click', async ev => {
    const btn = ev.target.closest('button[data-acao]');
    if (!btn) return;

    const status = btn.dataset.acao;
    const id = Number(btn.dataset.id);
    let motivo;
    if (status === 'rejeitada') {
      motivo = window.prompt('Motivo da rejeição da publicação:');
      if (motivo === null) return;
      if (!motivo.trim()) return void aviso(erroEl, 'Informe o motivo da rejeição.');
    }

    btn.disabled = true;
    try {
      await api('/admin/oportunidades/' + id + '/moderacao', {
        method: 'PUT',
        body: status === 'rejeitada' ? { status, motivo: motivo.trim() } : { status }
      });
      aviso(okEl, status === 'aprovada' ? 'Publicação aprovada.' : 'Publicação rejeitada.');
      await carregarPublicacoes();
    } catch (x) {
      aviso(erroEl, x instanceof Error ? x.message : 'Não foi possível moderar a publicação.');
      btn.disabled = false;
    }
  });

  // Alternância entre as abas; a de publicações carrega na primeira vez.
  const abas = [...document.querySelectorAll('[data-aba]')];
  const abaEmpresas = $('#aba-empresas');
  const abaPub = $('#aba-publicacoes');
  let publicacoesCarregadas = false;
  for (const aba of abas) {
    aba.addEventListener('click', async () => {
      const ativa = aba.dataset.aba;
      for (const b of abas) {
        b.setAttribute('aria-selected', String(b.dataset.aba === ativa));
        b.classList.toggle('secundario', b.dataset.aba !== ativa);
      }
      abaEmpresas.hidden = ativa !== 'empresas';
      abaPub.hidden = ativa !== 'publicacoes';
      if (ativa === 'publicacoes' && !publicacoesCarregadas) {
        publicacoesCarregadas = true;
        try {
          await carregarPublicacoes();
        } catch (x) {
          publicacoesCarregadas = false;
          aviso(erroEl, x instanceof Error ? x.message : 'Não foi possível carregar as publicações.');
        }
      }
    });
  }
}
