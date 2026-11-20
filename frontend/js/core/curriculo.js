import { $ } from './dom.js';
import { api, baixar } from './api.js';

const MAX = 5 * 1024 * 1024;
const EXT = /\.(pdf|docx)$/i;

const dataBR = iso => {
  if (!iso) return '';
  const d = String(iso).slice(0, 10).split('-');
  return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : '';
};

// Bloco somente leitura usado no perfil: nome do arquivo e botão de download.
export function exibirCurriculo(el, curriculo) {
  if (!el) return;
  const secao = el.closest('#secao-curriculo') || el;
  secao.hidden = false;
  const info = $('#curriculo-info', secao);
  const btn = $('#curriculo-baixar', secao);
  if (!curriculo || !curriculo.nome) {
    if (info) info.textContent = 'Não enviado.';
    if (btn) btn.hidden = true;
    return;
  }
  const data = dataBR(curriculo.atualizadoEm);
  if (info) info.textContent = 'Currículo: ' + curriculo.nome + (data ? ' (enviado em ' + data + ')' : '');
  if (!btn) return;
  btn.hidden = false;
  btn.addEventListener('click', async e => {
    e.preventDefault();
    try {
      await baixar('/perfil/curriculo', curriculo.nome);
    } catch (err) {
      erroDe(el, err.message);
    }
  });
}

function erroDe(el, msg) {
  let p = $('#curriculo-erro', el);
  if (!p) {
    p = document.createElement('p');
    p.className = 'erro';
    p.id = 'curriculo-erro';
    p.setAttribute('role', 'alert');
    el.append(p);
  }
  p.textContent = msg;
}

export function montarCurriculo(el) {
  if (!el) return;
  let atual = null;

  el.innerHTML = `
    <p class="mut" id="curriculo-estado">Carregando currículo...</p>
    <input type="file" id="curriculo-arquivo" accept=".pdf,.docx" aria-label="Arquivo de currículo">
    <div class="acoes" style="justify-content:flex-start; margin-top:0.75rem;">
      <button class="btn sm" type="button" id="curriculo-enviar">Enviar currículo</button>
      <button class="btn sm ghost" type="button" id="curriculo-baixar" hidden>Baixar</button>
      <button class="btn sm ghost" type="button" id="curriculo-remover" hidden>Remover</button>
    </div>
    <p class="erro" role="alert" id="curriculo-erro"></p>
    <p class="ok" role="status" id="curriculo-ok"></p>`;

  const estado = $('#curriculo-estado', el);
  const arquivo = $('#curriculo-arquivo', el);
  const btnEnviar = $('#curriculo-enviar', el);
  const btnBaixar = $('#curriculo-baixar', el);
  const btnRemover = $('#curriculo-remover', el);
  const erro = $('#curriculo-erro', el);
  const ok = $('#curriculo-ok', el);

  const limparAvisos = () => { erro.textContent = ''; ok.textContent = ''; };

  const desenhar = () => {
    atual = atual && atual.nome ? atual : null;
    if (atual) {
      const data = dataBR(atual.atualizadoEm);
      estado.textContent = 'Currículo: ' + atual.nome + (data ? ' (enviado em ' + data + ')' : '');
      btnBaixar.hidden = false;
      btnRemover.hidden = false;
    } else {
      estado.textContent = 'Nenhum currículo enviado.';
      btnBaixar.hidden = true;
      btnRemover.hidden = true;
    }
  };

  const carregar = async () => {
    try {
      const perfil = await api('/perfil');
      atual = perfil.curriculo || null;
    } catch {
      atual = null;
    }
    desenhar();
  };

  btnEnviar.addEventListener('click', async () => {
    limparAvisos();
    const f = arquivo.files && arquivo.files[0];
    if (!f) return void (erro.textContent = 'Escolha um arquivo PDF ou DOCX.');
    if (!EXT.test(f.name)) return void (erro.textContent = 'Envie o currículo em PDF ou DOCX.');
    if (f.size > MAX) return void (erro.textContent = 'O currículo deve ter no máximo 5 MB.');

    const dados = new FormData();
    dados.append('curriculo', f);
    btnEnviar.disabled = true;
    try {
      const r = await api('/perfil/curriculo', { method: 'POST', body: dados });
      atual = { nome: r.nome, atualizadoEm: new Date().toISOString() };
      arquivo.value = '';
      ok.textContent = 'Currículo enviado.';
      desenhar();
    } catch (e) {
      erro.textContent = e.message;
    } finally {
      btnEnviar.disabled = false;
    }
  });

  btnBaixar.addEventListener('click', async () => {
    limparAvisos();
    try {
      await baixar('/perfil/curriculo', atual ? atual.nome : 'curriculo.pdf');
    } catch (e) {
      erro.textContent = e.message;
    }
  });

  btnRemover.addEventListener('click', async () => {
    limparAvisos();
    if (!confirm('Remover o currículo enviado?')) return;
    try {
      await api('/perfil/curriculo', { method: 'DELETE' });
      atual = null;
      ok.textContent = 'Currículo removido.';
      desenhar();
    } catch (e) {
      erro.textContent = e.message;
    }
  });

  carregar();
}
