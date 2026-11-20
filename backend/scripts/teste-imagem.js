// Teste ponta a ponta do banner das publicacoes: upload, visibilidade na API,
// arquivo em disco, troca que reabre a moderacao e remocao. Requer o servidor
// rodando. Cria 2 empresas aprovadas e 1 colaboradora temporarias e REMOVE tudo.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const bcrypt = require('bcryptjs');
const { query, closePool } = require('../db/pool');

const BASE = process.env.BASE_URL || 'http://localhost:3000/api/v1';
const DIR_POSTAGENS = path.join(__dirname, '..', 'uploads', 'postagens');
const stamp = Date.now();
const SENHA = 'senha12345';
const emailDona = 'teste.img.dona.' + stamp + '@elab.test';
const emailOutra = 'teste.img.outra.' + stamp + '@elab.test';
const emailColab = 'teste.img.colab.' + stamp + '@elab.test';
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
const nomeDoArquivo = (url) => (url ? path.basename(url) : null);
const existeNoDisco = (nome) => !!nome && fs.existsSync(path.join(DIR_POSTAGENS, nome));

async function usuario(email, tipo) {
  const hash = await bcrypt.hash(SENHA, 4);
  return (await query('INSERT INTO Usuarios (email, senha, tipo_usuario) VALUES (?, ?, ?)', [email, hash, tipo])).insertId;
}

async function empresa(email, nome, cnpj) {
  const uid = await usuario(email, 'entidade_parceira');
  const e = await query('INSERT INTO Entidades_Parceiras (Usuario_idUsuario, nome_organizacao, cnpj) VALUES (?, ?, ?)', [uid, nome, cnpj]);
  await query("UPDATE Entidades_Parceiras SET status_aprovacao = 'aprovada' WHERE idEntidade_Parceira = ?", [e.insertId]);
  return e.insertId;
}

async function login(email) {
  const r = await chamar('POST', '/auth/login', { email, senha: SENHA });
  return dadosDe(r) && dadosDe(r).token;
}

async function imagemForm(buffer, tipo) {
  const fd = new FormData();
  fd.append('imagem', new Blob([buffer], { type: tipo || 'image/png' }), 'banner.png');
  return fd;
}

