import { $, esc } from '../core/dom.js';
import { params, user } from '../core/state.js';
import { api } from '../core/api.js';
import { TIPOS, filtrar, dataBR, card, vazio } from '../core/render.js';
import { montarLista } from '../core/lista.js';

const NIVEIS = [
  { valor: 'estagio', rotulo: 'Estágio' },
  { valor: 'junior', rotulo: 'Júnior' },
  { valor: 'pleno', rotulo: 'Pleno' },
  { valor: 'senior', rotulo: 'Sênior' },
  { valor: 'especialista', rotulo: 'Especialista' }
];
const MODALIDADES = [
  { valor: 'remoto', rotulo: 'Remoto' },
  { valor: 'hibrido', rotulo: 'Híbrido' },
  { valor: 'presencial', rotulo: 'Presencial' }
];

export async function feed() {
  const q = params.get('q') || '';
  const primeiroNome = user.nome.split(' ')[0] || user.nome;
  $('#ola').textContent = `Olá, ${primeiroNome}!`;

  const todas = await api('/oportunidades', { auth: false });
  const idDe = o => Number(o.id || o.idOportunidade);
  let scores = new Map();
  if (user.tipo === 'colaboradora') {
    try {
      const ranking = await api('/match/vagas');
      scores = new Map(ranking.filter(r => r.requisitos.length > 0).map(r => [r.vagaId, r]));
    } catch {
      scores = new Map();
    }
  }
  const porCompatibilidade = lista => [...lista].sort((a, b) => (scores.get(idDe(b))?.score ?? -1) - (scores.get(idDe(a))?.score ?? -1));
  if (scores.size) $('#sub-saudacao').textContent = 'Vagas ordenadas pela compatibilidade com o seu perfil.';

  const ordenadas = porCompatibilidade(filtrar(todas, q));

  const lista = montarLista($('#lista'), {
    itens: ordenadas,
    desenhar: o => card(o, scores.get(idDe(o))),
    porPagina: 9,
    rotuloBusca: 'Buscar por título, empresa ou habilidade',
    busca: o => [o.titulo, o.empresaNome, o.local, o.tipo, ...(o.habilidades || [])].join(' '),
    vazio: q ? `Nenhuma publicação encontrada para "${q}".` : 'Nenhuma publicação encontrada.',
    filtros: [
      { chave: 'tipo', rotulo: 'Tipo', oculto: true, opcoes: [], teste: (o, v) => o.tipo === v },
      { chave: 'nivel', rotulo: 'Nível', opcoes: NIVEIS, teste: (o, v) => o.nivel === v },
      { chave: 'modalidade', rotulo: 'Modalidade', opcoes: MODALIDADES, teste: (o, v) => o.modalidade === v }
    ]
  });

  const boxFiltros = $('#filtros-feed');
  if (boxFiltros) {
    boxFiltros.addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (!btn) return;
      boxFiltros.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
      lista.definirFiltro('tipo', btn.dataset.tipo || '');
    });
  }

  const destaques = todas.filter(o => o.tipo !== 'vaga').slice(0, 3);
  const elDestaques = $('#destaques');
  if (elDestaques) {
    elDestaques.innerHTML = destaques.length
      ? destaques.map(o => `
        <a class="card" href="detalhe.html?id=${Number(o.id || o.idOportunidade)}" style="padding: 0.85rem;">
          <div class="card-corpo">
            <span class="tag ${esc(o.tipo)}">${esc(TIPOS[o.tipo])}</span>
            <h4 style="margin: 0.2rem 0; font-size:0.98rem;">${esc(o.titulo)}</h4>
            <p class="mut" style="font-size:0.82rem; margin:0;">${esc(dataBR(o.data) || o.empresaNome)}</p>
          </div>
        </a>`).join('')
      : vazio('Nenhum evento em destaque no momento.');
  }
}
