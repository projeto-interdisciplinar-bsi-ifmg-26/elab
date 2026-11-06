// Teste ponta a ponta de POST /match/alocacao. Requer o servidor rodando.
// Cenario: X e Y disputam as vagas V1 e V2, e as duas preferem a V1.
// Escolha gulosa: X fica com V1 e Y fica sem vaga. Otimo global: X->V2 e Y->V1.
// Cria 2 empresas, 2 candidatas, 3 habilidades e 2 vagas temporarias e REMOVE tudo no final.
const bcrypt = require('bcryptjs');
const { query, closePool } = require('../db/pool');

const BASE = process.env.BASE_URL || 'http://localhost:3000/api/v1';
const stamp = Date.now();
const SENHA = 'senha12345';
const email = (p) => 'teste.aloc.' + p + '.' + stamp + '@elab.test';
const E = { x: email('x'), y: email('y'), e1: email('emp1'), e2: email('emp2') };
let falhas = 0;

async function chamar(metodo, rota, corpo, tok) {
  const headers = tok ? { Authorization: 'Bearer ' + tok } : {};
  let body;
  if (corpo) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(corpo);
  }
  const r = await fetch(BASE + rota, { method: metodo, headers, body });
  const tipo = r.headers.get('content-type') || '';
  const dados = tipo.includes('json') ? await r.json() : await r.text();
  return { status: r.status, dados };
}

function conferir(nome, cond, detalhe) {
  const msg = cond ? '' : ' -> ' + JSON.stringify(detalhe);
  console.log((cond ? 'OK     ' : 'FALHOU ') + nome + msg);
  if (!cond) falhas++;
}

const dadosDe = (r) => (r.dados && r.dados.dados) || null;

async function criarHabilidade(letra) {
  const r = await query('INSERT INTO Habilidades (nome_habilidade, categoria) VALUES (?, ?)', ['TESTE-ALOC-' + letra + '-' + stamp, 'teste']);
  return r.insertId;
}

async function empresa(em, nome, cnpj) {
  const hash = await bcrypt.hash(SENHA, 4);
  const u = await query('INSERT INTO Usuarios (email, senha, tipo_usuario) VALUES (?, ?, ?)', [em, hash, 'entidade_parceira']);
  await query('INSERT INTO Entidades_Parceiras (Usuario_idUsuario, nome_organizacao, cnpj) VALUES (?, ?, ?)', [u.insertId, nome, cnpj]);
  const r = await chamar('POST', '/auth/login', { email: em, senha: SENHA });
  return dadosDe(r) && dadosDe(r).token;
}

async function candidata(em, nome, habIds) {
  await chamar('POST', '/auth/registrar', { nome, email: em, senha: SENHA, tipo: 'profissional' });
  const r = await chamar('POST', '/auth/login', { email: em, senha: SENHA });
  const tok = dadosDe(r) && dadosDe(r).token;
  if (tok) await chamar('PUT', '/perfil/habilidades', { habilidades: habIds.map((id) => ({ habilidadeId: id, anos: 1 })) }, tok);
  return tok;
}

