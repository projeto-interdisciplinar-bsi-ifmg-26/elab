// Algoritmo hungaro (Kuhn-Munkres) em O(n^2 * m), para n <= m, MINIMIZANDO custo.
// Devolve, para cada linha, o indice da coluna atribuida.
function hungaroMin(custo) {
  const n = custo.length;
  const m = custo[0].length;
  const u = new Array(n + 1).fill(0);
  const v = new Array(m + 1).fill(0);
  const p = new Array(m + 1).fill(0);
  const way = new Array(m + 1).fill(0);

  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array(m + 1).fill(Infinity);
    const usado = new Array(m + 1).fill(false);
    do {
      usado[j0] = true;
      const i0 = p[j0];
      let delta = Infinity;
      let j1 = 0;
      for (let j = 1; j <= m; j++) {
        if (usado[j]) continue;
        const cur = custo[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) {
          minv[j] = cur;
          way[j] = j0;
        }
        if (minv[j] < delta) {
          delta = minv[j];
          j1 = j;
        }
      }
      for (let j = 0; j <= m; j++) {
        if (usado[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0 !== 0);
  }

  const res = new Array(n).fill(-1);
  for (let j = 1; j <= m; j++) if (p[j] !== 0) res[p[j] - 1] = j - 1;
  return res;
}

// Emparelhamento de PESO MAXIMO no grafo bipartido linhas x colunas.
// matriz[i][j] = score. Aceita matriz retangular. Descarta pares com score < minimo.
function emparelhamentoOtimo(matriz, minimo = -Infinity) {
  const n = matriz.length;
  if (n === 0 || matriz[0].length === 0) return { pares: [], total: 0 };
  const m = matriz[0].length;
  const transpor = n > m;
  const base = transpor ? matriz[0].map((_, j) => matriz.map((l) => l[j])) : matriz;
  const res = hungaroMin(base.map((l) => l.map((x) => -x)));

  const pares = [];
  let total = 0;
  res.forEach((j, i) => {
    if (j < 0) return;
    const linha = transpor ? j : i;
    const coluna = transpor ? i : j;
    const score = matriz[linha][coluna];
    if (score >= minimo) {
      pares.push({ linha, coluna, score });
      total += score;
    }
  });
  return { pares, total };
}

module.exports = { hungaroMin, emparelhamentoOtimo };
