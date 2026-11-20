import { $, esc } from '../core/dom.js';
import { user } from '../core/state.js';
import { api } from '../core/api.js';
import { enviar } from '../core/forms.js';
import { card, TIPOS, ROTULO_MODERACAO } from '../core/render.js';
import { montarLista } from '../core/lista.js';
import { montarBlocoVaga } from '../core/vagaForm.js';

const CAMPOS_VAGA = ['areaId', 'nivel', 'modalidade', 'salario_min', 'salario_max'];

// O backend aceita JPEG, PNG e WebP ate 2 MB e devolve o banner ja em WebP.
const MAX_BANNER = 2 * 1024 * 1024;
const TIPOS_BANNER = ['image/jpeg', 'image/png', 'image/webp'];

// Card da publicação + controles do banner. A rota de imagem precisa do id, então o
// banner é anexado, trocado e removido aqui na lista — não só logo após a criação.
function itemComBanner(o) {
  const id = Number(o.id);
  return `<div class="item-publicacao" data-publicacao="${id}">
    ${card(o)}
    <div class="banner-controles">
      <div class="banner-atual">${o.imagemUrl
        ? `<img src="${esc(o.imagemUrl)}" alt="Banner atual da publicação ${esc(o.titulo)}">
           <button class="btn sm ghost" type="button" data-acao="remover" data-id="${id}">Remover banner</button>`
        : '<span class="mut">Sem banner. Anexe uma imagem JPEG, PNG ou WebP (até 2 MB).</span>'}</div>
      <input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Banner da publicação ${esc(o.titulo)}">
      <button class="btn sm" type="button" data-acao="enviar" data-id="${id}">Enviar banner</button>
      <p class="erro" role="alert"></p>
      <p class="ok" role="status"></p>
    </div>
  </div>`;
}

export async function empresa() {
  if (user.tipo !== 'empresa') return void (location.href = 'feed.html');

  const f = $('#form-publicacao') || $('main form');
  const blocoEl = $('#bloco-vaga');

  // Enquanto o cadastro não for aprovado pelo admin, o envio fica bloqueado.
  const status = user.statusAprovacao || 'pendente';
  const aviso = $('#aviso-aprovacao');
  if (status !== 'aprovada') {
    const texto = status === 'rejeitada'
      ? 'Cadastro rejeitado' + (user.motivoRejeicao ? ': ' + user.motivoRejeicao : '.') + ' Procure o administrador para corrigir.'
      : 'Cadastro em análise. Você poderá publicar assim que o administrador aprovar a empresa.';
    if (aviso) {
      aviso.textContent = texto;
      aviso.classList.add(status === 'rejeitada' ? 'rejeitada' : 'pendente');
      aviso.hidden = false;
    }
    for (const campo of f.querySelectorAll('input, select, textarea, button')) campo.disabled = true;
  }

  let bloco = null;
  try {
    bloco = await montarBlocoVaga(blocoEl);
  } catch {
    blocoEl.innerHTML = '<p class="mut">Não foi possível carregar os campos da vaga. Recarregue a página.</p>';
  }

  const ajustarBloco = () => {
    blocoEl.hidden = f.elements.tipo.value !== 'vaga';
  };
  f.elements.tipo.addEventListener('change', ajustarBloco);
  ajustarBloco();

  let lista = null;
  const carregar = async () => {
    const minhas = await api('/oportunidades/minhas');
    if (lista) return void lista.atualizar(minhas);
    lista = montarLista($('#lista'), {
      itens: minhas,
      desenhar: itemComBanner,
      porPagina: 6,
      rotuloBusca: 'Buscar por título, local ou habilidade',
      busca: o => [o.titulo, o.local, o.tipo, ...(o.habilidades || [])].join(' '),
      vazio: 'Nenhuma publicação encontrada. Publique uma oportunidade ou ajuste os filtros.',
      filtros: [{
        chave: 'tipo', rotulo: 'Tipo',
        opcoes: Object.keys(TIPOS).map(t => ({ valor: t, rotulo: TIPOS[t] })),
        teste: (o, v) => o.tipo === v
      }, {
        chave: 'moderacao', rotulo: 'Moderação',
        opcoes: Object.keys(ROTULO_MODERACAO).map(k => ({ valor: k, rotulo: ROTULO_MODERACAO[k] })),
        teste: (o, v) => o.status_moderacao === v
      }]
    });
  };

  // Depois de recarregar a lista o aviso é recolocado no item correspondente. Se a
  // atualização tirou o item da página (filtro de moderação, por exemplo), o aviso
  // vai para o topo da seção para não se perder.
  const avisar = (id, texto) => {
    const alvo = $('.item-publicacao[data-publicacao="' + id + '"] .ok', $('#lista')) || $('#aviso-lista');
    if (!alvo) return;
    alvo.textContent = texto;
    setTimeout(() => { alvo.textContent = ''; }, 5000);
  };

  enviar(f, async d => {
    const body = {};
    for (const [k, v] of Object.entries(d)) {
      if (v !== '') body[k] = v;
    }
    if (d.tipo === 'vaga') {
      body.requisitos = bloco ? bloco.requisitos() : [];
    } else {
      for (const k of CAMPOS_VAGA) delete body[k];
    }

    await api('/oportunidades', { method: 'POST', body });

    f.reset();
    if (bloco) bloco.limpar();
    ajustarBloco();

    const btn = $('button[type=submit]', f);
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Publicar';
    }
    $('.ok', f).textContent = 'Publicação criada. Ela aparece no feed após a aprovação do administrador.';
    setTimeout(() => { $('.ok', f).textContent = ''; }, 4000);

    await carregar();
  });

  // Um único listener para todos os itens: a lista é redesenhada a cada atualização.
  $('#lista').addEventListener('click', async ev => {
    const btn = ev.target.closest('button[data-acao]');
    if (!btn || btn.disabled) return;

    const item = btn.closest('.item-publicacao');
    const id = Number(btn.dataset.id);
    const erro = $('.erro', item);
    const okEl = $('.ok', item);
    erro.textContent = '';
    okEl.textContent = '';

    if (btn.dataset.acao === 'remover') {
      if (!confirm('Remover o banner desta publicação?')) return;
      btn.disabled = true;
      try {
        await api('/oportunidades/' + id + '/imagem', { method: 'DELETE' });
        await carregar();
        avisar(id, 'Banner removido.');
      } catch (x) {
        erro.textContent = x instanceof Error ? x.message : 'Não foi possível remover o banner.';
      } finally {
        btn.disabled = false;
      }
      return;
    }

    const arquivo = $('input[type=file]', item).files[0];
    if (!arquivo) return void (erro.textContent = 'Escolha uma imagem.');
    if (!TIPOS_BANNER.includes(arquivo.type)) return void (erro.textContent = 'Envie uma imagem JPEG, PNG ou WebP.');
    if (arquivo.size > MAX_BANNER) return void (erro.textContent = 'A imagem deve ter no máximo 2 MB.');

    const fd = new FormData();
    fd.append('imagem', arquivo);

    btn.disabled = true;
    try {
      await api('/oportunidades/' + id + '/imagem', { method: 'PUT', body: fd });
      await carregar();
      avisar(id, 'Banner enviado. Ele aparece após a aprovação do administrador.');
    } catch (x) {
      erro.textContent = x instanceof Error ? x.message : 'Não foi possível enviar o banner.';
    } finally {
      btn.disabled = false;
    }
  });

  await carregar();
}
