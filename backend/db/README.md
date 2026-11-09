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
| `007` a `019` | Perfil completo, catálogo de habilidades e áreas, grafo de habilidades, requisitos de vagas e ajustes de colunas |
| `020_drop_tabelas_legadas.sql` | Remove `Eventos`, `Cadastros_Eventos` e `Habilidades_Oportunidade`, que nunca foram usadas ou foram substituídas |

A ordem numérica respeita as dependências de chave estrangeira. Eventos, palestras e bolsas vivem em `Oportunidades` (coluna `tipo`) e as inscrições em `Cadastros_Oportunidades`. Modelo ER e dicionário de dados: [docs/bd](../../docs/bd/README.md).

## Como rodar

O runner de migrations **não sobe o banco**: ele conecta num MySQL que já precisa estar no ar. Se o banco não estiver rodando, `npm run migrate` falha com `ECONNREFUSED`. Suba o banco primeiro (Docker, recomendado) e só então rode migrate/seed.

### Opção A — Docker (recomendado)

Não instala MySQL no sistema e deixa o ambiente igual para todo mundo. **Rode o `docker run` uma única vez:**

```bash
docker run -d --name elab-mysql -p 3306:3306 \
  -e MYSQL_ALLOW_EMPTY_PASSWORD=yes \
  -e MYSQL_DATABASE=elab \
  mysql:8
```

O que cada parte faz:

- `-d` roda em background; `--name elab-mysql` dá um nome fixo para usar com `start`/`stop`.
- `-p 3306:3306` publica a porta do container na máquina, que é o que faz o `DB_HOST=localhost` do `.env` encontrar o banco.
- `MYSQL_ALLOW_EMPTY_PASSWORD=yes` deixa o root sem senha, casando com `DB_PASSWORD=` (vazio) do `.env.example`.
- `MYSQL_DATABASE=elab` já cria o banco no primeiro boot (faz o papel do `CREATE DATABASE`).

O primeiro boot leva alguns segundos e derruba conexões ao final do setup inicial; espere a mensagem `ready for connections` nos logs (`docker logs elab-mysql`) antes de rodar o migrate. Então:

```bash
npm install
npm run migrate
npm run seed
```

> MySQL 8 usa `utf8mb4` por padrão. Se quiser garantir o collation `utf8mb4_unicode_ci` (igual ao `CREATE DATABASE` abaixo), passe `--character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci` no fim do `docker run`.

### Uso no dia a dia

Criar o container é uma vez só. Depois é só ligar e desligar (os dados ficam preservados):

```bash
docker start elab-mysql   # liga o banco (antes de usar o sistema ou o DBeaver)
docker stop elab-mysql    # desliga quando terminar
```

- **Mexer só no banco** (ex.: DBeaver): basta o container ligado.
- **Rodar o sistema web**: container ligado **e** `npm run dev` na pasta `backend`. O Docker sobe o banco, não a aplicação.

> `docker start`/`stop` preservam os dados. `docker rm elab-mysql` **destrói** o container e tudo nele — aí é preciso recriar com `docker run` e rodar migrate/seed novamente.

### Acesso por cliente gráfico (DBeaver, Workbench, etc.)

Com o container ligado, crie uma conexão MySQL com:

| Campo | Valor |
| --- | --- |
| Host | `localhost` |
| Porta | `3306` |
| Database | `elab` |
| Usuário | `root` |
| Senha | (em branco) |

Com root sem senha, o MySQL 8 pode recusar a conexão com "Public Key Retrieval is not allowed". Em "Driver properties", ajuste `allowPublicKeyRetrieval=true` e `useSSL=false`.

### Opção B — MySQL nativo

Se preferir instalar o MySQL/MariaDB direto no sistema, crie o schema vazio:

```sql
CREATE DATABASE elab CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Depois configure o `.env` (veja `.env.example`: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`) e rode:

```bash
npm install
npm run migrate
```

O runner cria a tabela de controle `schema_migrations` e aplica apenas o que ainda não foi aplicado. Rodar de novo é seguro (idempotente).

## Seeds

São dois comandos distintos. Rode sempre com o banco no ar e as migrations já aplicadas.

| Comando | O que faz | Destrutivo? |
| --- | --- | --- |
| `npm run seed` | Carrega o **catálogo** (dados de referência): áreas, habilidades e as relações entre habilidades. Não cria usuários, vagas nem candidaturas. | Não. Faz upsert, é idempotente — pode rodar quantas vezes quiser. |
| `npm run seed:demo` | Popula **dados fictícios de demonstração**: 8 empresas, 40 vagas, eventos/palestras/bolsas, 100 colaboradoras e as candidaturas. Semente fixa (resultado sempre igual). | **Sim.** Apaga todos os usuários exceto `admin` (e, por cascata, vagas e candidaturas) antes de recriar. |

- O `seed` é o mínimo para o sistema funcionar: o motor de match depende do grafo de habilidades e da árvore de áreas estarem no banco.
- O `seed:demo` **depende do catálogo**: ele busca os IDs de habilidades e áreas para montar vagas e perfis. Ordem correta: `migrate` → `seed` → `seed:demo`.
- Contas criadas pelo demo: `empresa1@elab.com` a `empresa8@elab.com` e `colab1@elab.com` a `colab100@elab.com`, senha `demo12345`.

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
