import { $ } from '../core/dom.js';
import { user } from '../core/state.js';
import { api } from '../core/api.js';
import { enviar } from '../core/forms.js';
import { card, TIPOS, ROTULO_MODERACAO } from '../core/render.js';
import { montarLista } from '../core/lista.js';
import { montarBlocoVaga } from '../core/vagaForm.js';

const CAMPOS_VAGA = ['areaId', 'nivel', 'modalidade', 'salario_min', 'salario_max'];

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
      desenhar: o => card(o),
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

  // ---- Banner opcional da publicação recém-criada ----
  const blocoImagem = $('#bloco-imagem');
  let publicacaoParaImagem = null;
  const limparBlocoImagem = () => {
    $('#imagem-publicacao').value = '';
    $('#imagem-erro').textContent = '';
    $('#imagem-ok').textContent = '';
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

    const nova = await api('/oportunidades', { method: 'POST', body });

    f.reset();
    limparBlocoImagem();
    if (bloco) bloco.limpar();
    ajustarBloco();

    const btn = $('button[type=submit]', f);
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Publicar';
    }
    $('.ok', f).textContent = 'Publicação criada. Ela aparece no feed após a aprovação do administrador.';
    setTimeout(() => { $('.ok', f).textContent = ''; }, 4000);

    // A imagem é anexada depois: a rota precisa do id da publicação recém-criada.
    publicacaoParaImagem = nova && nova.id ? nova.id : null;
    blocoImagem.hidden = !publicacaoParaImagem;

    await carregar();
  });

  $('#btn-enviar-imagem').addEventListener('click', async ev => {
    const botao = ev.currentTarget;
    const arquivo = $('#imagem-publicacao').files[0];
    const erroEl = $('#imagem-erro');
    const okEl = $('#imagem-ok');
    erroEl.textContent = '';
    okEl.textContent = '';

    if (!publicacaoParaImagem) return;
    if (!arquivo) {
      erroEl.textContent = 'Escolha uma imagem.';
      return;
    }

    const fd = new FormData();
    fd.append('imagem', arquivo);

    botao.disabled = true;
    try {
      await api('/oportunidades/' + publicacaoParaImagem + '/imagem', { method: 'PUT', body: fd });
      okEl.textContent = 'Imagem enviada. Ela aparece após a aprovação do administrador.';
      $('#imagem-publicacao').value = '';
      await carregar();
    } catch (x) {
      erroEl.textContent = x instanceof Error ? x.message : 'Não foi possível enviar a imagem.';
    } finally {
      botao.disabled = false;
    }
  });

  await carregar();
}
