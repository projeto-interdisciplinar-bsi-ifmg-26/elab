// Cria (ou atualiza) um usuario administrador. Idempotente: pode rodar quantas vezes quiser.
// Uso: ADMIN_EMAIL=admin@elab.com ADMIN_SENHA=... npm run admin:criar
const bcrypt = require('bcryptjs');
const { withTransaction, query, closePool } = require('./pool');

async function criarAdmin({ email, senha }) {
  if (!email || !senha) {
    throw new Error('Defina ADMIN_EMAIL e ADMIN_SENHA no ambiente.');
  }
  if (senha.length < 8) {
    throw new Error('A senha do admin precisa ter pelo menos 8 caracteres.');
  }
  const hash = await bcrypt.hash(senha, 10);

  await withTransaction(async (conn) => {
    const [existentes] = await conn.execute('SELECT idUsuario AS id FROM Usuarios WHERE email = ?', [email]);
    if (existentes.length) {
      await conn.execute('UPDATE Usuarios SET senha = ?, tipo_usuario = ? WHERE idUsuario = ?', [hash, 'admin', existentes[0].id]);
      return;
    }
    await conn.execute('INSERT INTO Usuarios (email, senha, tipo_usuario) VALUES (?, ?, ?)', [email, hash, 'admin']);
  });
  return email;
}

async function main() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const senha = process.env.ADMIN_SENHA || '';
  const criado = await criarAdmin({ email, senha });
  const [linha] = await query('SELECT idUsuario AS id FROM Usuarios WHERE email = ?', [criado]);
  console.log('Admin garantido:', criado, '(id ' + linha.id + ')');
}

if (require.main === module) {
  main()
    .catch((err) => { console.error('ERRO', err.message); process.exitCode = 1; })
    .finally(closePool);
}

module.exports = { criarAdmin };
