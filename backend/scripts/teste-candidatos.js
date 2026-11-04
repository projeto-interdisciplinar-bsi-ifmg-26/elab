// Teste ponta a ponta de GET /oportunidades/:id/candidatos. Requer o servidor rodando.
// Cria 2 empresas, 2 candidatas e 1 vaga temporarias e REMOVE tudo no final.
const bcrypt = require('bcryptjs');
const { query, closePool } = require('../db/pool');

const BASE = process.env.BASE_URL || 'http://localhost:3000/api/v1';
const stamp = Date.now();
const SENHA = 'senha12345';
const email = (p) => 'teste.cand.' + p + '.' + stamp + '@elab.test';
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

async function candidata(em, nome) {
  await chamar('POST', '/auth/registrar', { nome, email: em, senha: SENHA, tipo: 'profissional' });
  const r = await chamar('POST', '/auth/login', { email: em, senha: SENHA });
  return dadosDe(r) && dadosDe(r).token;
}

async function empresa(em, nome, cnpj) {
  const hash = await bcrypt.hash(SENHA, 4);
  const u = await query('INSERT INTO Usuarios (email, senha, tipo_usuario) VALUES (?, ?, ?)', [em, hash, 'entidade_parceira']);
  const e = await query(
    'INSERT INTO Entidades_Parceiras (Usuario_idUsuario, nome_organizacao, cnpj) VALUES (?, ?, ?)',
    [u.insertId, nome, cnpj]
  );
  const r = await chamar('POST', '/auth/login', { email: em, senha: SENHA });
  return { empresaId: e.insertId, token: dadosDe(r) && dadosDe(r).token };
}

async function main() {
  const tokX = await candidata(E.x, 'Teste Cand X');
  const tokY = await candidata(E.y, 'Teste Cand Y');
  conferir('login das candidatas', !!tokX && !!tokY, { tokX: !!tokX, tokY: !!tokY });
  if (!tokX || !tokY) return;

  const base = String(stamp).slice(-13);
  const emp1 = await empresa(E.e1, 'Empresa Teste Cand 1', base + '1');
  const emp2 = await empresa(E.e2, 'Empresa Teste Cand 2', base + '2');
  conferir('login das empresas', !!emp1.token && !!emp2.token, { a: !!emp1.token, b: !!emp2.token });
  if (!emp1.token || !emp2.token) return;

  const hab = dadosDe(await chamar('GET', '/catalogo/habilidades'));
  const js = hab.find((h) => h.nome === 'javascript');
  conferir('catalogo tem javascript', !!js, null);
  if (!js) return;

  let r = await chamar('PUT', '/perfil/habilidades', { habilidades: [{ habilidadeId: js.id, anos: 2 }] }, tokX);
  conferir('candidata X recebe a habilidade', r.status === 200, r);

  const v = await query(
    "INSERT INTO Oportunidades (Entidade_Parceira_idEntidade_Parceira, titulo, tipo, status, nivel) VALUES (?, 'TESTE-CAND vaga', 'vaga', 'ativo', 'qualquer')",
    [emp1.empresaId]
  );
  await query(
    'INSERT INTO Oportunidades_Habilidades (Oportunidade_idOportunidade, Habilidade_idHabilidades, importancia, obrigatoria) VALUES (?, ?, 5, 1)',
    [v.insertId, js.id]
  );

  r = await chamar('POST', '/oportunidades/' + v.insertId + '/inscricoes', { mensagem: 'y' }, tokY);
  conferir('Y se inscreve primeiro', r.status === 201, r);
  r = await chamar('POST', '/oportunidades/' + v.insertId + '/inscricoes', { mensagem: 'x' }, tokX);
  conferir('X se inscreve depois', r.status === 201, r);

  r = await chamar('GET', '/oportunidades/' + v.insertId + '/candidatos', null, emp1.token);
  const lista = dadosDe(r) || [];
  conferir('empresa dona recebe 200 com 2 candidatas', r.status === 200 && lista.length === 2, r);
  conferir('X (tem a habilidade) vem antes de Y apesar de ter se inscrito depois', lista[0] && lista[0].email === E.x && lista[0].score > lista[1].score, lista.map((i) => [i.email, i.score]));
  conferir('Y tem a obrigatoria como eliminatoria', lista[1] && lista[1].eliminatorias.length === 1 && lista[1].eliminatorias[0].id === js.id, lista[1]);
  conferir('X nao tem eliminatorias', lista[0] && lista[0].eliminatorias.length === 0, lista[0]);

  r = await chamar('GET', '/oportunidades/' + v.insertId + '/candidatos', null, emp2.token);
  conferir('outra empresa recebe 403', r.status === 403, r);
  r = await chamar('GET', '/oportunidades/' + v.insertId + '/candidatos', null, tokX);
  conferir('colaboradora recebe 403', r.status === 403, r);
  r = await chamar('GET', '/oportunidades/' + v.insertId + '/candidatos', null, null);
  conferir('sem token recebe 401', r.status === 401, r);
  r = await chamar('GET', '/oportunidades/999999/candidatos', null, emp1.token);
  conferir('vaga inexistente recebe 404', r.status === 404, r);
}

main()
  .catch((err) => { console.error('ERRO', err); falhas++; })
  .finally(async () => {
    await query('DELETE FROM Usuarios WHERE email IN (?, ?, ?, ?)', [E.x, E.y, E.e1, E.e2]);
    const sobra = await query("SELECT COUNT(*) AS n FROM Oportunidades WHERE titulo LIKE 'TESTE-CAND%'");
    conferir('limpeza: nenhuma vaga de teste sobrou', Number(sobra[0].n) === 0, sobra);
    await closePool();
    console.log(falhas ? falhas + ' falha(s)' : 'TUDO OK');
    process.exit(falhas ? 1 : 0);
  });
