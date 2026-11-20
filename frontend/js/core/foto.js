import { $ } from './dom.js';
import { api } from './api.js';
import { user } from './state.js';
import { avatarHtml } from './avatar.js';

// O backend aceita JPEG, PNG e WebP ate 2 MB e devolve a foto ja em WebP 512x512.
const MAX = 2 * 1024 * 1024;
const TIPOS = ['image/jpeg', 'image/png', 'image/webp'];
const EXT = /\.(jpe?g|png|webp)$/i;

const ehImagem = f => TIPOS.includes(f.type) || (!f.type && EXT.test(f.name));

// Atualiza o avatar do topo sem recarregar a pagina (o shell monta o header uma vez).
function atualizarTopo() {
  const alvo = $('.topbar a.avatar');
  if (alvo) alvo.innerHTML = avatarHtml(user.nome, user.fotoUrl);
}

export function montarFoto(el) {
  if (!el) return;

  el.innerHTML = `
    <div class="foto-editor">
      <div class="perfil-avatar" id="foto-previa"></div>
      <div class="foto-controles">
        <p class="mut" id="foto-estado"></p>
        <input type="file" id="foto-arquivo" accept="image/jpeg,image/png,image/webp" aria-label="Arquivo da foto de perfil">
        <div class="acoes" style="justify-content:flex-start; margin-top:0.75rem;">
          <button class="btn sm" type="button" id="foto-enviar">Enviar foto</button>
          <button class="btn sm ghost" type="button" id="foto-remover" hidden>Remover foto</button>
        </div>
        <p class="erro" role="alert" id="foto-erro"></p>
        <p class="ok" role="status" id="foto-ok"></p>
      </div>
    </div>`;

  const previa = $('#foto-previa', el);
  const arquivo = $('#foto-arquivo', el);
  const btnEnviar = $('#foto-enviar', el);
  const btnRemover = $('#foto-remover', el);
  const estado = $('#foto-estado', el);
  const erro = $('#foto-erro', el);
  const ok = $('#foto-ok', el);

  const limparAvisos = () => { erro.textContent = ''; ok.textContent = ''; };

  const desenhar = () => {
    previa.innerHTML = avatarHtml(user.nome, user.fotoUrl);
    estado.textContent = user.fotoUrl ? 'Foto atual.' : 'Nenhuma foto enviada: usamos a inicial do seu nome.';
    btnRemover.hidden = !user.fotoUrl;
  };

  btnEnviar.addEventListener('click', async () => {
    limparAvisos();
    const f = arquivo.files && arquivo.files[0];
    if (!f) return void (erro.textContent = 'Escolha uma imagem.');
    if (!ehImagem(f)) return void (erro.textContent = 'Envie uma imagem JPEG, PNG ou WebP.');
    if (f.size > MAX) return void (erro.textContent = 'A imagem deve ter no máximo 2 MB.');

    const dados = new FormData();
    dados.append('foto', f);
    btnEnviar.disabled = true;
    try {
      const r = await api('/perfil/foto', { method: 'POST', body: dados });
      user.fotoUrl = r.fotoUrl;
      arquivo.value = '';
      ok.textContent = 'Foto atualizada.';
      desenhar();
      atualizarTopo();
    } catch (e) {
      erro.textContent = e.message;
    } finally {
      btnEnviar.disabled = false;
    }
  });

  btnRemover.addEventListener('click', async () => {
    limparAvisos();
    if (!confirm('Remover sua foto de perfil?')) return;
    btnRemover.disabled = true;
    try {
      await api('/perfil/foto', { method: 'DELETE' });
      user.fotoUrl = null;
      ok.textContent = 'Foto removida.';
      desenhar();
      atualizarTopo();
    } catch (e) {
      erro.textContent = e.message;
    } finally {
      btnRemover.disabled = false;
    }
  });

  desenhar();
}
