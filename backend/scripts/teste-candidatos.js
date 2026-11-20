// Teste ponta a ponta de GET /oportunidades/:id/candidatos e do download do curriculo
// por GET /oportunidades/:id/candidatos/:profissionalId/curriculo. Requer o servidor rodando.
// Cria 2 empresas, 2 candidatas e 1 vaga temporarias e REMOVE tudo no final.
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { query, closePool } = require('../db/pool');
const { DIR } = require('../src/middlewares/upload');
const { aprovarEmpresa } = require('./_aprovar');

const BASE = process.env.BASE_URL || 'http://localhost:3000/api/v1';
const stamp = Date.now();
const SENHA = 'senha12345';
const email = (p) => 'teste.cand.' + p + '.' + stamp + '@elab.test';
const E = { x: email('x'), y: email('y'), e1: email('emp1'), e2: email('emp2') };
let falhas = 0;

async function chamar(metodo, rota, corpo, tok) {
  const headers = tok ? { Authorization: 'Bearer ' + tok } : {};
  let body;
  if (corpo instanceof FormData) {
    body = corpo;
  } else if (corpo) {
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

function arquivo(conteudo, nome, tipo) {
  const f = new FormData();
  f.append('curriculo', new Blob([conteudo], { type: tipo }), nome);
  return f;
}

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
  await aprovarEmpresa(em);
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
    "INSERT INTO Oportunidades (Entidade_Parceira_idEntidade_Parceira, titulo, tipo, status, nivel, status_moderacao) VALUES (?, 'TESTE-CAND vaga', 'vaga', 'ativo', 'qualquer', 'aprovada')",
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

  // ---- Curriculo da candidata visto pela empresa ----
  const xId = lista[0] && lista[0].profissionalId;
  const yId = lista[1] && lista[1].profissionalId;
  const rotaCurriculo = (profId) => '/oportunidades/' + v.insertId + '/candidatos/' + profId + '/curriculo';

  conferir('lista informa que X ainda nao tem curriculo', lista[0] && lista[0].curriculoNome === null, lista[0]);

  r = await chamar('GET', rotaCurriculo(xId), null, emp1.token);
  conferir('sem curriculo anexado retorna 404', r.status === 404, r);

  const CONTEUDO = '%PDF-1.4\n% curriculo de teste\nconteudo\n';
  r = await chamar('POST', '/perfil/curriculo', arquivo(CONTEUDO, 'cv-x.pdf', 'application/pdf'), tokX);
  conferir('X envia o curriculo', r.status === 201, r);

  r = await chamar('GET', '/oportunidades/' + v.insertId + '/candidatos', null, emp1.token);
  const lista2 = dadosDe(r) || [];
  const x2 = lista2.find((i) => i.profissionalId === xId);
  conferir('lista passa a informar o nome do curriculo', !!x2 && x2.curriculoNome === 'cv-x.pdf', x2);

  r = await chamar('GET', rotaCurriculo(xId), null, emp1.token);
  conferir('empresa dona baixa o curriculo da inscrita', r.status === 200, r);
  conferir('download devolve o conteudo enviado', r.dados === CONTEUDO, { recebido: r.dados });

  r = await chamar('GET', rotaCurriculo(xId), null, emp2.token);
  conferir('outra empresa nao baixa o curriculo (403)', r.status === 403, r);
  r = await chamar('GET', rotaCurriculo(xId), null, tokX);
  conferir('colaboradora nao usa a rota da empresa (403)', r.status === 403, r);
  r = await chamar('GET', rotaCurriculo(xId), null, null);
  conferir('sem token nao baixa o curriculo (401)', r.status === 401, r);
  r = await chamar('GET', rotaCurriculo(yId), null, emp1.token);
  conferir('inscrita sem curriculo retorna 404', r.status === 404, r);
  r = await chamar('GET', rotaCurriculo(999999), null, emp1.token);
  conferir('profissional que nao se inscreveu retorna 404', r.status === 404, r);
  r = await chamar('GET', '/oportunidades/' + v.insertId + '/candidatos/0/curriculo', null, emp1.token);
  conferir('id de profissional invalido retorna 400', r.status === 400, r);

  r = await chamar('DELETE', '/perfil/curriculo', null, tokX);
  conferir('limpeza: remove o curriculo de X', r.status === 200, r);
}

main()
  .catch((err) => { console.error('ERRO', err); falhas++; })
  .finally(async () => {
    // Se o fluxo parou antes do DELETE do curriculo, apaga o arquivo no disco antes
    // de remover a usuario: depois do DELETE nao haveria mais como descobrir o nome.
    const cv = await query(
      'SELECT p.curriculo_arquivo AS arquivo FROM Profissionais p JOIN Usuarios u ON p.Usuario_idUsuario = u.idUsuario WHERE u.email = ?',
      [E.x]
    );
    if (cv[0] && cv[0].arquivo) fs.rmSync(path.join(DIR, path.basename(cv[0].arquivo)), { force: true });

    await query('DELETE FROM Usuarios WHERE email IN (?, ?, ?, ?)', [E.x, E.y, E.e1, E.e2]);
    const sobra = await query("SELECT COUNT(*) AS n FROM Oportunidades WHERE titulo LIKE 'TESTE-CAND%'");
    conferir('limpeza: nenhuma vaga de teste sobrou', Number(sobra[0].n) === 0, sobra);
    await closePool();
    console.log(falhas ? falhas + ' falha(s)' : 'TUDO OK');
    process.exit(falhas ? 1 : 0);
  });
