// Seed de DEMONSTRACAO (dados ficticios). Destrutivo: apaga todos os usuarios (menos admin)
// e recria empresas, vagas, colaboradoras e candidaturas. Semente fixa: mesma execucao, mesmos dados.
// Uso: npm run seed:demo
const bcrypt = require('bcryptjs');
const dados = require('./seeds/demo.json');
const { withTransaction, query, closePool } = require('./pool');

if (!process.argv.includes('--confirmar')) {
  console.log('Este script APAGA usuarios, vagas e inscricoes. Rode: npm run seed:demo');
  process.exit(1);
}

function criarRng(semente) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = criarRng(20261106);
const sorteio = (a, b) => a + Math.floor(rng() * (b - a + 1));
const escolher = (arr) => arr[Math.floor(rng() * arr.length)];
const chance = (p) => rng() < p;
const embaralhar = (arr) => {
  const c = [...arr];
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
};
const dia = (d) => d.toISOString().slice(0, 10);
const dataHora = (d) => d.toISOString().slice(0, 19).replace('T', ' ');
const somarMeses = (d, m) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + m, 1));
const somarDias = (d, n) => new Date(d.getTime() + n * 86400000);
const arred = (n, p) => Math.round(n / p) * p;
const slug = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');

const ROT = { estagio: 'Estagiária', junior: 'Júnior', pleno: 'Pleno', senior: 'Sênior', especialista: 'Especialista' };
const ROT_VAGA = { junior: 'Júnior', pleno: 'Pleno', senior: 'Sênior', especialista: 'Especialista' };
const INFERIOR = { estagio: 'estagio', junior: 'estagio', pleno: 'junior', senior: 'pleno', especialista: 'senior' };
const SALARIO = { estagio: [1500, 2500], junior: [3000, 5000], pleno: [6000, 9500], senior: [10000, 15000], especialista: [14000, 20000] };
const ANOS = { estagio: [0, 1], junior: [1, 2], pleno: [3, 5], senior: [6, 9], especialista: [10, 15] };
const EXPERIENCIAS = { estagio: [0, 1], junior: [1, 2], pleno: [2, 3], senior: [3, 4], especialista: [3, 4] };
const P_NUCLEO = { estagio: 0.55, junior: 0.75, pleno: 0.9, senior: 0.97, especialista: 1 };
const NIVEIS_VAGA = ['junior', 'pleno', 'estagio', 'senior', 'junior', 'pleno', 'senior'];
const TOTAL_COLAB = 100;
const VAGAS_POR_EMPRESA = 5;

const cargoDe = (arq, nivel) => (nivel === 'estagio' ? 'Estagiária em ' + arq.rotulo : arq.titulo + ' ' + ROT[nivel]);