async function main() {
  const A = await criarHabilidade('A');
  const B = await criarHabilidade('B');
  const C = await criarHabilidade('C');

  const tokE1 = await empresa(E.e1, 'Empresa Teste Aloc 1', String(stamp).padStart(14, '0').slice(-14));
  const tokE2 = await empresa(E.e2, 'Empresa Teste Aloc 2', String(stamp + 1).padStart(14, '0').slice(-14));
  conferir('login das empresas', !!tokE1 && !!tokE2, { e1: !!tokE1, e2: !!tokE2 });
  const tokX = await candidata(E.x, 'Teste Aloc X', [A, B]);
  const tokY = await candidata(E.y, 'Teste Aloc Y', [B]);
  conferir('login das candidatas', !!tokX && !!tokY, { x: !!tokX, y: !!tokY });
  if (!tokE1 || !tokE2 || !tokX || !tokY) return;

  let r = await chamar('POST', '/oportunidades', {
    titulo: 'TESTE-ALOC V1', tipo: 'vaga',
    requisitos: [{ habilidadeId: A, importancia: 1 }, { habilidadeId: B, importancia: 4 }]
  }, tokE1);
  const v1 = dadosDe(r) && dadosDe(r).id;
  r = await chamar('POST', '/oportunidades', {
    titulo: 'TESTE-ALOC V2', tipo: 'vaga',
    requisitos: [{ habilidadeId: A, importancia: 4 }, { habilidadeId: C, importancia: 1 }]
  }, tokE1);
  const v2 = dadosDe(r) && dadosDe(r).id;
  conferir('empresa 1 cria as vagas V1 e V2', !!v1 && !!v2, { v1, v2 });
  if (!v1 || !v2) return;

  for (const [tok, id] of [[tokX, v1], [tokX, v2], [tokY, v1], [tokY, v2]]) {
    r = await chamar('POST', '/oportunidades/' + id + '/inscricoes', { mensagem: 'teste' }, tok);
    conferir('inscricao na vaga ' + id, r.status === 201, r);
  }

  const rx = dadosDe(await chamar('GET', '/match/vagas', null, tokX)) || [];
  const ry = dadosDe(await chamar('GET', '/match/vagas', null, tokY)) || [];
  const sx1 = (rx.find((i) => i.vagaId === v1) || {}).score;
  const sx2 = (rx.find((i) => i.vagaId === v2) || {}).score;
  const sy1 = (ry.find((i) => i.vagaId === v1) || {}).score;
  const sy2 = (ry.find((i) => i.vagaId === v2) || {}).score;
  conferir('cenario de disputa: X e Y preferem V1 e Y fica abaixo do minimo em V2', sx1 > sx2 && sy1 > sy2 && sy2 < 40 && sx2 >= 40 && sy1 >= 40, { sx1, sx2, sy1, sy2 });

  r = await chamar('POST', '/match/alocacao', null, tokE1);
  const aloc = dadosDe(r);
  conferir('alocacao responde 200', r.status === 200 && !!aloc, r);
  if (!aloc) return;
  const mapa = Object.fromEntries(aloc.pares.map((p) => [p.nome, p.vagaId]));
  conferir('duas alocacoes', aloc.pares.length === 2, aloc);
  conferir('otimo global: X fica com V2 e Y fica com V1', mapa['Teste Aloc X'] === v2 && mapa['Teste Aloc Y'] === v1, mapa);
  conferir('total supera o da escolha gulosa (so X na V1)', aloc.total > sx1, { total: aloc.total, gulosa: sx1 });
  conferir('total e a soma dos scores dos pares', aloc.total === aloc.pares.reduce((a, p) => a + p.score, 0), aloc);

  r = await chamar('POST', '/match/alocacao', null, tokE2);
  conferir('empresa sem vagas recebe 200 e nenhuma alocacao', r.status === 200 && dadosDe(r).pares.length === 0, r);
  r = await chamar('POST', '/match/alocacao', null, tokX);
  conferir('colaboradora recebe 403', r.status === 403, r);
  r = await chamar('POST', '/match/alocacao', null, null);
  conferir('sem token recebe 401', r.status === 401, r);
}

main()
  .catch((err) => { console.error('ERRO', err); falhas++; })
  .finally(async () => {
    await query('DELETE FROM Usuarios WHERE email IN (?, ?, ?, ?)', [E.x, E.y, E.e1, E.e2]);
    await query("DELETE FROM Habilidades WHERE nome_habilidade LIKE 'TESTE-ALOC-%'");
    const v = await query("SELECT COUNT(*) AS n FROM Oportunidades WHERE titulo LIKE 'TESTE-ALOC%'");
    const h = await query("SELECT COUNT(*) AS n FROM Habilidades WHERE nome_habilidade LIKE 'TESTE-ALOC-%'");
    conferir('limpeza: nenhuma vaga nem habilidade de teste sobrou', Number(v[0].n) === 0 && Number(h[0].n) === 0, { vagas: v[0].n, habilidades: h[0].n });
    await closePool();
    console.log(falhas ? falhas + ' falha(s)' : 'TUDO OK');
    process.exit(falhas ? 1 : 0);
  });
