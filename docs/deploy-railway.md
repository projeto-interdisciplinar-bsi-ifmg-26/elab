# Deploy do ELAB no Railway (gratuito)

Guia para colocar o ELAB online no [Railway](https://railway.app): backend (que já serve o frontend) e banco MySQL no mesmo projeto. O plano gratuito do Railway dá um crédito mensal de uso, suficiente para demonstração.

> **Por que Railway e não Vercel:** o backend do ELAB é um servidor Express de longa duração com pool de conexões MySQL (`db/pool.js`), não um app serverless. O Railway roda processos Node contínuos e hospeda MySQL no mesmo lugar, encaixando no projeto sem reescrever nada.

> **O front vai junto.** O frontend não é um serviço separado: o Express serve a pasta `frontend/` via `express.static` (`server.js`), e esses arquivos estão versionados no Git. Deployar o backend já publica o front na mesma URL — não há build nem serviço extra para o front. Por isso o projeto no Railway tem só dois serviços: MySQL e backend.

---

## 0. Pré-requisitos

- Conta no Railway (login com GitHub facilita o deploy a partir do repositório).
- O projeto versionado no GitHub (o Railway faz deploy a partir do repo).
- Nenhuma mudança de código é obrigatória: o servidor já lê a porta de `process.env.PORT` e a conexão já suporta SSL via `DB_SSL`.

---

## 1. Criar o projeto e o banco MySQL

1. No Railway, clique em **New Project**.
2. Escolha **Provision MySQL** (ou **Add a Service → Database → MySQL**).
3. O Railway cria o banco e expõe as credenciais na aba **Variables** do serviço MySQL. Você vai usar estes valores:
   - `MYSQLHOST`
   - `MYSQLPORT`
   - `MYSQLUSER`
   - `MYSQLPASSWORD`
   - `MYSQLDATABASE`

> Guarde esses valores; eles alimentam as variáveis do backend no passo 3.

---

## 2. Adicionar o backend como serviço

1. No mesmo projeto, clique em **New → GitHub Repo** e selecione o repositório do ELAB.
2. Em **Settings** do serviço, defina o **Root Directory** como `backend` (o `package.json` e o `server.js` ficam ali).
3. O Railway detecta Node e usa o `start` do `package.json` (`node server.js`). Confirme que o **Start Command** é `npm start`.

---

## 3. Variáveis de ambiente do backend

Na aba **Variables** do serviço do backend, adicione (apontando para o banco criado no passo 1):

| Variável | Valor |
| --- | --- |
| `DB_HOST` | o `MYSQLHOST` do banco |
| `DB_PORT` | o `MYSQLPORT` do banco |
| `DB_USER` | o `MYSQLUSER` do banco |
| `DB_PASSWORD` | o `MYSQLPASSWORD` do banco |
| `DB_NAME` | o `MYSQLDATABASE` do banco |
| `DB_SSL` | `true` |
| `JWT_SECRET` | um segredo forte e aleatório (NÃO use `troque_essa_chave`) |
| `NODE_ENV` | `production` |

Notas:
- **`PORT` não precisa ser definida**: o Railway injeta automaticamente e o `server.js` já a usa (`app.listen(port)`).
- **`DB_SSL=true`** é necessário porque o MySQL do Railway exige TLS. O `db/config.js` já trata isso.
- Para gerar um `JWT_SECRET`: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

Em vez de copiar valor por valor, o Railway permite **referenciar** as variáveis do serviço MySQL (ex.: `DB_HOST=${{MySQL.MYSQLHOST}}`). Isso evita erro de digitação e atualiza sozinho se o banco mudar.

---

## 4. Rodar migrations e seeds contra o banco da nuvem

As tabelas precisam ser criadas uma vez no banco do Railway. Duas formas:

**Opção A — localmente, apontando para o banco do Railway (mais simples)**

No seu `.env` local, troque temporariamente as variáveis `DB_*` pelas credenciais do Railway (com `DB_SSL=true`) e rode:

```bash
cd backend
npm run migrate
npm run seed
npm run seed:demo   # opcional: dados de demonstração
```

Depois reverta o `.env` para o banco local (Docker). O catálogo e a demo agora estão no banco da nuvem.

**Opção B — pelo próprio Railway**

Use o terminal/console do serviço (ou um comando de deploy único) para executar `npm run migrate` e `npm run seed` com as variáveis de ambiente já configuradas.

> Ordem sempre: `migrate` → `seed` → `seed:demo` (o demo depende do catálogo).

---

## 5. Expor a aplicação

1. Na aba **Settings** do backend, em **Networking**, clique em **Generate Domain**.
2. O Railway cria uma URL pública (algo como `https://elab-production.up.railway.app`).
3. Acesse essa URL no navegador: como o Express serve o `frontend/`, o sistema completo abre nela. Se rodou o `seed:demo`, logue com `empresa1@elab.com` / `colab1@elab.com`, senha `demo12345`.

---

## 6. Pontos de atenção (importantes)

- **Upload de currículo some em redeploys.** O `upload.js` grava os arquivos em `uploads/curriculos` no disco do container, que é **efêmero** no Railway. A cada novo deploy os currículos enviados se perdem. Para demonstração costuma ser tolerável; para uso real seria preciso um storage externo (ex.: S3) ou um **Volume** do Railway montado em `backend/uploads`.
- **CORS está aberto** (`app.use(cors())`). Como o front é servido pelo mesmo domínio do back, funciona sem ajuste. Se um dia separar o front em outro domínio, restrinja o `origin` (há um `TODO` no `server.js`).
- **Crédito gratuito é limitado.** O plano free do Railway tem um teto de uso mensal; um projeto parado consome pouco, mas monitore o consumo no painel.
- **Segredos nunca no Git.** `JWT_SECRET` e credenciais do banco vivem só nas Variables do Railway. O `.env` continua no `.gitignore`.

---

## Resumo do fluxo

```
Railway project
├── MySQL (serviço)        → credenciais MYSQL*
└── Backend (serviço)      → Root Directory: backend
    ├── Variables: DB_* + DB_SSL=true + JWT_SECRET + NODE_ENV
    ├── migrate + seed (uma vez, contra o banco da nuvem)
    └── Generate Domain     → URL pública (back + front juntos)
```
