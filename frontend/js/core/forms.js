import { $ } from './dom.js';

export const erro = (form, msg) => {
  const el = $('.erro', form);
  if (el) el.textContent = msg || '';
};

export const dados = form => Object.fromEntries(new FormData(form));

export const enviar = (form, fn) => {
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
