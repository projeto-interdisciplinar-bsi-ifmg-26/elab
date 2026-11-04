// Teste ponta a ponta do match. Requer o servidor rodando (npm run dev em outro terminal).
// Cria candidata, empresa e vagas temporarias e REMOVE tudo no final.
const bcrypt = require('bcryptjs');
const { query, closePool } = require('../db/pool');

const BASE = process.env.BASE_URL || 'http://localhost:3000/api/v1';
const stamp = Date.now();
const emailProf = 'teste.match.' + stamp + '@elab.test';
const emailEmp = 'teste.matchemp.' + stamp + '@elab.test';
const SENHA = 'senha12345';
let token = '';
let falhas = 0;

async function chamar(metodo, rota, corpo) {
  const headers = token ? { Authorization: 'Bearer ' + token } : {};
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

async function criarVaga(empId, titulo, v, reqs) {
  const res = await query(
    'INSERT INTO Oportunidades (Entidade_Parceira_idEntidade_Parceira, titulo, tipo, status, ' +
      "Area_idArea, nivel, modalidade, salario_max) VALUES (?, ?, 'vaga', 'ativo', ?, ?, ?, ?)",
    [empId, titulo, v.areaId, v.nivel, v.modalidade, v.salarioMax]
  );
  for (const q of reqs) {
    await query(
      'INSERT INTO Oportunidades_Habilidades (Oportunidade_idOportunidade, ' +
        'Habilidade_idHabilidades, importancia, obrigatoria) VALUES (?, ?, ?, ?)',
      [res.insertId, q.id, q.importancia, q.obrigatoria ? 1 : 0]
    );
  }
  return res.insertId;
}

// Habilidade fora do conjunto dela, ligada a uma das dela por aresta forte (peso >= 0.5).
async function vizinhoForte(meusIds) {
  const m = meusIds.map(() => '?').join(', ');
  const rows = await query(
    'SELECT IF(Habilidade_A IN (' + m + '), Habilidade_B, Habilidade_A) AS alvo ' +
      'FROM Habilidades_Relacionadas WHERE peso >= 0.5 AND (' +
      '(Habilidade_A IN (' + m + ') AND Habilidade_B NOT IN (' + m + ')) OR ' +
      '(Habilidade_B IN (' + m + ') AND Habilidade_A NOT IN (' + m + '))) ' +
      'ORDER BY peso DESC LIMIT 1',
    [...meusIds, ...meusIds, ...meusIds, ...meusIds, ...meusIds]
  );
  return rows[0] ? rows[0].alvo : null;
}


// Habilidade temporaria sem nenhuma aresta no grafo (inalcancavel). Removida no final.
async function criarHabilidadeIsolada() {
  const res = await query("INSERT INTO Habilidades (nome_habilidade, categoria) VALUES (?, ?)", ["TESTE-MATCH-ISOLADA-" + stamp, "teste"]);
  return res.insertId;
}

async function main() {
  let r = await chamar('POST', '/auth/registrar', {
    nome: 'Teste Match', email: emailProf, senha: SENHA, tipo: 'profissional'
  });
  conferir('registrar candidata', [200, 201].includes(r.status), r);

  r = await chamar('POST', '/auth/login', { email: emailProf, senha: SENHA });
  const tokenProf = dadosDe(r) && dadosDe(r).token;
  conferir('login da candidata', !!tokenProf, r);
  if (!tokenProf) return;
  token = tokenProf;

  const hab = dadosDe(await chamar('GET', '/catalogo/habilidades'));
  const areas = dadosDe(await chamar('GET', '/catalogo/areas')).lista;
  const area = areas.find((a) => a.slug === 'backend-node');
  const nomes = ['node', 'javascript', 'sql'];
  const minhas = nomes.map((n) => hab.find((h) => h.nome === n)).filter(Boolean);
  conferir('catalogo tem dados para o teste', !!area && minhas.length === 3, { area, n: minhas.length });
  if (!area || minhas.length !== 3) return;
  const meusIds = minhas.map((h) => h.id);
  const [nodeId, jsId] = meusIds;

  r = await chamar('PUT', '/perfil/dados', { nivel: 'junior' });
  conferir('salvar nivel', r.status === 200, r);
  r = await chamar('PUT', '/perfil/preferencias', { modalidade: 'remoto', pretensao_min: 4000 });
  conferir('salvar preferencias', r.status === 200, r);
  r = await chamar('PUT', '/perfil/areas', { areas: [{ areaId: area.id, interesse: 5 }] });
  conferir('salvar areas', r.status === 200, r);
  r = await chamar('PUT', '/perfil/habilidades', {
    habilidades: meusIds.map((id) => ({ habilidadeId: id, anos: 2 }))
  });
  conferir('salvar habilidades', r.status === 200, r);

  const vizId = await vizinhoForte(meusIds);
  const isoId = await criarHabilidadeIsolada();
  conferir('grafo tem vizinho forte e habilidade isolada', !!vizId && !!isoId, { vizId, isoId });
  if (!vizId || !isoId) return;

  const hash = await bcrypt.hash(SENHA, 4);
  const u = await query(
    'INSERT INTO Usuarios (email, senha, tipo_usuario) VALUES (?, ?, ?)',
    [emailEmp, hash, 'entidade_parceira']
  );
  const cnpj = String(stamp).padStart(14, '0').slice(-14);
  const e = await query(
    'INSERT INTO Entidades_Parceiras (Usuario_idUsuario, nome_organizacao, cnpj) VALUES (?, ?, ?)',
    [u.insertId, 'Empresa Teste Match', cnpj]
  );

  const base = { areaId: area.id, nivel: 'junior', modalidade: 'remoto', salarioMax: 6000 };
  const idA = await criarVaga(e.insertId, 'TESTE-MATCH A', base, [
    { id: jsId, importancia: 5, obrigatoria: true },
    { id: nodeId, importancia: 3, obrigatoria: false }
  ]);
  const idB = await criarVaga(
    e.insertId,
    'TESTE-MATCH B',
    { areaId: area.id, nivel: 'senior', modalidade: 'presencial', salarioMax: 2000 },
    [
      { id: isoId, importancia: 5, obrigatoria: true },
      { id: jsId, importancia: 2, obrigatoria: false }
    ]
  );
  const idC = await criarVaga(e.insertId, 'TESTE-MATCH C', base, [
    { id: vizId, importancia: 4, obrigatoria: false }
  ]);

  r = await chamar('GET', '/match/vagas');
  const rank = dadosDe(r) || [];
  conferir('ranking responde 200', r.status === 200 && Array.isArray(rank), r);
  const a = rank.find((x) => x.vagaId === idA);
  const b = rank.find((x) => x.vagaId === idB);
  const c = rank.find((x) => x.vagaId === idC);
  conferir('ranking inclui as 3 vagas de teste', !!a && !!b && !!c, rank.map((x) => x.vagaId));
  if (!a || !b || !c) return;

  conferir('ranking ordenado por score decrescente', rank.every((x, i) => i === 0 || rank[i - 1].score >= x.score), rank.map((x) => x.score));
  conferir('vaga A: habilidades 100 e sem eliminatorias', a.componentes.habilidades === 100 && a.eliminatorias.length === 0, a);
  conferir('vaga B: obrigatoria ausente vira eliminatoria', b.eliminatorias.length === 1 && b.eliminatorias[0].id === isoId, b);
  conferir('vaga C: credito parcial pelo grafo', c.requisitos[0].similaridade > 0 && c.requisitos[0].similaridade < 1, c.requisitos);
  conferir('ordem A > C > B', a.score > c.score && c.score > b.score, [a.score, c.score, b.score]);
  conferir('requisitos trazem o nome da habilidade', !!a.requisitos[0].nome, a.requisitos);

  r = await chamar('GET', '/match/trilha/' + idA);
  conferir('trilha da vaga A vazia (ja tem tudo)', r.status === 200 && dadosDe(r).trilha.length === 0, r);

  r = await chamar('GET', '/match/trilha/' + idB);
  const trB = dadosDe(r) && dadosDe(r).trilha;
  conferir('trilha da vaga B: habilidade inalcancavel', !!trB && trB.length === 1 && trB[0].alvo.id === isoId && trB[0].alcancavel === false, r);

  r = await chamar('GET', '/match/trilha/' + idC);
  const trC = dadosDe(r) && dadosDe(r).trilha;
  const cam = trC && trC[0] && trC[0].caminho.map((x) => x.id);
  conferir('trilha da vaga C: caminho minimo ate a vizinha', !!cam && cam.length >= 2 && meusIds.includes(cam[0]) && cam[cam.length - 1] === vizId, trC);
  conferir('trilha traz nomes', !!(trC && trC[0].alvo.nome), trC);

  r = await chamar('GET', '/match/trilha/999999');
  conferir('trilha de vaga inexistente retorna 404', r.status === 404, r);
  r = await chamar('GET', '/match/trilha/abc');
  conferir('trilha com id invalido retorna 400', r.status === 400, r);

  r = await chamar('POST', '/auth/login', { email: emailEmp, senha: SENHA });
  const tokenEmp = dadosDe(r) && dadosDe(r).token;
  token = tokenEmp || '';
  r = await chamar('GET', '/match/vagas');
  conferir('empresa nao acessa o match da colaboradora', [401, 403].includes(r.status), r);
}

main()
  .catch((err) => { console.error('ERRO', err); falhas++; })
  .finally(async () => {
    await query('DELETE FROM Usuarios WHERE email IN (?, ?)', [emailProf, emailEmp]);
    await query("DELETE FROM Habilidades WHERE nome_habilidade LIKE 'TESTE-MATCH-ISOLADA-%'");
    const sobra = await query("SELECT COUNT(*) AS n FROM Oportunidades WHERE titulo LIKE 'TESTE-MATCH%'");
    conferir('limpeza: nenhuma vaga de teste sobrou', Number(sobra[0].n) === 0, sobra);
    await closePool();
    console.log(falhas ? falhas + ' falha(s)' : 'TUDO OK');
    process.exit(falhas ? 1 : 0);
  });
