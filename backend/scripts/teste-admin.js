// Teste ponta a ponta do modulo administrativo (aprovacao de empresas e fila de
// publicacoes). Requer o servidor rodando. Cria 1 admin e 2 empresas temporarias e
// REMOVE tudo no final.
const bcrypt = require('bcryptjs');
const { query, closePool } = require('../db/pool');

const BASE = process.env.BASE_URL || 'http://localhost:3000/api/v1';
const stamp = Date.now();
const SENHA = 'senha12345';
const emailAdmin = 'teste.admin.' + stamp + '@elab.test';
const emailA = 'teste.admin.emp.a.' + stamp + '@elab.test';
const emailB = 'teste.admin.emp.b.' + stamp + '@elab.test';
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

async function criarUsuario(email, tipo) {
  const hash = await bcrypt.hash(SENHA, 4);
  const u = await query('INSERT INTO Usuarios (email, senha, tipo_usuario) VALUES (?, ?, ?)', [email, hash, tipo]);
  return u.insertId;
}

async function criarEmpresa(email, nome, cnpj) {
  const uid = await criarUsuario(email, 'entidade_parceira');
  const e = await query(
    'INSERT INTO Entidades_Parceiras (Usuario_idUsuario, nome_organizacao, cnpj) VALUES (?, ?, ?)',
    [uid, nome, cnpj]
  );
  return e.insertId;
}

async function login(email) {
  const r = await chamar('POST', '/auth/login', { email, senha: SENHA });
  return dadosDe(r) && dadosDe(r).token;
}

async function main() {
  await criarUsuario(emailAdmin, 'admin');
  const idA = await criarEmpresa(emailA, 'Empresa A Admin', String(stamp).padStart(14, '0').slice(-14));
  const idB = await criarEmpresa(emailB, 'Empresa B Admin', String(stamp + 7).padStart(14, '0').slice(-14));

  const tokAdmin = await login(emailAdmin);
  const tokA = await login(emailA);
  conferir('login do admin e da empresa', !!tokAdmin && !!tokA, { admin: !!tokAdmin, empresa: !!tokA });
  if (!tokAdmin || !tokA) return;

  // ---- Controle de acesso ----
  let r = await chamar('GET', '/admin/empresas', null, tokA);
  conferir('empresa nao acessa o modulo admin (403)', r.status === 403, r);
  r = await chamar('GET', '/admin/empresas');
  conferir('visita anonima nao acessa o modulo admin (401)', r.status === 401, r);

  // ---- Listagem e filtro ----
  r = await chamar('GET', '/admin/empresas', null, tokAdmin);
  const lista = dadosDe(r) || [];
  const a = lista.find((e) => e.id === idA);
  conferir('empresa pendente aparece na fila do admin', r.status === 200 && !!a && a.statusAprovacao === 'pendente', a);
  conferir('fila do admin traz e-mail e CNPJ da empresa', !!a && a.email === emailA && String(a.cnpj).length === 14, a);

  r = await chamar('GET', '/admin/empresas?status=pendente', null, tokAdmin);
  const pendentes = dadosDe(r) || [];
  conferir('filtro por status devolve so pendentes', pendentes.every((e) => e.statusAprovacao === 'pendente'), pendentes.map((e) => e.statusAprovacao));
  r = await chamar('GET', '/admin/empresas?status=inexistente', null, tokAdmin);
  conferir('filtro com status invalido retorna 400', r.status === 400, r);

  // ---- Rejeicao exige motivo ----
  r = await chamar('PUT', '/admin/empresas/' + idA + '/status', { status: 'rejeitada' }, tokAdmin);
  conferir('rejeitar sem motivo retorna 400', r.status === 400, r);

  r = await chamar('PUT', '/admin/empresas/' + idA + '/status', { status: 'rejeitada', motivo: 'CNPJ não confere' }, tokAdmin);
  const rejeitada = dadosDe(r);
  conferir('rejeitar com motivo retorna 200 e grava o motivo', r.status === 200 && rejeitada && rejeitada.statusAprovacao === 'rejeitada' && rejeitada.motivoRejeicao === 'CNPJ não confere', r);

  r = await chamar('POST', '/oportunidades', { titulo: 'TESTE-ADMIN bloqueada', tipo: 'vaga' }, tokA);
  conferir('empresa rejeitada nao publica (403)', r.status === 403, r);

  // ---- Aprovacao libera a publicacao ----
  r = await chamar('PUT', '/admin/empresas/' + idA + '/status', { status: 'aprovada' }, tokAdmin);
  const aprovada = dadosDe(r);
  conferir('aprovar limpa o motivo de rejeicao', r.status === 200 && aprovada && aprovada.statusAprovacao === 'aprovada' && !aprovada.motivoRejeicao, r);

  r = await chamar('POST', '/oportunidades', { titulo: 'TESTE-ADMIN liberada', tipo: 'vaga' }, tokA);
  conferir('empresa aprovada publica normalmente (201)', r.status === 201, r);

  // ---- Publicacao nasce pendente e aparece na fila ----
  r = await chamar('GET', '/admin/oportunidades?status=pendente', null, tokAdmin);
  const pubs = dadosDe(r) || [];
  const minha = pubs.find((o) => o.titulo === 'TESTE-ADMIN liberada');
  conferir('publicacao nova entra na fila de moderacao do admin', r.status === 200 && !!minha && minha.status_moderacao === 'pendente', minha);
  conferir('fila do admin traz o nome da empresa', !!minha && minha.empresaNome === 'Empresa A Admin', minha && minha.empresaNome);

  r = await chamar('GET', '/admin/oportunidades', null, tokA);
  conferir('empresa nao le a fila de publicacoes (403)', r.status === 403, r);
  r = await chamar('GET', '/admin/oportunidades?status=xpto', null, tokAdmin);
  conferir('fila com status invalido retorna 400', r.status === 400, r);

  // ---- Idempotencia e alvos invalidos ----
  r = await chamar('PUT', '/admin/empresas/' + idA + '/status', { status: 'aprovada' }, tokAdmin);
  conferir('aprovar de novo continua 200', r.status === 200 && dadosDe(r).statusAprovacao === 'aprovada', r);
  r = await chamar('PUT', '/admin/empresas/999999999/status', { status: 'aprovada' }, tokAdmin);
  conferir('empresa inexistente retorna 404', r.status === 404, r);
  r = await chamar('PUT', '/admin/empresas/' + idB + '/status', { status: 'sumida' }, tokAdmin);
  conferir('status invalido retorna 400', r.status === 400, r);
}

main()
  .catch((err) => { console.error('ERRO', err); falhas++; })
  .finally(async () => {
    await query('DELETE FROM Usuarios WHERE email IN (?, ?, ?)', [emailAdmin, emailA, emailB]);
    const sobra = await query("SELECT COUNT(*) AS n FROM Oportunidades WHERE titulo LIKE 'TESTE-ADMIN %'");
    conferir('limpeza: nenhuma publicacao de teste sobrou', Number(sobra[0].n) === 0, sobra);
    const empresas = await query(
      "SELECT COUNT(*) AS n FROM Entidades_Parceiras WHERE nome_organizacao IN ('Empresa A Admin', 'Empresa B Admin')"
    );
    conferir('limpeza: nenhuma empresa de teste sobrou', Number(empresas[0].n) === 0, empresas);
    await closePool();
    console.log(falhas ? falhas + ' falha(s)' : 'TUDO OK');
    process.exit(falhas ? 1 : 0);
  });
