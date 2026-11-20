// Teste ponta a ponta da moderacao de publicacoes: visibilidade por papel,
// rejeicao com motivo, aprovacao e efeito no feed/inscricao. Requer o servidor
// rodando. Cria 1 admin, 2 empresas e 1 colaboradora temporarias e REMOVE tudo.
const bcrypt = require('bcryptjs');
const { query, closePool } = require('../db/pool');

const BASE = process.env.BASE_URL || 'http://localhost:3000/api/v1';
const stamp = Date.now();
const SENHA = 'senha12345';
const emailAdmin = 'teste.mod.admin.' + stamp + '@elab.test';
const emailDona = 'teste.mod.dona.' + stamp + '@elab.test';
const emailOutra = 'teste.mod.outra.' + stamp + '@elab.test';
const emailColab = 'teste.mod.colab.' + stamp + '@elab.test';
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

async function usuario(email, tipo) {
  const hash = await bcrypt.hash(SENHA, 4);
  return (await query('INSERT INTO Usuarios (email, senha, tipo_usuario) VALUES (?, ?, ?)', [email, hash, tipo])).insertId;
}

async function empresa(email, nome, cnpj, aprovada) {
  const uid = await usuario(email, 'entidade_parceira');
  const e = await query('INSERT INTO Entidades_Parceiras (Usuario_idUsuario, nome_organizacao, cnpj) VALUES (?, ?, ?)', [uid, nome, cnpj]);
  if (aprovada) {
    await query("UPDATE Entidades_Parceiras SET status_aprovacao = 'aprovada' WHERE idEntidade_Parceira = ?", [e.insertId]);
  }
  return e.insertId;
}

async function login(email) {
  const r = await chamar('POST', '/auth/login', { email, senha: SENHA });
  return dadosDe(r) && dadosDe(r).token;
}