async function main() {
  await empresa(emailDona, 'Empresa Dona Img', String(stamp).padStart(14, '0').slice(-14));
  await empresa(emailOutra, 'Empresa Outra Img', String(stamp + 5).padStart(14, '0').slice(-14));
  await chamar('POST', '/auth/registrar', { nome: 'Colab Img', email: emailColab, senha: SENHA, tipo: 'profissional' });

  const tokDona = await login(emailDona);
  const tokOutra = await login(emailOutra);
  const tokColab = await login(emailColab);
  conferir('logins das empresas e da colaboradora', !!tokDona && !!tokOutra && !!tokColab, { dona: !!tokDona, outra: !!tokOutra, colab: !!tokColab });
  if (!tokDona || !tokOutra || !tokColab) return;

  // ---- Criacao e upload ----
  let r = await chamar('POST', '/oportunidades', { titulo: 'TESTE-IMG publicacao', tipo: 'vaga', descricao: 'detalhe' }, tokDona);
  const id = dadosDe(r) && dadosDe(r).id;
  conferir('criar publicacao retorna 201 e id', r.status === 201 && !!id, r);
  if (!id) return;

  const png = await sharp({ create: { width: 40, height: 30, channels: 3, background: '#3366cc' } }).png().toBuffer();

  r = await chamar('PUT', '/oportunidades/' + id + '/imagem', await imagemForm(png), tokDona);
  const enviada = dadosDe(r);
  const primeiroNome = nomeDoArquivo(enviada && enviada.imagemUrl);
  conferir('enviar banner retorna 201 com URL /media/postagens', r.status === 201 && /^\/media\/postagens\/[0-9a-f]{32}\.webp$/.test(enviada && enviada.imagemUrl), enviada);
  conferir('arquivo do banner existe em uploads/postagens', existeNoDisco(primeiroNome), primeiroNome);

  r = await chamar('GET', '/oportunidades/minhas', null, tokDona);
  const minha = (dadosDe(r) || []).find((o) => o.id === id);
  conferir('listagem da empresa expoe imagemUrl', !!minha && minha.imagemUrl === enviada.imagemUrl, minha);

  r = await chamar('GET', '/oportunidades/' + id, null, tokDona);
  conferir('detalhe da empresa dona expoe imagemUrl', r.status === 200 && dadosDe(r).imagemUrl === enviada.imagemUrl, r.dados);
  r = await chamar('GET', '/oportunidades/' + id);
  conferir('publicacao pendente segue invisivel ao anonimo (404)', r.status === 404, r);

  // ---- Autorizacao e erros de envio ----
  r = await chamar('PUT', '/oportunidades/' + id + '/imagem', await imagemForm(png), tokOutra);
  conferir('outra empresa nao anexa banner (403)', r.status === 403, r);
  r = await chamar('PUT', '/oportunidades/999999999/imagem', await imagemForm(png), tokDona);
  conferir('anexar em publicacao inexistente retorna 404', r.status === 404, r);
  r = await chamar('PUT', '/oportunidades/' + id + '/imagem', await imagemForm(png), tokColab);
  conferir('colaboradora nao anexa banner (403)', r.status === 403, r);
  r = await chamar('PUT', '/oportunidades/' + id + '/imagem', await imagemForm(Buffer.from('isto nao e imagem'), 'image/png'), tokDona);
  conferir('conteudo que nao e imagem retorna 400 (assinatura invalida)', r.status === 400 && /inválid/i.test(JSON.stringify(r.dados)), r);
  const fdSemArquivo = new FormData();
  fdSemArquivo.append('outro', 'x');
  r = await chamar('PUT', '/oportunidades/' + id + '/imagem', fdSemArquivo, tokDona);
  conferir('envio sem arquivo retorna 400', r.status === 400, r);

  // ---- Aprovacao mantem o banner ----
  await query("UPDATE Oportunidades SET status_moderacao = 'aprovada', moderada_em = NOW() WHERE idOportunidade = ?", [id]);
  r = await chamar('GET', '/oportunidades/' + id);
  conferir('publicacao aprovada mostra o banner ao anonimo', r.status === 200 && dadosDe(r).imagemUrl === enviada.imagemUrl, r.dados);
  r = await chamar('GET', '/oportunidades');
  const noFeed = (dadosDe(r) || []).find((o) => o.id === id);
  conferir('feed publico traz a imagemUrl da publicacao', !!noFeed && noFeed.imagemUrl === enviada.imagemUrl, noFeed);

  // ---- Trocar banner aprovado reabre a moderacao e apaga o arquivo antigo ----
  const png2 = await sharp({ create: { width: 60, height: 20, channels: 3, background: '#cc3333' } }).png().toBuffer();
  r = await chamar('PUT', '/oportunidades/' + id + '/imagem', await imagemForm(png2), tokDona);
  const trocada = dadosDe(r);
  const segundoNome = nomeDoArquivo(trocada && trocada.imagemUrl);
  conferir('trocar banner retorna 201 com nova URL', r.status === 201 && !!segundoNome && segundoNome !== primeiroNome, trocada);
  conferir('arquivo antigo foi apagado do disco', !existeNoDisco(primeiroNome), primeiroNome);
  conferir('novo arquivo existe no disco', existeNoDisco(segundoNome), segundoNome);

  r = await chamar('GET', '/oportunidades/' + id, null, tokDona);
  conferir('trocar banner de publicacao aprovada reabre a moderacao', r.status === 200 && dadosDe(r).status_moderacao === 'pendente', r.dados);
  r = await chamar('GET', '/oportunidades/' + id);
  conferir('publicacao reaberta sai do detalhe publico (404)', r.status === 404, r);

  // ---- Remocao ----
  r = await chamar('DELETE', '/oportunidades/' + id + '/imagem', null, tokOutra);
  conferir('outra empresa nao remove banner (403)', r.status === 403, r);
  r = await chamar('DELETE', '/oportunidades/' + id + '/imagem', null, tokDona);
  conferir('empresa dona remove o banner (200)', r.status === 200 && dadosDe(r).removido === true, r);
  conferir('arquivo removido do disco', !existeNoDisco(segundoNome), segundoNome);

  r = await chamar('GET', '/oportunidades/' + id, null, tokDona);
  conferir('publicacao fica sem imagemUrl apos remover', r.status === 200 && dadosDe(r).imagemUrl === null, r.dados);
  r = await chamar('DELETE', '/oportunidades/' + id + '/imagem', null, tokDona);
  conferir('remover de novo retorna 404 (sem imagem)', r.status === 404, r);
  r = await chamar('DELETE', '/oportunidades/999999999/imagem', null, tokDona);
  conferir('remover de publicacao inexistente retorna 404', r.status === 404, r);
}

main()
  .catch((err) => { console.error('ERRO', err); falhas++; })
  .finally(async () => {
    const pubs = await query("SELECT imagem_arquivo FROM Oportunidades WHERE titulo LIKE 'TESTE-IMG %'");
    for (const p of pubs) {
      if (p.imagem_arquivo) fs.promises.unlink(path.join(DIR_POSTAGENS, path.basename(p.imagem_arquivo))).catch(() => {});
    }
    await query('DELETE FROM Usuarios WHERE email IN (?, ?, ?)', [emailDona, emailOutra, emailColab]);
    const sobra = await query("SELECT COUNT(*) AS n FROM Oportunidades WHERE titulo LIKE 'TESTE-IMG %'");
    conferir('limpeza: nenhuma publicacao de teste sobrou', Number(sobra[0].n) === 0, sobra);
    await closePool();
    console.log(falhas ? falhas + ' falha(s)' : 'TUDO OK');
    process.exit(falhas ? 1 : 0);
  });
