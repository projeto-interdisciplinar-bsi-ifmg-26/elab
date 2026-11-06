import { $, esc } from './dom.js';
import { params, user } from './state.js';
import { sair } from './api.js';

export function shell() {
  const page = document.body.dataset.page;
  const itens = [
    ['feed.html', 'Feed', 'feed', '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-6h-4v6H4a1 1 0 0 1-1-1z"/>'],
    ['vagas.html', 'Vagas', 'vagas', '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/>'],
    ['oportunidades.html', 'Eventos e bolsas', 'oportunidades', '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M8 14h3M8 17h7"/>'],
    ['perfil.html', 'Meu perfil', 'perfil', '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>']
  ];

  if (user && user.tipo === 'empresa') {
    itens.push(['painel-empresa.html', 'Publicações da empresa', 'empresa', '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/>']);
  }

  const main = $('main');
  if (!main) return;

  const topo = document.createElement('header');
  topo.className = 'topbar';
  topo.innerHTML = `
    <button class="icone" id="menu" aria-label="Abrir ou recolher menu lateral" aria-expanded="false" aria-controls="lateral" title="Menu lateral"><span class="menu-glyph" aria-hidden="true"><i></i><i></i><i></i></span></button>
    <a class="logo" href="feed.html" aria-label="ELAB, ir ao feed"><img src="img/logo-elab-oficial.png" alt="" width="460" height="176"></a>
    <form class="busca" id="busca" role="search">
      <svg class="busca-icone" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg>
      <input name="q" placeholder="Pesquisar" aria-label="Buscar vagas, eventos ou empresas" value="${esc(params.get('q') || '')}">
    </form>
    <a class="avatar" href="perfil.html" title="Meu Perfil (${esc(user.nome)})" aria-label="Acessar perfil de ${esc(user.nome)}">
      ${esc((user.nome[0] || 'U').toUpperCase())}
    </a>`;

  const lat = document.createElement('aside');
  lat.className = 'lateral';
  lat.id = 'lateral';
  lat.innerHTML = `
    <nav aria-label="Navegação principal">
      <span class="nav-label">Navegação</span>
      ${itens.map(([h, t, k, icon]) => `
        <a href="${h}" class="${k === page ? 'ativo' : ''}" title="${t}" aria-label="${t}">
          <span class="lateral-icone" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icon}</svg></span>
          <span class="rot">${t}</span>
        </a>
      `).join('')}
    </nav>
    <button class="sair" id="sair" title="Encerrar sessão no ELAB" aria-label="Sair">
      <span class="lateral-icone" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/></svg></span>
      <span class="rot">Sair</span>
    </button>`;

  const corpo = document.createElement('div');
  corpo.className = 'corpo';
  main.replaceWith(corpo);
  corpo.append(lat, main);
  document.body.prepend(topo);

  const menu = $('#menu');
  const breakpointMenu = window.matchMedia('(max-width: 820px)');
  const setLateral = aberta => {
    lat.classList.toggle('aberta', aberta);
    menu.setAttribute('aria-expanded', String(aberta));
    lat.inert = breakpointMenu.matches && !aberta;
    corpo.classList.toggle('menu-aberto', !breakpointMenu.matches && aberta);
    if (!breakpointMenu.matches) localStorage.setItem('elab_lateral', aberta ? '1' : '0');
  };

  setLateral(!breakpointMenu.matches && localStorage.getItem('elab_lateral') === '1');
  breakpointMenu.addEventListener('change', () => setLateral(false));

  menu.addEventListener('click', () => setLateral(!lat.classList.contains('aberta')));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && breakpointMenu.matches && lat.classList.contains('aberta')) {
      setLateral(false);
      menu.focus();
    }
  });

  $('#busca').addEventListener('submit', e => {
    e.preventDefault();
    const q = String(new FormData(e.target).get('q') || '').trim();
    location.href = 'feed.html?q=' + encodeURIComponent(q);
  });

  const btnSair = $('#sair');
  btnSair?.addEventListener('click', sair);
}
