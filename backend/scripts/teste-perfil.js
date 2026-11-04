// Teste ponta a ponta do perfil. Requer o servidor rodando (npm run dev em outro terminal).
// Cria uma usuaria temporaria e a REMOVE no final (nao deixa dado no banco).
const { query, closePool } = require('../db/pool');

const BASE = process.env.BASE_URL || 'http://localhost:3000/api/v1';
const email = 'teste.' + Date.now() + '@elab.test';
let token = '';
let falhas = 0;

async function chamar(metodo, rota, corpo) {
  const headers = token ? { Authorization: 'Bearer ' + token } : {};
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
  console.log((cond ? 'OK     ' : 'FALHOU ') + nome + (cond ? '' : ' -> ' + JSON.stringify(detalhe)));
  if (!cond) falhas++;
}

function arquivo(conteudo, nome, tipo) {
  const f = new FormData();
  f.append('curriculo', new Blob([conteudo], { type: tipo }), nome);
  return f;
}

async function main() {
  let r = await chamar('POST', '/auth/registrar', { nome: 'Teste Perfil', email, senha: 'senha12345', tipo: 'profissional' });
  conferir('registrar', [200, 201].includes(r.status), r);

  r = await chamar('POST', '/auth/login', { email, senha: 'senha12345' });
  token = r.dados && r.dados.dados && r.dados.dados.token;
  conferir('login devolve token', !!token, r);
  if (!token) return;

  const guardado = token;
  token = '';
  r = await chamar('GET', '/perfil/completo');
  conferir('sem token retorna 401', r.status === 401, r);
  token = guardado;

  r = await chamar('GET', '/perfil/completo');
  conferir('perfil novo tem completude baixa', r.status === 200 && r.dados.dados.completude.percentual < 30, r);

  const hab = (await chamar('GET', '/catalogo/habilidades')).dados.dados;
  const areas = (await chamar('GET', '/catalogo/areas')).dados.dados.lista;
  const area = areas.find((a) => a.slug === 'backend-node');
  const habs = ['node', 'javascript', 'sql'].map((n) => hab.find((h) => h.nome === n)).filter(Boolean);
  conferir('catalogo tem dados para o teste', !!area && habs.length === 3, { area, habs: habs.length });

  r = await chamar('PUT', '/perfil/dados', {
    titulo_profissional: 'Desenvolvedora Backend', resumo: 'Resumo de teste.', nivel: 'junior',
    cidade: 'Sabará', estado: 'MG', link_github: 'https://github.com/teste', anos_experiencia: 2
  });
  conferir('salvar dados', r.status === 200 && r.dados.dados.nivel === 'junior', r);

  r = await chamar('PUT', '/perfil/dados', { estado: 'XX' });
  conferir('estado invalido retorna 400', r.status === 400, r);

  r = await chamar('PUT', '/perfil/preferencias', { modalidade: 'remoto', aceita_clt: true, pretensao_min: 4000 });
  conferir('salvar preferencias', r.status === 200 && r.dados.dados.preferencias.modalidade === 'remoto', r);

  r = await chamar('PUT', '/perfil/areas', { areas: [{ areaId: area.id, interesse: 5 }] });
  conferir('salvar areas', r.status === 200 && r.dados.dados.areas.length === 1, r);

  r = await chamar('PUT', '/perfil/habilidades', { habilidades: habs.map((h) => ({ habilidadeId: h.id, anos: 2 })) });
  conferir('salvar habilidades', r.status === 200 && r.dados.dados.habilidades.length === 3, r);

  r = await chamar('POST', '/perfil/experiencias', {
    cargo: 'Dev Backend', empresa: 'Empresa X', data_inicio: '2023-02-01', atual: true, descricao: 'API em Node.js'
  });
  conferir('criar experiencia', r.status === 201 && r.dados.dados.atual === 1, r);
  const expId = r.dados && r.dados.dados && r.dados.dados.id;

  r = await chamar('PUT', '/perfil/experiencias/' + expId, {
    cargo: 'Dev Backend Pleno', empresa: 'Empresa X', data_inicio: '2023-02-01', data_fim: '2024-01-31', atual: false
  });
  conferir('editar experiencia', r.status === 200 && r.dados.dados.cargo === 'Dev Backend Pleno', r);

  r = await chamar('POST', '/perfil/experiencias', {
    cargo: 'A', empresa: 'B', data_inicio: '2024-05-01', data_fim: '2024-01-01'
  });
  conferir('data fim anterior ao inicio retorna 400', r.status === 400, r);

  r = await chamar('POST', '/perfil/formacoes', {
    instituicao: 'UFMG', curso: 'Sistemas de Informação', grau: 'graduacao', status: 'cursando', data_inicio: '2022-02-01'
  });
  conferir('criar formacao', r.status === 201, r);

  r = await chamar('DELETE', '/perfil/experiencias/999999');
  conferir('apagar item inexistente retorna 404', r.status === 404, r);

  r = await chamar('POST', '/perfil/curriculo', arquivo('%PDF-1.4\n% teste\n', 'meu-curriculo.pdf', 'application/pdf'));
  conferir('upload de PDF valido', r.status === 201, r);

  r = await chamar('POST', '/perfil/curriculo', arquivo('MZ-isto-nao-e-um-pdf', 'falso.pdf', 'application/pdf'));
  conferir('PDF falso e rejeitado', r.status === 400, r);

  r = await chamar('POST', '/perfil/curriculo', arquivo('texto', 'x.txt', 'text/plain'));
  conferir('extensao nao permitida e rejeitada', r.status === 400, r);

  r = await chamar('GET', '/perfil/curriculo');
  conferir('download do curriculo', r.status === 200, r);

  r = await chamar('GET', '/perfil/completo');
  conferir('perfil completo chega a 100%', r.status === 200 && r.dados.dados.completude.percentual === 100, r.dados && r.dados.dados && r.dados.dados.completude);

  r = await chamar('DELETE', '/perfil/curriculo');
  conferir('remover curriculo', r.status === 200, r);

  r = await chamar('GET', '/perfil/curriculo');
  conferir('sem curriculo retorna 404', r.status === 404, r);
}

main()
  .catch((e) => { console.error('ERRO', e); falhas++; })
  .finally(async () => {
    await query('DELETE FROM Usuarios WHERE email = ?', [email]);
    await closePool();
    console.log(falhas ? falhas + ' falha(s)' : 'TUDO OK');
    process.exit(falhas ? 1 : 0);
  });
