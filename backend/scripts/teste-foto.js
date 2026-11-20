// Teste ponta a ponta da foto de perfil: upload, exposicao na API, arquivo em
// disco (WebP 512x512), troca que apaga a anterior e remocao. Requer o servidor
// rodando. Cria 1 colaboradora temporaria e REMOVE tudo.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const bcrypt = require('bcryptjs');
const { query, closePool } = require('../db/pool');

const BASE = process.env.BASE_URL || 'http://localhost:3000/api/v1';
const RAIZ = BASE.replace(/\/api\/v1\/?$/, '');
const DIR_FOTOS = path.join(__dirname, '..', 'uploads', 'fotos');
const stamp = Date.now();
const SENHA = 'senha12345';
const emailColab = 'teste.foto.' + stamp + '@elab.test';
const emailEmpresa = 'teste.foto.emp.' + stamp + '@elab.test';
let falhas = 0;

async function chamar(metodo, rota, corpo, tok, base) {
  const headers = tok ? { Authorization: 'Bearer ' + tok } : {};
  let body;
  if (corpo instanceof FormData) {
    body = corpo;
  } else if (corpo) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(corpo);
  }
  const r = await fetch((base || BASE) + rota, { method: metodo, headers, body });
  const tipo = r.headers.get('content-type') || '';
  const dados = tipo.includes('json') ? await r.json() : await r.text();
  return { status: r.status, dados, tipo };
}

function conferir(nome, cond, detalhe) {
  const msg = cond ? '' : ' -> ' + JSON.stringify(detalhe);
  console.log((cond ? 'OK     ' : 'FALHOU ') + nome + msg);
  if (!cond) falhas++;
}

const dadosDe = (r) => (r.dados && r.dados.dados) || null;
const nomeDoArquivo = (url) => (url ? path.basename(url) : null);
const existeNoDisco = (nome) => !!nome && fs.existsSync(path.join(DIR_FOTOS, nome));

async function usuario(email, tipo = 'profissional') {
  const hash = await bcrypt.hash(SENHA, 4);
  return (await query('INSERT INTO Usuarios (email, senha, tipo_usuario) VALUES (?, ?, ?)', [email, hash, tipo])).insertId;
}

async function login(email) {
  const r = await chamar('POST', '/auth/login', { email, senha: SENHA });
  return dadosDe(r) && dadosDe(r).token;
}

function fotoForm(buffer, tipo) {
  const fd = new FormData();
  fd.append('foto', new Blob([buffer], { type: tipo || 'image/png' }), 'foto.png');
  return fd;
}

// Empresa tambem tem foto: o servico e as rotas nao restringem papel.
async function empresa(email) {
  const uid = await usuario(email, 'entidade_parceira');
  await query(
    'INSERT INTO Entidades_Parceiras (Usuario_idUsuario, nome_organizacao, cnpj) VALUES (?, ?, ?)',
    [uid, 'Empresa Foto', 'F' + String(stamp).slice(-13)]
  );
  return login(email);
}

