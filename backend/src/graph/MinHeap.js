// Fila de prioridade (min-heap binario). push/pop em O(log n).
class MinHeap {
  constructor() {
    this.a = [];
  }

  get tamanho() {
    return this.a.length;
  }

  push(prioridade, valor) {
    const a = this.a;
    a.push([prioridade, valor]);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p][0] <= a[i][0]) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }

  pop() {
    const a = this.a;
    if (a.length === 0) return null;
    const topo = a[0];
    const ultimo = a.pop();
    if (a.length > 0) {
      a[0] = ultimo;
      let i = 0;
      const n = a.length;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < n && a[l][0] < a[m][0]) m = l;
        if (r < n && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return topo;
  }
}

module.exports = { MinHeap };