async function main() {
  await usuario(emailAdmin, 'admin');
  await empresa(emailDona, 'Empresa Dona Mod', String(stamp).padStart(14, '0').slice(-14), true);
  await empresa(emailOutra, 'Empresa Outra Mod', String(stamp + 3).padStart(14, '0').slice(-14), true);

  const tokAdmin = await login(emailAdmin);
  const tokDona = await login(emailDona);
  const tokOutra = await login(emailOutra);
  await chamar('POST', '/auth/registrar', { nome: 'Colab Mod', email: emailColab, senha: SENHA, tipo: 'profissional' });
  const tokColab = await login(emailColab);
  conferir('logins dos quatro papéis', !!tokAdmin && !!tokDona && !!tokOutra && !!tokColab, { admin: !!tokAdmin, dona: !!tokDona, outra: !!tokOutra, colab: !!tokColab });
  if (!tokAdmin || !tokDona || !tokOutra || !tokColab) return;

  // ---- Criacao nasce pendente e some do feed publico ----
  let r = await chamar('POST', '/oportunidades', { titulo: 'TESTE-MOD publicacao', tipo: 'vaga', descricao: 'detalhe' }, tokDona);
  const id = dadosDe(r) && dadosDe(r).id;
  conferir('criar publicacao retorna 201 e id', r.status === 201 && !!id, r);
  if (!id) return;

  r = await chamar('GET', '/oportunidades');
  conferir('publicacao pendente nao aparece no feed publico', !(dadosDe(r) || []).some((o) => o.id === id), r.status);

  r = await chamar('GET', '/oportunidades/' + id);
  conferir('visita anonima recebe 404 na publicacao pendente', r.status === 404, r);
  r = await chamar('GET', '/oportunidades/' + id, null, tokDona);
  conferir('empresa dona ve a publicacao pendente (200)', r.status === 200 && dadosDe(r).status_moderacao === 'pendente', r);
  r = await chamar('GET', '/oportunidades/' + id, null, tokAdmin);
  conferir('admin ve a publicacao pendente (200)', r.status === 200, r);
  r = await chamar('GET', '/oportunidades/' + id, null, tokOutra);
  conferir('outra empresa recebe 404 (nao revela existencia)', r.status === 404, r);
  r = await chamar('GET', '/oportunidades/' + id, null, tokColab);
  conferir('colaboradora recebe 404 na publicacao pendente', r.status === 404, r);

  r = await chamar('POST', '/oportunidades/' + id + '/inscricoes', { mensagem: 'oi' }, tokColab);
  conferir('inscricao em publicacao pendente retorna 404', r.status === 404, r);

  // ---- Rejeicao ----
  r = await chamar('PUT', '/admin/oportunidades/' + id + '/moderacao', { status: 'rejeitada' }, tokAdmin);
  conferir('rejeitar sem motivo retorna 400', r.status === 400, r);
  r = await chamar('PUT', '/admin/oportunidades/' + id + '/moderacao', { status: 'rejeitada', motivo: 'Falta descrição' }, tokDona);
  conferir('empresa nao modera a propria publicacao (403)', r.status === 403, r);

  r = await chamar('PUT', '/admin/oportunidades/' + id + '/moderacao', { status: 'rejeitada', motivo: 'Falta descrição' }, tokAdmin);
  const rej = dadosDe(r);
  conferir('rejeitar com motivo grava status, motivo e data', r.status === 200 && rej && rej.status_moderacao === 'rejeitada' && rej.motivo_moderacao === 'Falta descrição' && !!rej.moderada_em, rej);

  r = await chamar('GET', '/oportunidades/' + id, null, tokDona);
  conferir('dona ve o motivo da rejeicao', r.status === 200 && dadosDe(r).motivo_moderacao === 'Falta descrição', r);
  r = await chamar('GET', '/oportunidades');
  conferir('publicacao rejeitada continua fora do feed', !(dadosDe(r) || []).some((o) => o.id === id), r.status);
  r = await chamar('POST', '/oportunidades/' + id + '/inscricoes', { mensagem: 'oi' }, tokColab);
  conferir('inscricao em publicacao rejeitada retorna 404', r.status === 404, r);

  // ---- Aprovacao ----
  r = await chamar('PUT', '/admin/oportunidades/' + id + '/moderacao', { status: 'aprovada' }, tokAdmin);
  const ok = dadosDe(r);
  conferir('aprovar limpa o motivo da rejeicao', r.status === 200 && ok && ok.status_moderacao === 'aprovada' && !ok.motivo_moderacao, ok);

  r = await chamar('GET', '/oportunidades');
  conferir('publicacao aprovada aparece no feed', (dadosDe(r) || []).some((o) => o.id === id), r.status);
  r = await chamar('GET', '/oportunidades/' + id);
  conferir('visita anonima le a publicacao aprovada', r.status === 200, r);
  r = await chamar('POST', '/oportunidades/' + id + '/inscricoes', { mensagem: 'quero' }, tokColab);
  conferir('inscricao em publicacao aprovada retorna 201', r.status === 201 && !!dadosDe(r).protocolo, r);

  // ---- Fila e erros ----
  r = await chamar('GET', '/admin/oportunidades?status=aprovada', null, tokAdmin);
  conferir('fila filtrada por aprovada inclui a publicacao', (dadosDe(r) || []).some((o) => o.id === id && o.status_moderacao === 'aprovada'), r.status);
  r = await chamar('PUT', '/admin/oportunidades/999999999/moderacao', { status: 'aprovada' }, tokAdmin);
  conferir('moderar publicacao inexistente retorna 404', r.status === 404, r);
  r = await chamar('PUT', '/admin/oportunidades/' + id + '/moderacao', { status: 'pendente' }, tokAdmin);
  conferir('status pendente nao e aceito na moderacao (400)', r.status === 400, r);
}

main()
  .catch((err) => { console.error('ERRO', err); falhas++; })
  .finally(async () => {
    await query('DELETE FROM Usuarios WHERE email IN (?, ?, ?, ?)', [emailAdmin, emailDona, emailOutra, emailColab]);
    const sobra = await query("SELECT COUNT(*) AS n FROM Oportunidades WHERE titulo LIKE 'TESTE-MOD %'");
    conferir('limpeza: nenhuma publicacao de teste sobrou', Number(sobra[0].n) === 0, sobra);
    await closePool();
    console.log(falhas ? falhas + ' falha(s)' : 'TUDO OK');
    process.exit(falhas ? 1 : 0);
  });