async function main() {
  const uid = await usuario(emailColab);
  await query('INSERT INTO Profissionais (Usuario_idUsuario, nome) VALUES (?, ?)', [uid, 'Colab Foto']);
  const tok = await login(emailColab);
  conferir('login da colaboradora', !!tok, { tok: !!tok });
  if (!tok) return;

  // ---- Envio ----
  const png = await sharp({ create: { width: 40, height: 30, channels: 3, background: '#3366cc' } }).png().toBuffer();

  let r = await chamar('POST', '/perfil/foto', await fotoForm(png), tok);
  const enviada = dadosDe(r);
  const primeiroNome = nomeDoArquivo(enviada && enviada.fotoUrl);
  conferir('enviar foto retorna 201 com URL /media/fotos', r.status === 201 && /^\/media\/fotos\/[0-9a-f]{32}\.webp$/.test(enviada && enviada.fotoUrl), enviada);
  conferir('arquivo da foto existe em uploads/fotos', existeNoDisco(primeiroNome), primeiroNome);

  r = await chamar('GET', '/perfil', null, tok);
  conferir('perfil expoe fotoUrl', r.status === 200 && dadosDe(r).fotoUrl === enviada.fotoUrl, dadosDe(r));
  const gravada = await query('SELECT foto_arquivo FROM Usuarios WHERE idUsuario = ?', [uid]);
  conferir('banco guarda o nome do arquivo gravado', gravada[0] && gravada[0].foto_arquivo === primeiroNome, gravada);

  // ---- A foto gravada e um WebP real de 512x512 sem metadados ----
  const meta = await sharp(path.join(DIR_FOTOS, primeiroNome)).metadata();
  conferir('arquivo gravado e WebP 512x512', meta.format === 'webp' && meta.width === 512 && meta.height === 512, { formato: meta.format, largura: meta.width, altura: meta.height });
  conferir('arquivo gravado nao guarda EXIF', !meta.exif && !meta.icc, { exif: !!meta.exif, icc: !!meta.icc });

  r = await chamar('GET', '/media/fotos/' + primeiroNome, null, null, RAIZ);
  conferir('foto e servida publicamente em /media/fotos', r.status === 200 && r.tipo.includes('image/webp'), { status: r.status, tipo: r.tipo });

  // ---- Troca apaga a anterior ----
  const png2 = await sharp({ create: { width: 60, height: 20, channels: 3, background: '#cc3333' } }).png().toBuffer();
  r = await chamar('POST', '/perfil/foto', await fotoForm(png2), tok);
  const trocada = dadosDe(r);
  const segundoNome = nomeDoArquivo(trocada && trocada.fotoUrl);
  conferir('trocar foto retorna 201 com nova URL', r.status === 201 && !!segundoNome && segundoNome !== primeiroNome, trocada);
  conferir('arquivo antigo foi apagado do disco', !existeNoDisco(primeiroNome), primeiroNome);
  conferir('novo arquivo existe no disco', existeNoDisco(segundoNome), segundoNome);

  r = await chamar('GET', '/perfil', null, tok);
  conferir('perfil passa a apontar para a foto nova', dadosDe(r).fotoUrl === trocada.fotoUrl, dadosDe(r));

  // ---- Erros de envio e autorizacao ----
  r = await chamar('POST', '/perfil/foto', await fotoForm(Buffer.from('isto nao e imagem'), 'image/png'), tok);
  conferir('conteudo que nao e imagem retorna 400 (assinatura invalida)', r.status === 400 && /inválid/i.test(JSON.stringify(r.dados)), r);
  conferir('envio invalido nao apaga a foto valida atual', existeNoDisco(segundoNome), segundoNome);

  const fdSemArquivo = new FormData();
  fdSemArquivo.append('outro', 'x');
  r = await chamar('POST', '/perfil/foto', fdSemArquivo, tok);
  conferir('envio sem arquivo retorna 400', r.status === 400, r);

  r = await chamar('POST', '/perfil/foto', await fotoForm(png));
  conferir('enviar foto sem token retorna 401', r.status === 401, r);

  // ---- Remocao ----
  r = await chamar('DELETE', '/perfil/foto', null, tok);
  conferir('remover foto retorna 200 com removido=true', r.status === 200 && dadosDe(r).removido === true, r);
  conferir('arquivo removido do disco', !existeNoDisco(segundoNome), segundoNome);

  r = await chamar('GET', '/perfil', null, tok);
  conferir('perfil fica sem fotoUrl apos remover', r.status === 200 && dadosDe(r).fotoUrl === null, dadosDe(r));

  r = await chamar('DELETE', '/perfil/foto', null, tok);
  conferir('remover de novo retorna 404 (sem foto)', r.status === 404, r);

  // ---- Empresa tambem tem foto de perfil ----
  const tokEmpresa = await empresa(emailEmpresa);
  conferir('login da empresa', !!tokEmpresa, { tok: !!tokEmpresa });
  if (tokEmpresa) {
    r = await chamar('POST', '/perfil/foto', await fotoForm(png), tokEmpresa);
    const fotoEmpresa = dadosDe(r);
    const nomeEmpresa = nomeDoArquivo(fotoEmpresa && fotoEmpresa.fotoUrl);
    conferir('empresa envia foto de perfil', r.status === 201 && existeNoDisco(nomeEmpresa), fotoEmpresa);

    r = await chamar('GET', '/perfil', null, tokEmpresa);
    conferir('perfil da empresa expoe fotoUrl', r.status === 200 && dadosDe(r).fotoUrl === fotoEmpresa.fotoUrl, dadosDe(r));

    r = await chamar('DELETE', '/perfil/foto', null, tokEmpresa);
    conferir('empresa remove a foto de perfil', r.status === 200 && !existeNoDisco(nomeEmpresa), r);
  }
}

main()
  .catch((err) => { console.error('ERRO', err); falhas++; })
  .finally(async () => {
    // Se uma falha deixou foto gravada, apaga o arquivo antes de remover os usuarios.
    const rows = await query('SELECT foto_arquivo FROM Usuarios WHERE email IN (?, ?)', [emailColab, emailEmpresa]);
    for (const u of rows) {
      if (u.foto_arquivo) {
        fs.promises.unlink(path.join(DIR_FOTOS, path.basename(u.foto_arquivo))).catch(() => {});
      }
    }
    await query('DELETE FROM Usuarios WHERE email IN (?, ?)', [emailColab, emailEmpresa]);
    const sobra = await query('SELECT COUNT(*) AS n FROM Usuarios WHERE email IN (?, ?)', [emailColab, emailEmpresa]);
    conferir('limpeza: nenhum usuario de teste sobrou', Number(sobra[0].n) === 0, sobra);
    await closePool();
    console.log(falhas ? falhas + ' falha(s)' : 'TUDO OK');
    process.exit(falhas ? 1 : 0);
  });
