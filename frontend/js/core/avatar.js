import { esc } from './dom.js';

// Avatar: imagem da foto quando existir; senao, a inicial do nome como reserva.
// A URL vem do proprio backend (/media/fotos/...), sempre por caminho interno.
export const avatarHtml = (nome, fotoUrl, classe = '') =>
  fotoUrl
    ? `<span class="avatar-img${classe ? ' ' + classe : ''}"><img src="${esc(fotoUrl)}" alt="${esc(nome)}" loading="lazy"></span>`
    : esc((String(nome || 'U')[0] || 'U').toUpperCase());
