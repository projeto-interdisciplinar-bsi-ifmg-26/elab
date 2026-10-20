# ELAB

Rede profissional que conecta colaboradoras (mulheres em tech) a empresas — vagas, eventos e projetos freelance.

## O que já existe

**Frontend** (`/frontend`) — páginas HTML/CSS simples, sem lógica ainda:
- `index.html` — landing
- `login.html` / `registro.html`
- `painel-empresa.html` / `painel-colaboradora.html`

**Backend** (`/backend`) — API Node.js + Express com banco de dados MySQL:
- Autenticação (registro/login) com JWT + senha criptografada
- CRUD de oportunidades (vagas/eventos)
- Sistema de migrations e seeds para versionamento do banco
- Validação de entrada, rate limit no login, tratamento de erros

## Como rodar o backend

```bash
cd backend
npm install
cp .env.example .env
# Rodar migrations para criar as tabelas
npm run migrate
# Opcional: Popular com dados de teste
npm run seed
npm run dev
```

Servidor sobe em `http://localhost:3000`.

## Como rodar o frontend

Abrir os arquivos `.html` da pasta `frontend/` direto no navegador, ou usar a extensão **Live Server** do VS Code.

> Frontend e backend ainda não estão conectados (sem `fetch` implementado).

## Principais rotas da API

| Método | Rota | Requer login | Descrição |
|---|---|---|---|
| POST | `/api/v1/auth/registrar` | não | Criar conta |
| POST | `/api/v1/auth/login` | não | Login (retorna token) |
| GET | `/api/v1/oportunidades` | não | Listar vagas/eventos |
| POST | `/api/v1/oportunidades` | sim (empresa) | Criar vaga/evento |

## Estrutura do backend

```
src/
├── config/       → variáveis de ambiente
├── middlewares/  → auth, validação, rate limit, erros
├── repositories/ → persistência de dados (MySQL)
├── services/     → regras de negócio
├── controllers/  → recebe request, chama service
└── routes/       → define os endpoints
db/
├── config.js     → configurações de conexão
├── pool.js       → singleton de conexões
├── migrate.js    → motor de migrations
└── migrations/   → arquivos .sql de versão do banco
```

## Próximos passos

- Conectar frontend na API (fetch de login/registro)
- Mecanismo de match colaboradora ↔ oportunidade (plano já definido, não implementado)
