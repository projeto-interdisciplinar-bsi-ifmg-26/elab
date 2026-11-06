# ELAB 🚀

Rede profissional que conecta colaboradoras (mulheres em tecnologia) a empresas: vagas, eventos, palestras e bolsas de estudo. O diferencial é um **motor de compatibilidade baseado em teoria de grafos**, que ranqueia vagas para as colaboradoras, ranqueia candidatas para as empresas e sugere trilhas de aprendizado.

## 🌟 Visão Geral

O ELAB fomenta a equidade de gênero na área de tecnologia. A colaboradora monta um perfil estilo currículo (experiências, formações, áreas de interesse, habilidades e preferências) e vê o quanto cada vaga combina com ela. A empresa publica vagas com requisitos estruturados e vê quem se encaixa melhor.

### 🛠️ Tecnologias

- **Frontend:** HTML5, CSS3 e JavaScript ES6+ com ES Modules (sem framework)
- **Backend:** Node.js e Express, em camadas (routes, controllers, services, repositories)
- **Banco de dados:** MySQL/MariaDB com migrations versionadas
- **Autenticação:** JWT e bcrypt
- **Segurança:** helmet (CSP), express-validator, queries com prepared statements, rate limit nas rotas de autenticação, upload de currículo validado pela assinatura real do arquivo

---

## ✨ Funcionalidades

### 👩‍💻 Para colaboradoras
- **Perfil completo:** dados pessoais, experiências, formações, áreas de atuação com nível de interesse, habilidades, preferências (modalidade e pretensão) e upload de currículo (PDF ou DOCX, até 5 MB), com barra de completude.
- **Feed ranqueado:** vagas ordenadas por compatibilidade, com selo de porcentagem.
- **Detalhe da vaga:** explica "por que deu X%" (habilidades, área, nível e preferências), mostra a situação de cada requisito e a **trilha de aprendizado** até as habilidades que faltam.
- **Candidaturas:** envio de mensagem, protocolo de confirmação e histórico.

### 🏢 Para empresas
- **Painel de publicações:** criação de vaga, evento, palestra ou bolsa. Vagas aceitam área, nível, modalidade, faixa salarial e requisitos com importância (1 a 5) e obrigatoriedade.
- **Candidaturas dentro da vaga:** a página de detalhe mostra as inscritas ordenadas por score, com as habilidades que faltam e o aviso de requisito obrigatório ausente. Só a empresa dona da vaga enxerga.
- **Alocação ótima:** distribui as candidatas entre as vagas da empresa maximizando o score total.

---

## 🧠 Motor de grafos

O código fica em `backend/src/graph/`. O grafo de habilidades e a árvore de áreas são lidos do banco e mantidos em cache, então habilidade ou aresta nova entra no match sem mudar código.

**Pontuação (0 a 100):** 55% habilidades + 20% área + 15% nível + 10% preferências. Habilidade obrigatória ausente multiplica o score por 0,7.

| Conceito de grafos | Onde aparece |
|---|---|
| Grafo não direcionado e ponderado (lista de adjacência) | `graph/Grafo.js`, arestas na tabela `Habilidades_Relacionadas` |
| Fila de prioridade (min-heap) | `graph/MinHeap.js` |
| Caminho mínimo (Dijkstra multi-origem) | `graph/dijkstra.js`: custo da aresta `-ln(peso)`, logo o menor caminho é o maior produto de pesos; similaridade `exp(-distância)` |
| Árvore e ancestral comum (LCA) | `graph/arvoreAreas.js`: afinidade de área `0,7^distância` |
| Grafo bipartido e emparelhamento de peso máximo (algoritmo húngaro) | `graph/hungaro.js`, usado em `POST /match/alocacao` |
| Trilha de aprendizado (caminho mínimo até a habilidade que falta) | `motorMatch.js` e `GET /match/trilha/:vagaId` |
| Vaga e habilidade como arestas ponderadas | tabela `Oportunidades_Habilidades` (importância e obrigatoriedade) |

---

## 🚀 Como executar

### 📋 Pré-requisitos
- Node.js
- MySQL ou MariaDB rodando, com um banco chamado `elab`

### ⚙️ Backend
```bash
cd backend
npm install
cp .env.example .env
# edite o .env com as credenciais do MySQL e o segredo do JWT
npm run migrate   # cria e atualiza as tabelas (migrations 001 a 019)
npm run seed      # carrega o catálogo: áreas, habilidades e relações entre habilidades
npm run dev       # servidor em http://localhost:3000
```

