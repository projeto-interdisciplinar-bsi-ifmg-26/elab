// Teste ponta a ponta da criacao de vaga com requisitos. Requer o servidor rodando.
// Cria 1 empresa e 1 candidata temporarias e REMOVE tudo no final.
const bcrypt = require('bcryptjs');
const { query, closePool } = require('../db/pool');

const BASE = process.env.BASE_URL || 'http://localhost:3000/api/v1';
const stamp = Date.now();
const SENHA = 'senha12345';
const emailEmp = 'teste.vaga.emp.' + stamp + '@elab.test';
const emailCand = 'teste.vaga.cand.' + stamp + '@elab.test';
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

async function main() {
  const hash = await bcrypt.hash(SENHA, 4);
  const u = await query('INSERT INTO Usuarios (email, senha, tipo_usuario) VALUES (?, ?, ?)', [emailEmp, hash, 'entidade_parceira']);
  await query(
    'INSERT INTO Entidades_Parceiras (Usuario_idUsuario, nome_organizacao, cnpj) VALUES (?, ?, ?)',
    [u.insertId, 'Empresa Teste Vaga', String(stamp).padStart(14, '0').slice(-14)]
  );
  let r = await chamar('POST', '/auth/login', { email: emailEmp, senha: SENHA });
  const tokEmp = dadosDe(r) && dadosDe(r).token;
  conferir('login da empresa', !!tokEmp, r);

  await chamar('POST', '/auth/registrar', { nome: 'Teste Vaga Cand', email: emailCand, senha: SENHA, tipo: 'profissional' });
  r = await chamar('POST', '/auth/login', { email: emailCand, senha: SENHA });
  const tokCand = dadosDe(r) && dadosDe(r).token;
  conferir('login da candidata', !!tokCand, r);
  if (!tokEmp || !tokCand) return;

  const hab = dadosDe(await chamar('GET', '/catalogo/habilidades'));
  const areas = dadosDe(await chamar('GET', '/catalogo/areas')).lista;
  const js = hab.find((h) => h.nome === 'javascript');
  const node = hab.find((h) => h.nome === 'node');
  const area = areas.find((a) => a.slug === 'backend-node');
  conferir('catalogo tem javascript, node e backend-node', !!js && !!node && !!area, { js: !!js, node: !!node, area: !!area });
  if (!js || !node || !area) return;

  r = await chamar('PUT', '/perfil/dados', { nivel: 'junior' }, tokCand);
  conferir('candidata: nivel', r.status === 200, r);
  r = await chamar('PUT', '/perfil/areas', { areas: [{ areaId: area.id, interesse: 5 }] }, tokCand);
  conferir('candidata: area', r.status === 200, r);
  r = await chamar('PUT', '/perfil/habilidades', { habilidades: [{ habilidadeId: js.id, anos: 2 }] }, tokCand);
  conferir('candidata: habilidade', r.status === 200, r);

  const vaga = {
    titulo: 'TESTE-VAGA completa', tipo: 'vaga', areaId: area.id, nivel: 'junior', modalidade: 'remoto',
    salario_min: 3000, salario_max: 6000,
    requisitos: [{ habilidadeId: js.id, importancia: 5, obrigatoria: true }, { habilidadeId: node.id }]
  };
  r = await chamar('POST', '/oportunidades', vaga, tokEmp);
  const vagaId = dadosDe(r) && dadosDe(r).id;
  conferir('criar vaga completa retorna 201', r.status === 201 && !!vagaId, r);
  if (!vagaId) return;

  const linha = (await query('SELECT Area_idArea AS a, nivel, modalidade, salario_min AS smin, salario_max AS smax FROM Oportunidades WHERE idOportunidade = ?', [vagaId]))[0];
  conferir('campos gravados no banco', linha && linha.a === area.id && linha.nivel === 'junior' && linha.modalidade === 'remoto' && Number(linha.smin) === 3000 && Number(linha.smax) === 6000, linha);
  const reqs = await query('SELECT Habilidade_idHabilidades AS h, importancia, obrigatoria FROM Oportunidades_Habilidades WHERE Oportunidade_idOportunidade = ? ORDER BY importancia DESC', [vagaId]);
  conferir('2 requisitos gravados (o segundo com os padroes 3 e nao obrigatoria)', reqs.length === 2 && reqs[0].h === js.id && reqs[0].obrigatoria === 1 && reqs[1].importancia === 3 && reqs[1].obrigatoria === 0, reqs);

  r = await chamar('GET', '/match/vagas', null, tokCand);
  const item = (dadosDe(r) || []).find((x) => x.vagaId === vagaId);
  conferir('vaga criada pela API aparece no ranking de match', !!item, r.status);
  conferir('match reconhece o requisito js (similaridade 1)', !!item && item.requisitos.some((q) => q.habilidadeId === js.id && q.similaridade === 1), item && item.requisitos);

  r = await chamar('POST', '/oportunidades', { ...vaga, titulo: 'TESTE-VAGA erro area', areaId: 999999 }, tokEmp);
  conferir('area inexistente retorna 400', r.status === 400, r);
  r = await chamar('POST', '/oportunidades', { ...vaga, titulo: 'TESTE-VAGA erro hab', requisitos: [{ habilidadeId: 999999 }] }, tokEmp);
  conferir('habilidade inexistente retorna 400', r.status === 400, r);
  r = await chamar('POST', '/oportunidades', { ...vaga, titulo: 'TESTE-VAGA erro sal', salario_min: 5000, salario_max: 1000 }, tokEmp);
  conferir('salario maximo menor que o minimo retorna 400', r.status === 400, r);
  r = await chamar('POST', '/oportunidades', { ...vaga, titulo: 'TESTE-VAGA erro nivel', nivel: 'deus' }, tokEmp);
  conferir('nivel invalido retorna 400', r.status === 400, r);
  r = await chamar('POST', '/oportunidades', { ...vaga, titulo: 'TESTE-VAGA erro imp', requisitos: [{ habilidadeId: js.id, importancia: 9 }] }, tokEmp);
  conferir('importancia fora de 1 a 5 retorna 400', r.status === 400, r);

  const orfas = await query("SELECT COUNT(*) AS n FROM Oportunidades WHERE titulo LIKE 'TESTE-VAGA erro%'");
  conferir('requisicoes invalidas nao deixam vaga pela metade', Number(orfas[0].n) === 0, orfas);

  r = await chamar('POST', '/oportunidades', { titulo: 'TESTE-VAGA evento', tipo: 'evento', requisitos: [{ habilidadeId: js.id }] }, tokEmp);
  const eventoId = dadosDe(r) && dadosDe(r).id;
  conferir('evento e criado e ignora requisitos', r.status === 201 && !!eventoId, r);
  if (eventoId) {
    const n = await query('SELECT COUNT(*) AS n FROM Oportunidades_Habilidades WHERE Oportunidade_idOportunidade = ?', [eventoId]);
    conferir('evento nao grava requisitos', Number(n[0].n) === 0, n);
  }

  r = await chamar('POST', '/oportunidades', { titulo: 'TESTE-VAGA texto livre', tipo: 'vaga', habilidades: ['react'] }, tokEmp);
  const textoId = dadosDe(r) && dadosDe(r).id;
  conferir('habilidades em texto livre e ignorada (vaga criada sem requisitos)', r.status === 201 && !!textoId, r);
  if (textoId) {
    const n = await query('SELECT COUNT(*) AS n FROM Oportunidades_Habilidades WHERE Oportunidade_idOportunidade = ?', [textoId]);
    conferir('vaga de texto livre nao grava requisitos', Number(n[0].n) === 0, n);
  }

  r = await chamar('POST', '/oportunidades', vaga, tokCand);
  conferir('colaboradora nao cria vaga (403)', r.status === 403, r);
}

main()
  .catch((err) => { console.error('ERRO', err); falhas++; })
  .finally(async () => {
    await query('DELETE FROM Usuarios WHERE email IN (?, ?)', [emailEmp, emailCand]);
    const sobra = await query("SELECT COUNT(*) AS n FROM Oportunidades WHERE titulo LIKE 'TESTE-VAGA%'");
    conferir('limpeza: nenhuma vaga de teste sobrou', Number(sobra[0].n) === 0, sobra);
    await closePool();
    console.log(falhas ? falhas + ' falha(s)' : 'TUDO OK');
    process.exit(falhas ? 1 : 0);
  });
