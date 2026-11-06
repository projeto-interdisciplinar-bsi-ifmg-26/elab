import { $, $$ } from '../core/dom.js';
import { api } from '../core/api.js';
import { enviar } from '../core/forms.js';

export function registro() {
  const tipo = $("#campo-tipo");
  const cnpjWrap = $("#campo-cnpj-wrap");
  const cnpjInput = $("#campo-cnpj");
  const ajustarCnpj = () => {
    const empresa = tipo.value === "entidade_parceira";
    cnpjWrap.hidden = !empresa;
    cnpjWrap.style.display = empresa ? "" : "none";
    cnpjInput.required = empresa;
    const sobrenomeWrap = $("#campo-sobrenome-wrap");
    $("#rotulo-nome").textContent = empresa ? "Nome da empresa" : "Nome";
    $("#campo-nome").placeholder = empresa ? "Razão social ou nome fantasia" : "Seu nome";
    $("#campo-nome").autocomplete = empresa ? "organization" : "given-name";
    sobrenomeWrap.hidden = empresa;
    sobrenomeWrap.style.display = empresa ? "none" : "";
    if (empresa) $("#campo-sobrenome").value = "";
    $("#linha-nome").classList.toggle("linha-unica", empresa);
  };
  tipo.addEventListener("change", ajustarCnpj);
  ajustarCnpj();

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

    const nome = (d.tipo === "entidade_parceira" ? [d.nome] : [d.nome, d.sobrenome]).map(s => s?.trim()).filter(Boolean).join(' ');
    await api('/auth/registrar', {
      method: 'POST',
      auth: false,
      body: { nome, email: d.email, senha: d.senha, tipo: d.tipo, cnpj: d.tipo === "entidade_parceira" ? d.cnpj : undefined }
    });

    const r = await api('/auth/login', { method: 'POST', auth: false, body: { email: d.email, senha: d.senha } });
    localStorage.setItem('elab_token', r.token);
    location.href = 'feed.html';
  });
}
