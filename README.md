# ELAB
Rede profissional que conecta colaboradoras (mulheres em tech) a empresas — vagas, eventos e projetos freelance.

## Funcionalidades Implementadas

**Frontend (`/frontend`)** — Totalmente conectado ao backend:
- Login e Registro com validação.
- Feed de oportunidades com filtros por tipo.
- Página de Detalhes da Oportunidade.
- Fluxo de Inscrição/Candidatura com geração de protocolo.
- Gestão de Perfil (Visualização e Edição).
- Painel da Empresa: Publicação de novas oportunidades e listagem de postagens da própria empresa.

**Backend (`/backend`)** — API Node.js + Express com MySQL:
- Autenticação JWT com senhas criptografadas (bcrypt).
- CRUD completo de Oportunidades (Vagas, Eventos, Palestras e Bolsas).
- Sistema de Inscrições vinculando Profissionais às Oportunidades.
- Modelagem de Habilidades N:N para filtragem e requisitos.
- Validação de entrada, rate limit no login e tratamento de erros global.

## Como rodar o projeto

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Importar o esquema completo do banco de dados
/opt/lampp/bin/mysql -u root elab < db/migrations/full_schema.sql
# Popular com dados de teste
/opt/lampp/bin/mysql -u root elab < db/seed.sql
npm run dev
```
Servidor sobe em `http://localhost:3000`.

### Frontend
Abrir os arquivos `.html` da pasta `frontend/` direto no navegador, ou usar a extensão **Live Server** do VS Code.

## Principais rotas da API

| Método | Rota | Requer login | Descrição |
|---|---|---|---|
| POST | `/api/v1/auth/registrar` | não | Criar conta |
| POST | `/api/v1/auth/login` | não | Login (retorna token) |
| GET | `/api/v1/oportunidades` | não | Listar vagas/eventos |
| POST | `/api/v1/oportunidades` | sim (empresa) | Criar vaga/evento |
| POST | `/api/v1/oportunidades/:id/inscricoes` | sim (colab) | Inscrever-se em oportunidade |
| GET | `/api/v1/perfil` | sim | Obter/Atualizar perfil |

## Estrutura do projeto
```
src/
├── config/       → variáveis de ambiente
├── middlewares/  → auth, validação, rate limit, erros
├── repositories/ → persistência de dados (MySQL)
├── services/     → regras de negócio
├── controllers/  → recebe request, chama service
└── routes/       → define os endpoints
db/
├── pool.js       → singleton de conexões
└── migrations/   → scripts SQL de estrutura e seed
```
