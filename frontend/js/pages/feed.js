import { $, esc } from '../core/dom.js';
import { params, user } from '../core/state.js';
import { api } from '../core/api.js';
import { TIPOS, filtrar, dataBR, card, vazio } from '../core/render.js';

export async function feed() {
  const q = params.get('q') || '';
  const primeiroNome = user.nome.split(' ')[0] || user.nome;
  $('#ola').textContent = `Olá, ${primeiroNome}!`;

  const todas = await api('/oportunidades', { auth: false });
  const idDe = o => Number(o.id || o.idOportunidade);
  let scores = new Map();
  if (user.tipo === "colaboradora") {
    try {
      const ranking = await api("/match/vagas");
      scores = new Map(ranking.filter(r => r.requisitos.length > 0).map(r => [r.vagaId, r]));
    } catch {
      scores = new Map();
    }
  }
  const porCompatibilidade = lista => [...lista].sort((a, b) => (scores.get(idDe(b))?.score ?? -1) - (scores.get(idDe(a))?.score ?? -1));
  if (scores.size) $("#sub-saudacao").textContent = "Vagas ordenadas pela compatibilidade com o seu perfil.";
  let listaAtual = porCompatibilidade(filtrar(todas, q));

  const renderLista = itens => {
    const el = $('#lista');
    if (!itens.length) {
      el.innerHTML = vazio(q ? `Nenhuma publicação encontrada para "${q}".` : 'Ainda não há publicações nesta seção.');
    } else {
      el.innerHTML = itens.map(o => card(o, scores.get(idDe(o)))).join('');
    }
  };

  renderLista(listaAtual);

  const boxFiltros = $('#filtros-feed');
  if (boxFiltros) {
    boxFiltros.addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (!btn) return;
      boxFiltros.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
      const tipo = btn.dataset.tipo;
      const filtradas = tipo ? listaAtual.filter(o => o.tipo === tipo) : listaAtual;
      renderLista(filtradas);
    });
  }

  const destaques = todas.filter(o => o.tipo !== 'vaga').slice(0, 3);
  const elDestaques = $('#destaques');
  if (elDestaques) {
    elDestaques.innerHTML = destaques.length
      ? destaques.map(o => `
        <a class="card" href="detalhe.html?id=${Number(o.id || o.idOportunidade)}" style="padding: 0.85rem;">
          <div class="card-corpo">
            <span class="tag ${esc(o.tipo)}">${esc(TIPOS[o.tipo])}</span>
            <h4 style="margin: 0.2rem 0; font-size:0.98rem;">${esc(o.titulo)}</h4>
            <p class="mut" style="font-size:0.82rem; margin:0;">${esc(dataBR(o.data) || o.empresaNome)}</p>
          </div>
        </a>`).join('')
      : vazio('Nenhum evento em destaque no momento.');
  }
}
