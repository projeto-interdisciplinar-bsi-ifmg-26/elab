import { $ } from './core/dom.js';
import { PUBLICAS, setUser } from './core/state.js';
import { token, api } from './core/api.js';
import { shell } from './core/shell.js';
import { paginas } from './pages/index.js';

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
    setUser(await api('/perfil'));
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