O seed carrega **apenas dados de referência**, sem usuárias, vagas ou inscrições falsas. Ele é idempotente e lê `backend/db/seeds/seeds.config.json` e os JSONs em `backend/db/seeds/data/`.

#### 🎭 Dados de demonstração (opcional)
```bash
npm run seed:demo
```
> ⚠️ **Destrutivo:** apaga todos os usuários, exceto `admin@elab.com`, e recria os dados de demonstração. Faça backup antes, se o banco tiver algo que importe.

Cria 8 empresas (`empresa1@elab.com` a `empresa8@elab.com`), 40 vagas, 8 eventos, palestras e bolsas, 100 colaboradoras (`colab1@elab.com` a `colab100@elab.com`) e 429 candidaturas. A senha de todas é `demo12345`. A semente é fixa, então o resultado é sempre o mesmo. `empresa1` e `empresa2` recebem de 10 a 16 candidatas por vaga; `colab1` e `colab2` têm perfil completo e candidaturas, ideais para demonstrar o match. A tela de login também tem botões de conta demo.

### 🖥️ Frontend
O próprio Express serve a pasta `frontend/`. Com o servidor rodando, abra `http://localhost:3000`.

### 🧪 Testes
Com o servidor rodando:
```bash
npm test
```
Roda seis suítes ponta a ponta: grafo, perfil, match, candidatos, criação de vaga e alocação. Elas criam dados temporários e removem tudo no final.

---

## 🔌 API (`/api/v1`)

Resposta padrão: `{ "sucesso": true, "dados": ... }`.

| Grupo | Rotas | Acesso |
|---|---|---|
| Auth | `POST /auth/registrar`, `POST /auth/login` | público |
| Catálogo | `GET /catalogo/habilidades`, `/areas`, `/opcoes` | público |
| Oportunidades | `GET /oportunidades`, `GET /oportunidades/:id` | público |
| | `GET /oportunidades/minhas-inscricoes` | colaboradora (histórico de candidaturas e inscrições, com nota de compatibilidade nas vagas) |
| | `GET /oportunidades/minhas`, `POST /oportunidades`, `GET /oportunidades/:id/candidatos` | empresa (candidatos só da própria vaga) |
| | `POST /oportunidades/:id/inscricoes` | colaboradora |
| Perfil | `GET/PUT /perfil`, `GET /perfil/completo` | autenticado / colaboradora |
| | `PUT /perfil/dados`, `/preferencias`, `/areas`, `/habilidades` | colaboradora |
| | `/perfil/experiencias` e `/perfil/formacoes` (CRUD) | colaboradora |
| | `POST/GET/DELETE /perfil/curriculo` | colaboradora |
| Match | `GET /match/vagas`, `GET /match/trilha/:vagaId` | colaboradora |
| | `POST /match/alocacao` | empresa |

---

## 📂 Estrutura do projeto

```
.
├── frontend/             # HTML, CSS e JS (ES Modules)
│   └── js/
│       ├── core/         # dom, api, state, forms, render, match, candidatas, vagaForm...
│       └── pages/        # um módulo por página
└── backend/
    ├── server.js         # monta o Express e as rotas
    ├── src/
    │   ├── config/       # variáveis de ambiente
    │   ├── routes/       # endpoints e validações
    │   ├── controllers/  # orquestração das requisições
    │   ├── services/     # regras de negócio
    │   ├── repositories/ # queries SQL
    │   ├── middlewares/  # auth, validação, rate limit, upload
    │   └── graph/        # motor de grafos e de match
    ├── db/
    │   ├── pool.js       # conexões MySQL e transações
    │   ├── migrate.js    # runner de migrations (lock, checksum, idempotente)
    │   ├── migrations/   # 001 a 019
    │   ├── seed.js       # seed genérico e idempotente
    │   └── seeds/        # configuração e JSONs do catálogo
    └── scripts/          # suítes de teste ponta a ponta
```

> Migrations já aplicadas nunca são editadas: qualquer mudança de esquema vira uma migration nova.

---

## 🎨 Identidade visual
Paleta em tons de roxo, rosa e lilás, pensada para acessibilidade e para criar um ambiente acolhedor para a comunidade feminina de tecnologia.

---

**Desenvolvido por:** Caio Vitor, David Rodrigues, Jonathan Alexandre, Igor Barbosa, Isabelle Pascini e Mateus Batista.
