const { query, withTransaction } = require('../../db/pool');

// Anexa "habilidades" (lista de nomes) a cada oportunidade, a partir dos requisitos estruturados.
async function anexarHabilidades(lista) {
  if (lista.length === 0) return lista;
  const ids = lista.map((o) => o.idOportunidade);
  const marcas = ids.map(() => '?').join(', ');
  const novos = await query(
    'SELECT oh.Oportunidade_idOportunidade AS oid, h.nome_habilidade AS nome FROM Oportunidades_Habilidades oh JOIN Habilidades h ON h.idHabilidades = oh.Habilidade_idHabilidades WHERE oh.Oportunidade_idOportunidade IN (' + marcas + ') ORDER BY oh.importancia DESC',
    ids
  );
  const mapa = new Map(ids.map((i) => [i, []]));
  for (const r of novos) {
    const l = mapa.get(r.oid);
    if (!l.includes(r.nome)) l.push(r.nome);
  }
  return lista.map((o) => ({ ...o, habilidades: mapa.get(o.idOportunidade) }));
}


async function listar({ tipo, status, empresaId, moderacao, empresaAprovada } = {}) {
  let sql = 'SELECT o.*, o.idOportunidade AS id, e.nome_organizacao AS empresaNome FROM Oportunidades o JOIN Entidades_Parceiras e ON e.idEntidade_Parceira = o.Entidade_Parceira_idEntidade_Parceira';
  const params = [];
  const filtro = (coluna, valor) => {
    sql += (params.length ? ' AND' : ' WHERE') + ' ' + coluna + ' = ?';
    params.push(valor);
  };

  if (tipo) filtro('tipo', tipo);
  if (status) filtro('status', status);
  if (empresaId) filtro('Entidade_Parceira_idEntidade_Parceira', empresaId);
  if (moderacao) filtro('status_moderacao', moderacao);
  // Empresa desativada (pendente ou rejeitada) oculta automaticamente tudo o que publicou.
  if (empresaAprovada) filtro('e.status_aprovacao', 'aprovada');

  return anexarHabilidades(await query(sql, params));
}

async function buscarPorId(id) {
  const rows = await anexarHabilidades(await query('SELECT o.*, o.idOportunidade AS id, e.nome_organizacao AS empresaNome, e.status_aprovacao AS empresa_status_aprovacao FROM Oportunidades o JOIN Entidades_Parceiras e ON e.idEntidade_Parceira = o.Entidade_Parceira_idEntidade_Parceira WHERE o.idOportunidade = ?', [id]));
  return rows[0] || null;
}

async function criar({ empresaId, titulo, tipo, descricao = '', local = '', data = null }) {
  const status = tipo === 'vaga' ? 'ativo' : 'agendado';
  const statusModeracao = 'pendente';

  const result = await query(
    'INSERT INTO Oportunidades (Entidade_Parceira_idEntidade_Parceira, titulo, tipo, descricao, local, data, status, status_moderacao) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [empresaId, titulo, tipo, descricao, local, data === '' ? null : data, status, statusModeracao]
  );

  const id = result.insertId;

  return { id: id, empresaId, titulo, tipo, descricao, local, data, status, statusModeracao };
}

// Banner da publicacao. `resetar` devolve uma publicacao ja aprovada para a fila
// de moderacao (imagem trocada exige nova revisao). Le o banner anterior sob a trava
// da linha e devolve, para o chamador apagar so o arquivo que realmente substituiu.
async function definirImagem(id, arquivo, resetar) {
  return withTransaction(async (conn) => {
    const [rows] = await conn.execute('SELECT imagem_arquivo AS arquivo FROM Oportunidades WHERE idOportunidade = ? FOR UPDATE', [id]);
    const anterior = rows[0] ? rows[0].arquivo : null;
    if (resetar) {
      await conn.execute(
        "UPDATE Oportunidades SET imagem_arquivo = ?, status_moderacao = 'pendente', motivo_moderacao = NULL, moderada_em = NULL WHERE idOportunidade = ?",
        [arquivo, id]
      );
    } else {
      await conn.execute('UPDATE Oportunidades SET imagem_arquivo = ? WHERE idOportunidade = ?', [arquivo, id]);
    }
    return anterior;
  });
}

// Moderacao pelo admin: grava o estado, o motivo (so na rejeicao) e a data da decisao.
async function definirModeracao(id, status, motivo) {
  await query(
    "UPDATE Oportunidades SET status_moderacao = ?, motivo_moderacao = ?, moderada_em = NOW() WHERE idOportunidade = ?",
    [status, status === 'rejeitada' ? motivo || '' : null, id]
  );
  return buscarPorId(id);
}

async function buscarInscricao(oportunidadeId, profissionalId) {
  const rows = await query(
    'SELECT * FROM Cadastros_Oportunidades WHERE Oportunidade_idOportunidade = ? AND Profissionais_idProfissionais = ?',
    [oportunidadeId, profissionalId]
  );
  return rows[0] || null;
}

async function criarInscricao({ oportunidadeId, profissionalId, mensagem = '', protocolo }) {
  const result = await query(
    'INSERT INTO Cadastros_Oportunidades (Oportunidade_idOportunidade, Profissionais_idProfissionais, mensagem, protocolo) VALUES (?, ?, ?, ?)',
    [oportunidadeId, profissionalId, mensagem, protocolo]
  );
  return { id: result.insertId, oportunidadeId, profissionalId, mensagem, protocolo };
}

async function buscarCandidatos(oportunidadeId) {
  const sql = `
    SELECT p.nome, u.email, c.mensagem, c.data_aplicacao as data_inscricao
    FROM Cadastros_Oportunidades c
    JOIN Profissionais p ON c.Profissionais_idProfissionais = p.idProfissionais
    JOIN Usuarios u ON p.Usuario_idUsuario = u.idUsuario
    WHERE c.Oportunidade_idOportunidade = ?
  `;
  return await query(sql, [oportunidadeId]);
}

module.exports = { listar, buscarPorId, criar, definirImagem, definirModeracao, buscarInscricao, criarInscricao, buscarCandidatos };
