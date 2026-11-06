import { esc } from "./dom.js";
import { api } from "./api.js";

const ROTULOS = { habilidades: "Habilidades", area: "Área", nivel: "Nível", preferencias: "Preferências" };

const situacao = r => {
  if (r.similaridade >= 1) return "você tem";
  if (r.similaridade > 0) return `relacionada a algo que você sabe (${Math.round(r.similaridade * 100)}%)`;
  return "você ainda não tem";
};

export const blocoMatch = (m, trilha) => {
  const barras = Object.entries(m.componentes).map(([k, v]) => `<div class="match-linha"><span>${esc(ROTULOS[k] || k)}</span><div class="match-barra"><i style="width:${Number(v)}%"></i></div><b>${Number(v)}%</b></div>`).join("");
  const reqs = m.requisitos.map(r => `<li>${esc(r.nome || "Habilidade")}${r.obrigatoria ? " <em>(obrigatória)</em>" : ""}: ${esc(situacao(r))}</li>`).join("");
  const alerta = m.eliminatorias.length ? `<p class="erro" role="note">Requisito obrigatório que você ainda não tem: ${m.eliminatorias.map(e => esc(e.nome)).join(", ")}. Isso reduz bastante a sua pontuação.</p>` : "";
  const passos = trilha.map(t => {
    const caminho = t.caminho.map(c => esc(c.nome));
    return `<li><strong>${esc(t.alvo.nome)}</strong>: ${t.alcancavel ? caminho.join(" → ") : "nenhuma habilidade sua está ligada a esta; comece pelo básico"}</li>`;
  }).join("");
  return `<section class="match-bloco" aria-label="Compatibilidade com o seu perfil">
    <h3>Por que ${Number(m.score)}% de compatibilidade</h3>
    ${alerta}${barras}
    <h4>Requisitos da vaga</h4><ul>${reqs}</ul>
    ${passos ? `<h4>Trilha de aprendizado</h4><ol>${passos}</ol>` : ""}
  </section>`;
};

export const carregarMatch = async (o, user) => {
  if (o.tipo !== "vaga" || user.tipo !== "colaboradora") return "";
  const id = Number(o.id || o.idOportunidade);
  try {
    const [ranking, trilha] = await Promise.all([api("/match/vagas"), api("/match/trilha/" + id)]);
    const m = ranking.find(r => r.vagaId === id);
    return m && m.requisitos.length ? blocoMatch(m, trilha.trilha) : "";
  } catch {
    return "";
  }
};
