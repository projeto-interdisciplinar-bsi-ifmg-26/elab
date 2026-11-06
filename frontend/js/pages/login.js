import { $ } from '../core/dom.js';
import { api } from '../core/api.js';
import { enviar } from '../core/forms.js';

export function login() {
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

  demoColab?.addEventListener('click', () => escolherContaDemo('colaboradora', 'colab1@elab.com'));
  demoEmpresa?.addEventListener('click', () => escolherContaDemo('empresa', 'empresa1@elab.com'));
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
    const r = await api('/auth/login', { method: 'POST', body: d, auth: false });
    localStorage.setItem('elab_token', r.token);
    location.href = 'feed.html';
  });
}
