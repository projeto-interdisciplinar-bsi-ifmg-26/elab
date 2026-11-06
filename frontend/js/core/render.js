import { esc, normalizarTexto } from './dom.js';

export const TIPOS = { vaga: 'Vaga', evento: 'Evento', palestra: 'Palestra', bolsa: 'Bolsa de estudo' };

export const filtrar = (lista, q) => {
  if (!q) return lista;
  const termo = normalizarTexto(q.trim());
  return lista.filter(o =>
    normalizarTexto([o.titulo, o.empresaNome, o.local, o.tipo, ...(o.habilidades || [])].join(' ')).includes(termo)
  );
};

export const dataBR = d => (d ? d.split('-').reverse().join('/') : '');

export const card = o => {
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

export const vazio = msg => `
  <div class="vazio">
    <p>${esc(msg)}</p>
  </div>`;