async function main() {
  const agora = new Date();
  const arqs = dados.arquetipos;
  const hash = await bcrypt.hash(dados.senha, 10);

  await withTransaction(async (conn) => {
    const ex = async (sql, params = []) => (await conn.execute(sql, params))[0];
    const habId = new Map((await ex('SELECT idHabilidades AS id, nome_habilidade AS nome FROM Habilidades')).map((r) => [r.nome, r.id]));
    const areaId = new Map((await ex('SELECT idArea AS id, slug FROM Areas_Atuacao')).map((r) => [r.slug, r.id]));

    await ex("DELETE FROM Usuarios WHERE tipo_usuario <> 'admin'");

    // ---------- Empresas ----------
    const empresas = [];
    for (let i = 0; i < dados.empresas.length; i++) {
      const e = dados.empresas[i];
      const u = await ex('INSERT INTO Usuarios (email, senha, tipo_usuario) VALUES (?, ?, ?)', ['empresa' + (i + 1) + '@elab.com', hash, 'entidade_parceira']);
      const ent = await ex(
        'INSERT INTO Entidades_Parceiras (Usuario_idUsuario, nome_organizacao, descricao, cnpj, status_aprovacao) VALUES (?, ?, ?, ?, ?)',
        [u.insertId, e.nome, e.descricao, e.cnpj, 'aprovada']
      );
      empresas.push({ id: ent.insertId, ...e });
    }

    // ---------- Vagas ----------
    const vagas = [];
    let n = 0;
    for (let e = 0; e < empresas.length; e++) {
      for (let k = 0; k < VAGAS_POR_EMPRESA; k++, n++) {
        const arqIdx = n % arqs.length;
        const arq = arqs[arqIdx];
        const nivel = NIVEIS_VAGA[n % NIVEIS_VAGA.length];
        const modalidade = escolher(['remoto', 'hibrido', 'presencial']);
        const cidade = escolher(dados.cidades.slice(0, 4));
        const [smin, smax] = SALARIO[nivel];
        const salMin = arred(sorteio(smin, smax), 100);
        const salMax = salMin + arred(sorteio(500, 3000), 100);
        const titulo = nivel === 'estagio' ? 'Estágio em ' + arq.rotulo : arq.titulo + ' ' + ROT_VAGA[nivel];
        const descricao = empresas[e].descricao + ' ' + escolher(dados.descricoesVaga);
        const diasPost = sorteio(1, 30);
        const r = await ex(
          'INSERT INTO Oportunidades (Entidade_Parceira_idEntidade_Parceira, titulo, descricao, tipo, local, status, data_postagem, Area_idArea, nivel, modalidade, salario_min, salario_max) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [empresas[e].id, titulo, descricao, 'vaga', modalidade === 'remoto' ? 'Remoto' : cidade[0] + ' - ' + cidade[1], 'ativo', dataHora(somarDias(agora, -diasPost)), areaId.get(arq.area) || null, nivel, modalidade, salMin, salMax]
        );
        const importancias = [5, 5, 4, 3, 3];
        const obrigatorias = nivel === 'estagio' ? 1 : 2;
        for (let j = 0; j < arq.nucleo.length; j++) {
          await ex('INSERT INTO Oportunidades_Habilidades (Oportunidade_idOportunidade, Habilidade_idHabilidades, importancia, obrigatoria) VALUES (?, ?, ?, ?)',
            [r.insertId, habId.get(arq.nucleo[j]), importancias[j] || 3, j < obrigatorias ? 1 : 0]);
        }
        const extras = embaralhar(arq.extras).slice(0, 2);
        for (let j = 0; j < extras.length; j++) {
          await ex('INSERT INTO Oportunidades_Habilidades (Oportunidade_idOportunidade, Habilidade_idHabilidades, importancia, obrigatoria) VALUES (?, ?, ?, ?)',
            [r.insertId, habId.get(extras[j]), j === 0 ? 3 : 2, 0]);
        }
        vagas.push({ id: r.insertId, empresaIdx: e, arqIdx, diasPost });
      }
    }

    // ---------- Eventos, palestras e bolsas ----------
    const eventos = [];
    for (let i = 0; i < dados.eventos.length; i++) {
      const ev = dados.eventos[i];
      const r = await ex(
        'INSERT INTO Oportunidades (Entidade_Parceira_idEntidade_Parceira, titulo, descricao, tipo, local, data, status, data_postagem, nivel) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [empresas[i % empresas.length].id, ev.titulo, ev.descricao, ev.tipo, ev.local, dia(somarDias(agora, ev.dias)), 'agendado', dataHora(somarDias(agora, -sorteio(1, 10))), 'qualquer']
      );
      eventos.push({ id: r.insertId });
    }

    // ---------- Colaboradoras ----------
    const colabs = [];
    for (let i = 0; i < TOTAL_COLAB; i++) {
      const arqIdx = i % arqs.length;
      const arq = arqs[arqIdx];
      const completo = i < 2 || !chance(0.1);
      const sorte = rng();
      const nivel = sorte < 0.15 ? 'estagio' : sorte < 0.5 ? 'junior' : sorte < 0.8 ? 'pleno' : sorte < 0.95 ? 'senior' : 'especialista';
      const anos = sorteio(ANOS[nivel][0], ANOS[nivel][1]);
      const cidade = escolher(dados.cidades);
      const nome = dados.nomes[i % dados.nomes.length] + ' ' + dados.sobrenomes[(Math.floor(i / 40) * 13 + i * 7) % dados.sobrenomes.length];
      const roll = rng();
      const disponibilidade = roll < 0.5 ? 'imediata' : roll < 0.65 ? '15_dias' : roll < 0.8 ? '30_dias' : roll < 0.95 ? 'empregada_aberta' : 'nao_procurando';
      const nuc = arq.nucleo;

      const u = await ex('INSERT INTO Usuarios (email, senha, tipo_usuario) VALUES (?, ?, ?)', ['colab' + (i + 1) + '@elab.com', hash, 'profissional']);
      const p = await ex(
        'INSERT INTO Profissionais (Usuario_idUsuario, nome, area, titulo_profissional, bio, resumo, cidade, nivel, anos_experiencia, disponibilidade, link_portfolio, perfil_publico, telefone, estado, link_github, link_linkedin) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          u.insertId, nome, arq.rotulo, cargoDe(arq, nivel),
          completo ? arq.titulo + ' em ' + cidade[0] + '. Foco em ' + nuc[0] + ' e ' + nuc[1] + '.' : null,
          completo ? cargoDe(arq, nivel) + ' com ' + anos + ' ano(s) de experiência, trabalhando principalmente com ' + nuc[0] + ', ' + nuc[1] + ' e ' + nuc[2] + '. Busco um time colaborativo para crescer e compartilhar conhecimento.' : null,
          cidade[0], nivel, anos, disponibilidade,
          completo && chance(0.4) ? 'https://portfolio.exemplo.dev/' + slug(nome) + i : null,
          1,
          completo ? '(31) 9' + sorteio(1000, 9999) + '-' + sorteio(1000, 9999) : null,
          cidade[1],
          completo && chance(0.7) ? 'https://github.com/' + slug(nome) + i : null,
          completo && chance(0.7) ? 'https://linkedin.com/in/' + slug(nome) + i : null
        ]
      );
      const profId = p.insertId;
      colabs.push({ id: profId, arqIdx });

      // habilidades
      const escolhidas = new Set();
      for (const h of nuc) if (chance(P_NUCLEO[nivel])) escolhidas.add(h);
      if (escolhidas.size < 2) { escolhidas.add(nuc[0]); escolhidas.add(nuc[1]); }
      for (const h of arq.extras) if (chance(0.45)) escolhidas.add(h);
      if (completo && chance(0.3)) escolhidas.add(escolher(escolher(arqs).nucleo));
      const lista = completo ? [...escolhidas] : [...escolhidas].slice(0, 3);
      for (const h of lista) {
        await ex('INSERT INTO Habilidades_Profissional (Profissionais_idProfissionais, Habilidades_idHabilidades, tempo_experiencia_anos) VALUES (?, ?, ?)',
          [profId, habId.get(h), sorteio(0, Math.max(1, Math.min(anos, 8)))]);
      }

      // areas de interesse
      const areas = completo ? [arq.area, ...arq.areasExtras] : [arq.area];
      for (let j = 0; j < areas.length; j++) {
        if (!areaId.get(areas[j])) continue;
        await ex('INSERT INTO Profissional_Areas (Profissionais_idProfissionais, Area_idArea, interesse) VALUES (?, ?, ?)',
          [profId, areaId.get(areas[j]), j === 0 ? 5 : j === 1 ? 4 : 3]);
      }

      // preferencias
      const [smin, smax] = SALARIO[nivel];
      await ex(
        'INSERT INTO Preferencias_Profissional (Profissionais_idProfissionais, modalidade, aceita_clt, aceita_pj, aceita_estagio, pretensao_min, aceita_mudar_cidade, interesse_vagas, interesse_eventos, interesse_palestras, interesse_bolsas) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          profId, escolher(['remoto', 'hibrido', 'presencial', 'indiferente']), 1, chance(0.6) ? 1 : 0,
          nivel === 'estagio' || nivel === 'junior' || chance(0.2) ? 1 : 0,
          chance(0.85) ? arred(sorteio(smin, smax) * 0.9, 100) : null,
          chance(0.4) ? 1 : 0, 1, chance(0.8) ? 1 : 0, chance(0.8) ? 1 : 0, chance(0.7) ? 1 : 0
        ]
      );

      if (!completo) continue;

      // formacoes
      let fimGrad;
      let iniGrad;
      let statusGrad;
      if (nivel === 'estagio') {
        iniGrad = somarMeses(agora, -sorteio(6, 30));
        fimGrad = null;
        statusGrad = 'cursando';
      } else {
        fimGrad = somarMeses(agora, -(12 * anos + sorteio(2, 10)));
        iniGrad = somarMeses(fimGrad, -48);
        statusGrad = 'concluido';
      }
      await ex('INSERT INTO Formacoes_Academicas (Profissionais_idProfissionais, instituicao, curso, grau, status, data_inicio, data_fim) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [profId, escolher(dados.instituicoes), escolher(dados.cursos), 'graduacao', statusGrad, dia(iniGrad), fimGrad ? dia(fimGrad) : null]);
      if (chance(0.3)) {
        const fimB = somarMeses(agora, -sorteio(3, 24));
        await ex('INSERT INTO Formacoes_Academicas (Profissionais_idProfissionais, instituicao, curso, grau, status, data_inicio, data_fim) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [profId, escolher(dados.bootcamps), 'Formação em ' + arq.rotulo, 'bootcamp', 'concluido', dia(somarMeses(fimB, -6)), dia(fimB)]);
      }

      // experiencias
      const qtd = sorteio(EXPERIENCIAS[nivel][0], EXPERIENCIAS[nivel][1]);
      let cursor = agora;
      for (let k = 0; k < qtd; k++) {
        const duracao = sorteio(10, 30);
        const atual = k === 0 && chance(0.55);
        let inicio;
        let fim;
        if (atual) {
          fim = null;
          inicio = somarMeses(cursor, -duracao);
        } else {
          fim = somarMeses(cursor, -(k === 0 ? sorteio(0, 3) : sorteio(1, 3)));
          inicio = somarMeses(fim, -duracao);
        }
        cursor = inicio;
        await ex(
          'INSERT INTO Experiencias_Profissionais (Profissionais_idProfissionais, cargo, empresa, local, data_inicio, data_fim, atual, descricao) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [profId, k === 0 ? cargoDe(arq, nivel) : cargoDe(arq, INFERIOR[nivel]), escolher(dados.empresasAnteriores), cidade[0] + ' - ' + cidade[1], dia(inicio), fim ? dia(fim) : null, atual ? 1 : 0,
            'Atuação com ' + nuc.slice(0, 3).join(', ') + ' em projetos de produto.']
        );
      }
    }

    // ---------- Candidaturas ----------
    const jaInscrita = new Set();
    const inscrever = async (oportunidadeId, colab, diasAtras) => {
      const chave = oportunidadeId + '-' + colab.id;
      if (jaInscrita.has(chave)) return;
      jaInscrita.add(chave);
      await ex(
        'INSERT INTO Cadastros_Oportunidades (Oportunidade_idOportunidade, Profissionais_idProfissionais, mensagem, protocolo, data_aplicacao) VALUES (?, ?, ?, ?, ?)',
        [oportunidadeId, colab.id, chance(0.7) ? escolher(dados.mensagens) : null, String(sorteio(100000, 999999)), dataHora(somarDias(agora, -sorteio(0, diasAtras)))]
      );
    };

    for (const v of vagas) {
      const total = v.empresaIdx < 2 ? sorteio(10, 16) : escolher([2, 3, 5, 7, 9, 12, 14]);
      const mesmos = embaralhar(colabs.filter((c) => c.arqIdx === v.arqIdx));
      const outros = embaralhar(colabs.filter((c) => c.arqIdx !== v.arqIdx));
      const selecionadas = mesmos.slice(0, Math.round(total * 0.6));
      selecionadas.push(...outros.slice(0, total - selecionadas.length));
      for (const c of selecionadas) await inscrever(v.id, c, v.diasPost);
    }
    for (const ev of eventos) {
      for (const c of embaralhar(colabs).slice(0, sorteio(4, 12))) await inscrever(ev.id, c, 10);
    }
    for (const c of [colabs[0], colabs[1]]) {
      for (const v of embaralhar(vagas).slice(0, 5)) await inscrever(v.id, c, v.diasPost);
    }
  });

  const cont = async (sql) => Number((await query(sql))[0].n);
  console.log('Usuarios:', await cont('SELECT COUNT(*) AS n FROM Usuarios'));
  console.log('Empresas:', await cont('SELECT COUNT(*) AS n FROM Entidades_Parceiras'));
  console.log('Colaboradoras:', await cont('SELECT COUNT(*) AS n FROM Profissionais'));
  console.log('Vagas:', await cont("SELECT COUNT(*) AS n FROM Oportunidades WHERE tipo = 'vaga'"));
  console.log('Eventos/palestras/bolsas:', await cont("SELECT COUNT(*) AS n FROM Oportunidades WHERE tipo <> 'vaga'"));
  console.log('Requisitos:', await cont('SELECT COUNT(*) AS n FROM Oportunidades_Habilidades'));
  console.log('Habilidades de colaboradoras:', await cont('SELECT COUNT(*) AS n FROM Habilidades_Profissional'));
  console.log('Experiencias:', await cont('SELECT COUNT(*) AS n FROM Experiencias_Profissionais'));
  console.log('Formacoes:', await cont('SELECT COUNT(*) AS n FROM Formacoes_Academicas'));
  console.log('Candidaturas:', await cont('SELECT COUNT(*) AS n FROM Cadastros_Oportunidades'));
  console.log('Logins: empresa1..empresa8@elab.com e colab1..colab100@elab.com | senha: ' + dados.senha);
}

main()
  .catch((err) => { console.error('ERRO', err); process.exitCode = 1; })
  .finally(closePool);
