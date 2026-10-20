# Banco de dados (MySQL)

Estrutura:

```
db/
  config.js         # config de conexão compartilhada (SSL, pool, migrations)
  pool.js           # pool singleton da aplicação + helpers query/withTransaction
  migrate.js        # runner: aplica migrations pendentes, com lock e checksum
  migrations/       # arquivos .sql numerados (DDL)
```

## Migrations

| Arquivo | Conteúdo |
| --- | --- |
| `001_create_usuarios.sql` | Tabela base `Usuarios` |
| `002_create_entidades_parceiras.sql` | `Entidades_Parceiras` (1:1 com Usuarios) |
| `003_create_profissionais.sql` | `Profissionais` (1:1 com Usuarios) |
| `004_create_habilidades.sql` | `Habilidades` + junção `Habilidades_Profissional` (N:N) |
| `005_create_eventos_oportunidades.sql` | `Eventos` e `Oportunidades` (1:N) |
| `006_create_cadastros.sql` | `Cadastros_Oportunidades` e `Cadastros_Eventos` (N:N) |

A ordem numérica respeita as dependências de chave estrangeira.

## Como rodar

1. Suba um MySQL e crie o schema vazio:

   ```sql
   CREATE DATABASE elab CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. Configure o `.env` (veja `.env.example`): `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.

3. Instale a dependência e rode:

   ```bash
   npm install
   npm run migrate
   ```

O runner cria a tabela de controle `schema_migrations` e aplica apenas o que ainda não foi aplicado. Rodar de novo é seguro (idempotente).

## Escalabilidade (deploy)

- **Migration é passo separado do deploy**: rode `npm run migrate` antes de subir o app, não dentro do boot do servidor.
- **Lock distribuído**: o runner usa `GET_LOCK` do MySQL. Se várias instâncias rodarem migrate ao mesmo tempo, só uma aplica; as outras esperam e encontram tudo pronto.
- **Checksum**: cada migration aplicada guarda um SHA-256. Se um arquivo já aplicado for alterado, o runner aborta em vez de rodar algo inconsistente entre ambientes. Nunca edite uma migration aplicada — crie uma nova.
- **Pool de conexões**: a aplicação usa um pool por instância (`db/pool.js`). Ajuste `DB_POOL_LIMIT` conforme `max_connections` do MySQL dividido pelo número de instâncias, para não esgotar conexões sob carga.
- **UTC**: datas em `timezone: 'Z'` e `dateStrings` para evitar divergência de fuso entre instâncias.

## Segurança

- **DDL estático**: as migrations não recebem entrada de usuário, são SQL do próprio projeto.
- **Prepared statements**: o controle de versões e todas as queries da aplicação (`db/pool.js` → `query`) usam placeholders (`?`), nunca concatenação de string.
- **`multipleStatements`** fica habilitado só no runner (`migrationConfig`). O pool da aplicação mantém `multipleStatements: false`.
- **SSL opcional**: `DB_SSL=true` para bancos gerenciados que exigem TLS.
- **Integridade**: chaves estrangeiras com `ON DELETE CASCADE`, índices únicos (email, cnpj, vínculos 1:1) e `utf8mb4`.
- **Senhas**: a coluna `senha` guarda o hash (bcrypt), nunca texto puro.

> Nota sobre DDL no MySQL: comandos como `CREATE TABLE` fazem commit implícito, então a transação do runner não desfaz DDL já executado. Por isso a convenção é uma operação lógica por arquivo, para o replay ser previsível.
