(() => {
  const API = 'http://localhost:3000/api/v1';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const token = () => localStorage.getItem('elab_token');
  const normalizarTexto = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const TIPOS = { vaga: 'Vaga', evento: 'Evento', palestra: 'Palestra', bolsa: 'Bolsa de estudo' };
  const params = new URLSearchParams(location.search);
  const PUBLICAS = ['index', 'login', 'registro'];
  let user = null;

  /* Mock store de fallback quando o backend estiver offline ou executado estaticamente */
  const MOCK_OPORTUNIDADES = [
    { id: 1, empresaId: 1, empresaNome: 'Tech Sabará', tipo: 'vaga', titulo: 'Dev Front-end Jr.', status: 'ativo', local: 'Remoto', data: '', descricao: 'Desenvolvimento de interfaces web com HTML, CSS, JavaScript e React em equipe multidisciplinar ágil.', habilidades: ['javascript', 'react', 'css', 'git'] },
    { id: 2, empresaId: 1, empresaNome: 'Tech Sabará', tipo: 'evento', titulo: 'Workshop de UX & UI Design', status: 'agendado', local: 'Online / Ao vivo', data: '2026-10-25', descricao: 'Oficina prática de pesquisa de usuários, prototipação rápida e design inclusivo.', habilidades: ['ux design', 'figma', 'acessibilidade'] },
    { id: 3, empresaId: 1, empresaNome: 'Tech Sabará', tipo: 'vaga', titulo: 'Analista de Dados Jr.', status: 'ativo', local: 'Belo Horizonte, MG (Híbrido)', data: '', descricao: 'Extração, tratamento de dados, criação de dashboards e apoio a tomadas de decisão.', habilidades: ['sql', 'python', 'power bi'] },
    { id: 4, empresaId: 1, empresaNome: 'Tech Sabará', tipo: 'palestra', titulo: 'Mulheres Líderes na Tecnologia', status: 'agendado', local: 'Auditório IFMG Sabará', data: '2026-11-05', descricao: 'Profissionais de destaque compartilham seus caminhos de carreira, desafios e dicas.', habilidades: ['liderança', 'carreira'] },
    { id: 5, empresaId: 1, empresaNome: 'Tech Sabará', tipo: 'bolsa', titulo: 'Bolsa em Desenvolvimento Web Full Stack', status: 'ativo', local: 'Remoto', data: '2026-12-01', descricao: 'Bolsa 100% integral para capacitação intensiva em front-end e back-end com mentoria.', habilidades: ['html', 'css', 'javascript', 'node'] },
    { id: 6, empresaId: 1, empresaNome: 'Tech Sabará', tipo: 'vaga', titulo: 'Estágio em Back-end Node.js', status: 'ativo', local: 'Híbrido - Sabará, MG', data: '', descricao: 'Oportunidade de estágio com foco em desenvolvimento de APIs REST, banco de dados e mentoria contínua.', habilidades: ['node.js', 'sql', 'express'] }
  ];

  async function api(path, { method = 'GET', body, auth = true } = {}) {
    // if (token()?.startsWith('mock_jwt_token_') && !path.startsWith('/auth/')) {
    //   return mockFallback(path, method, body);
    // }

    const headers = {};
    if (body) headers['Content-Type'] = 'application/json';
    if (auth && token()) headers.Authorization = 'Bearer ' + token();

    let res;
    try {
      res = await fetch(API + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    } catch (err) {
      if (err instanceof TypeError) {
        throw new Error('Não foi possível conectar ao serviço. Verifique sua conexão e tente novamente.');
      }
      throw err;
    }

    if (res.status === 401 && auth) {
      sair();
      throw new Error('Sua sessão terminou. Entre novamente.');
    }

    let json;
    try {
      json = await res.json();
    } catch {
      if (res.ok) throw new Error('O servidor retornou uma resposta inválida.');
    }
    if (!res.ok || !json?.sucesso) {
      throw new Error(json?.erro || 'Não foi possível concluir a solicitação.');
    }
    return json.dados;
  }

  /* Provedor de fallback em memória / localStorage para teste independente */
  function mockFallback(path, method, body) {
    let mockOps = JSON.parse(localStorage.getItem('elab_mock_ops') || 'null');
    if (!mockOps) {
      mockOps = MOCK_OPORTUNIDADES;
      localStorage.setItem('elab_mock_ops', JSON.stringify(mockOps));
    }

    if (path === '/auth/login' && method === 'POST') {
      const fakeToken = 'mock_jwt_token_' + Date.now();
      const tipo = body.email.includes('empresa') ? 'empresa' : 'colaboradora';
      const fakeUser = {
        id: tipo === 'empresa' ? 1 : 2,
        nome: tipo === 'empresa' ? 'Tech Sabará' : 'Ana Souza',
        email: body.email,
        tipo,
        area: tipo === 'empresa' ? 'Recrutamento & TI' : 'Desenvolvimento Front-end',
        cidade: 'Sabará, MG',
        bio: tipo === 'empresa' ? 'Empresa de tecnologia focada em inovação e diversidade.' : 'Estudante e entusiasta de tecnologia apaixonada por criar interfaces acessíveis.'
      };
      localStorage.setItem('elab_mock_user', JSON.stringify(fakeUser));
      return { token: fakeToken, usuario: fakeUser };
    }

    if (path === '/auth/registrar' && method === 'POST') {
      const fakeUser = {
        id: Date.now(),
        nome: body.nome,
        email: body.email,
        tipo: body.tipo,
        area: '',
        cidade: 'Sabará, MG',
        bio: ''
      };
      localStorage.setItem('elab_mock_user', JSON.stringify(fakeUser));
      return { usuario: fakeUser };
    }

    if (path === '/perfil') {
      if (method === 'GET') {
        const u = JSON.parse(localStorage.getItem('elab_mock_user') || 'null') || {
          id: 2, nome: 'Ana Souza', email: 'colab@elab.com', tipo: 'colaboradora', area: 'Front-end', cidade: 'Sabará, MG', bio: 'Entusiasta de desenvolvimento web.'
        };
        return u;
      }
      if (method === 'PUT') {
        const u = JSON.parse(localStorage.getItem('elab_mock_user') || 'null') || {};
        Object.assign(u, body);
        localStorage.setItem('elab_mock_user', JSON.stringify(u));
        return u;
      }
    }

    if (path.startsWith('/oportunidades') && method === 'GET') {
      const urlParts = path.split('?');
      const basePath = urlParts[0];
      const match = basePath.match(/\/oportunidades\/(\d+)/);
      if (match) {
        const id = Number(match[1]);
        const found = mockOps.find(o => o.id === id);
        if (!found) throw new Error('Oportunidade não encontrada.');
        return found;
      }
      const p = new URLSearchParams(urlParts[1] || '');
      const tipoFiltro = p.get('tipo');
      if (tipoFiltro) return mockOps.filter(o => o.tipo === tipoFiltro);
      return mockOps;
    }

    if (path.includes('/inscricoes') && method === 'POST') {
      const match = path.match(/\/oportunidades\/(\d+)\/inscricoes/);
      const id = match ? Number(match[1]) : 1;
      const op = mockOps.find(o => o.id === id) || { id, titulo: 'Oportunidade ELAB', tipo: 'vaga' };
      const protocolo = Math.floor(100000 + Math.random() * 900000);
      return { protocolo, oportunidade: op, mensagem: body?.mensagem || '' };
    }

    if (path === '/oportunidades' && method === 'POST') {
      const nova = {
        id: Date.now(),
        empresaId: user?.id || 1,
        empresaNome: user?.nome || 'Minha Empresa',
        titulo: body.titulo,
        tipo: body.tipo,
        descricao: body.descricao || '',
        local: body.local || 'Remoto',
        data: body.data || '',
        habilidades: body.habilidades || [],
        status: 'ativo'
      };
      mockOps.unshift(nova);
      localStorage.setItem('elab_mock_ops', JSON.stringify(mockOps));
      return nova;
    }

    throw new Error('Esta operação não está disponível no modo de demonstração.');
  }

  function sair() {
    localStorage.removeItem('elab_token');
    localStorage.removeItem('elab_mock_user');
    localStorage.removeItem('elab_lateral');
    localStorage.removeItem('elab_mock_ops');
    location.href = 'login.html';
  }

  const erro = (form, msg) => {
    const el = $('.erro', form);
    if (el) el.textContent = msg || '';
  };

  const dados = form => Object.fromEntries(new FormData(form));

  const enviar = (form, fn) => {
    if (!form) return;
    form.addEventListener('submit', async e => {
      e.preventDefault();
      erro(form, '');
      const btn = $('button[type=submit]', form);
      const textoOriginal = btn ? btn.textContent : '';
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Processando...';
      }
      try {
        await fn(dados(form));
      } catch (x) {
        erro(form, x instanceof Error ? x.message : 'Não foi possível concluir a solicitação.');
        if (btn) {
          btn.disabled = false;
          btn.textContent = textoOriginal;
        }
      }
    });
  };

  const filtrar = (lista, q) => {
    if (!q) return lista;
    const termo = normalizarTexto(q.trim());
    return lista.filter(o =>
      normalizarTexto([o.titulo, o.empresaNome, o.local, o.tipo, ...(o.habilidades || [])].join(' ')).includes(termo)
    );
  };

  const dataBR = d => (d ? d.split('-').reverse().join('/') : '');

  const card = o => {
    const id = o.id || o.idOportunidade;
    const tipo = o.tipo || 'vaga';
    return `<a class="card" href="detalhe.html?id=${Number(id)}" data-tipo="${esc(tipo)}">
      <div class="card-corpo">
        <span class="tag ${esc(tipo)}" data-tipo="${esc(tipo)}">${esc(TIPOS[tipo] || tipo)}</span>
        <h3>${esc(o.titulo)}</h3>
        <p class="mut">${esc([o.empresaNome || 'Empresa', o.local].filter(Boolean).join(' | '))}</p>
        ${o.data ? `<p class="mut" style="font-size:0.85rem;">Data: ${esc(dataBR(o.data))}</p>` : ''}
        <div class="chips">
          ${(o.habilidades || []).map(h => `<span class="chip">${esc(h)}</span>`).join('')}
        </div>
      </div>
    </a>`;
  };

  const vazio = msg => `
    <div class="vazio">
      <p>${esc(msg)}</p>
    </div>`;

  /* ---------- Shell Global (Topbar + Sidebar Lateral) ---------- */
  function shell() {
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

  /* ---------- Controladores por Página ---------- */
  const paginas = {
    login() {
      let contaDemo = null;
      const btnOlho = $('#btn-toggle-senha');
      const campoSenha = $('#campo-senha');
      if (btnOlho && campoSenha) {
        btnOlho.addEventListener('click', () => {
          const visivel = campoSenha.type === 'text';
          campoSenha.type = visivel ? 'password' : 'text';
          btnOlho.textContent = visivel ? 'Mostrar' : 'Ocultar';
          btnOlho.setAttribute('aria-label', visivel ? 'Mostrar senha' : 'Ocultar senha');
        });
      }

      const demoColab = $('#demo-colab');
      const demoEmpresa = $('#demo-empresa');
      const escolherContaDemo = (tipo, email) => {
        contaDemo = tipo;
        $('#campo-email').value = email;
        $('#campo-senha').value = 'senha12345';
        demoColab?.setAttribute('aria-pressed', String(tipo === 'colaboradora'));
        demoEmpresa?.setAttribute('aria-pressed', String(tipo === 'empresa'));
      };

      demoColab?.addEventListener('click', () => escolherContaDemo('colaboradora', 'colab@elab.com'));
      demoEmpresa?.addEventListener('click', () => escolherContaDemo('empresa', 'empresa@elab.com'));
      $('#form-login')?.addEventListener('input', e => {
        if (!contaDemo || !e.target.matches('#campo-email, #campo-senha')) return;
        contaDemo = null;
        demoColab?.setAttribute('aria-pressed', 'false');
        demoEmpresa?.setAttribute('aria-pressed', 'false');
      });

      const modal = $('#modal-esqueci');
      const linkEsqueci = $('#link-esqueci');
      const fecharModal = $('#fechar-modal');
      linkEsqueci?.addEventListener('click', e => {
        e.preventDefault();
        if (!modal) return;
        modal.hidden = false;
        fecharModal?.focus();
      });
      fecharModal?.addEventListener('click', () => {
        if (!modal) return;
        modal.hidden = true;
        linkEsqueci?.focus();
      });
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && modal && !modal.hidden) {
          modal.hidden = true;
          linkEsqueci?.focus();
        } else if (e.key === 'Tab' && modal && !modal.hidden) {
          e.preventDefault();
          fecharModal?.focus();
        }
      });

      enviar($('#form-login'), async d => {
        const r = contaDemo
          ? mockFallback('/auth/login', 'POST', d)
          : await api('/auth/login', { method: 'POST', body: d, auth: false });
        localStorage.setItem('elab_token', r.token);
        location.href = 'feed.html';
      });
    },

    registro() {
      $$('.btn-olho').forEach(b => {
        b.addEventListener('click', () => {
          const alvo = $('#' + b.dataset.alvo);
          if (alvo) {
            const visivel = alvo.type === 'text';
            alvo.type = visivel ? 'password' : 'text';
            b.textContent = visivel ? 'Mostrar' : 'Ocultar';
            b.setAttribute('aria-label', visivel ? 'Mostrar senha' : 'Ocultar senha');
          }
        });
      });

      enviar($('#form-registro'), async d => {
        if (d.senha !== d.confirmar_senha) {
          throw new Error('As senhas digitadas não coincidem.');
        }
        if (d.senha.length < 8) {
          throw new Error('A senha precisa ter pelo menos 8 caracteres.');
        }

        const nome = [d.nome, d.sobrenome].map(s => s?.trim()).filter(Boolean).join(' ');
        await api('/auth/registrar', {
          method: 'POST',
          auth: false,
          body: { nome, email: d.email, senha: d.senha, tipo: d.tipo }
        });

        const r = await api('/auth/login', { method: 'POST', auth: false, body: { email: d.email, senha: d.senha } });
        localStorage.setItem('elab_token', r.token);
        location.href = 'feed.html';
      });
    },

    async feed() {
      const q = params.get('q') || '';
      const primeiroNome = user.nome.split(' ')[0] || user.nome;
      $('#ola').textContent = `Olá, ${primeiroNome}!`;

      const todas = await api('/oportunidades', { auth: false });
      let listaAtual = filtrar(todas, q);

      const renderLista = itens => {
        const el = $('#lista');
        if (!itens.length) {
          el.innerHTML = vazio(q ? `Nenhuma publicação encontrada para "${q}".` : 'Ainda não há publicações nesta seção.');
        } else {
          el.innerHTML = itens.map(card).join('');
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
            <a class="card" href="detalhe.html?id=${Number(o.id)}" style="padding: 0.85rem;">
              <div class="card-corpo">
                <span class="tag ${esc(o.tipo)}">${esc(TIPOS[o.tipo])}</span>
                <h4 style="margin: 0.2rem 0; font-size:0.98rem;">${esc(o.titulo)}</h4>
                <p class="mut" style="font-size:0.82rem; margin:0;">${esc(dataBR(o.data) || o.empresaNome)}</p>
              </div>
            </a>`).join('')
          : vazio('Nenhum evento em destaque no momento.');
      }
    },

    async vagas() {
      const q = params.get('q') || '';
      const todas = await api('/oportunidades?tipo=vaga', { auth: false });
      let filtradas = filtrar(todas, q);

      const render = itens => {
        const el = $('#lista');
        el.innerHTML = itens.length ? itens.map(card).join('') : vazio(q ? `Nenhuma vaga encontrada para "${q}".` : 'Nenhuma vaga cadastrada no momento.');
      };

      render(filtradas);

      const boxMod = $('#filtros-modalidade');
      if (boxMod) {
        boxMod.addEventListener('click', e => {
          const b = e.target.closest('button');
          if (!b) return;
          boxMod.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', 'false'));
          b.setAttribute('aria-pressed', 'true');
          const mod = b.dataset.mod;
          const res = mod ? filtradas.filter(o => normalizarTexto(o.local).includes(normalizarTexto(mod))) : filtradas;
          render(res);
        });
      }
    },

    async oportunidades() {
      const todas = (await api('/oportunidades', { auth: false })).filter(o => o.tipo !== 'vaga');
      const box = $('#lista');
      const fil = $('#filtros');

      const pintar = t => {
        fil.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.t === t)));
        const l = todas.filter(o => !t || o.tipo === t);
        box.innerHTML = l.length ? l.map(card).join('') : vazio('Nenhuma oportunidade nesta categoria.');
      };

      fil.addEventListener('click', e => {
        const btn = e.target.closest('button');
        if (btn && btn.dataset.t !== undefined) pintar(btn.dataset.t);
      });

      pintar('');
    },

    async detalhe() {
      const id = params.get('id');
      if (!id) return void (location.href = 'feed.html');

      const o = await api('/oportunidades/' + encodeURIComponent(id), { auth: false });
      const vaga = o.tipo === 'vaga';
      let acao = '';
      if (user.tipo === 'colaboradora') {
        acao = `<a class="btn" href="inscricao.html?id=${Number(id)}">${vaga ? 'Candidatar-se à vaga' : 'Fazer inscrição'}</a>`;
      } else {
        acao = `<p class="mut" style="background:var(--painel-claro); padding:0.6rem 1rem; border-radius:var(--r);">Entre com uma conta profissional para se candidatar.</p>`;
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

        <div style="border-top:1px solid var(--borda); padding-top:1.5rem; display:flex; gap:1rem; align-items:center; flex-wrap:wrap;">
          ${acao}
          <a class="btn ghost" href="feed.html">Voltar ao feed</a>
        </div>`;
    },

    async inscricao() {
      const id = params.get('id');
      if (!id) return void (location.href = 'feed.html');

      const o = await api('/oportunidades/' + encodeURIComponent(id), { auth: false });
      const vaga = o.tipo === 'vaga';

      $('#titulo').textContent = vaga ? 'Candidatura para Vaga' : 'Inscrição para Oportunidade';
      $('#resumo-titulo').textContent = o.titulo;
      $('#resumo-meta').textContent = [TIPOS[o.tipo] || o.tipo, o.empresaNome, o.local || 'Remoto'].filter(Boolean).join(' | ');
      $('#enviar').textContent = vaga ? 'Enviar candidatura' : 'Fazer inscrição';

      enviar($('main form'), async d => {
        const mensagem = [d.mensagem.trim(), d.link && `Portfólio: ${d.link.trim()}`].filter(Boolean).join('\n\n');
        if (mensagem.length > 500) {
          throw new Error('A mensagem e o link juntos devem ter no máximo 500 caracteres.');
        }

        const r = await api(`/oportunidades/${encodeURIComponent(id)}/inscricoes`, {
          method: 'POST',
          body: { mensagem }
        });

        const chaveHistorico = `elab_inscricoes_${user.id}`;
        const historico = JSON.parse(localStorage.getItem(chaveHistorico) || '[]');
        historico.unshift({
          protocolo: r.protocolo,
          oportunidadeId: o.id,
          titulo: o.titulo,
          tipo: o.tipo,
          empresa: o.empresaNome,
          mensagem,
          dataRegistro: new Date().toLocaleDateString('pt-BR')
        });
        localStorage.setItem(chaveHistorico, JSON.stringify(historico));

        sessionStorage.setItem('elab_conf', JSON.stringify(r));
        location.href = 'confirmacao.html';
      });
    },

    confirmacao() {
      const r = JSON.parse(sessionStorage.getItem('elab_conf') || 'null');
      if (!r || !r.oportunidade) return void (location.href = 'feed.html');

      const vaga = r.oportunidade.tipo === 'vaga';
      $('#msg-titulo').textContent = vaga ? 'Candidatura registrada' : 'Inscrição registrada';
      $('#conf-titulo').textContent = r.oportunidade.titulo;
      $('#conf-protocolo').textContent = '#' + r.protocolo;
    },

    perfil() {
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
    },

    editar() {
      const f = $('main form');
      ['nome', 'area', 'cidade', 'bio'].forEach(k => {
        if (f.elements[k]) f.elements[k].value = user[k] || '';
      });

      enviar(f, async d => {
        const atualizado = await api('/perfil', { method: 'PUT', body: d });
        Object.assign(user, atualizado);
        $('.ok', f).textContent = 'Perfil atualizado.';
        setTimeout(() => { location.href = 'perfil.html'; }, 900);
      });
    },

    async empresa() {
      if (user.tipo !== 'empresa') return void (location.href = 'feed.html');

      const f = $('main form');
      const carregar = async () => {
        const todas = await api('/oportunidades', { auth: false });
        const minhas = todas.filter(o => (o.empresaId || o.Entidade_Parceira_idEntidade_Parceira) === user.id);
        $('#lista').innerHTML = minhas.length ? minhas.map(card).join('') : vazio('Sua empresa ainda não publicou nenhuma oportunidade.');
      };

      enviar(f, async d => {
        const habilidades = (d.habilidades || '').split(',').map(s => s.trim()).filter(Boolean);
        await api('/oportunidades', { method: 'POST', body: { ...d, habilidades } });
        f.reset();
        const btn = $('button[type=submit]', f);
        if (btn) btn.disabled = false;
        $('.ok', f).textContent = 'Publicação criada.';
        setTimeout(() => { $('.ok', f).textContent = ''; }, 4000);
        await carregar();
      });

      await carregar();
    }
  };

  /* ---------- Inicialização e Ciclo de Vida ---------- */
  (async () => {
    const page = document.body.dataset.page;
    const rodar = () => paginas[page] && paginas[page]();

    if (PUBLICAS.includes(page)) {
      return rodar();
    }

    if (!token()) {
      return void (location.href = 'login.html');
    }

    try {
      user = await api('/perfil');
      shell();
      await rodar();
    } catch (x) {
      const alvo = $('main') || document.body;
      const alerta = document.createElement('p');
      alerta.className = 'erro';
      alerta.setAttribute('role', 'alert');
      alerta.textContent = x instanceof Error ? x.message : 'Não foi possível carregar esta página.';
      alvo.prepend(alerta);
      const carregando = $('.vazio p', alvo);
      if (carregando && carregando.textContent.includes('Carregando')) {
        carregando.textContent = 'Não foi possível carregar os dados.';
      }
    }
  })();
})();