# ELAB 🚀

Rede profissional que conecta colaboradoras (mulheres em tecnologia) a empresas: vagas, eventos, palestras e bolsas de estudo. O diferencial é um **motor de compatibilidade baseado em teoria de grafos**, que ranqueia vagas para as colaboradoras, ranqueia candidatas para as empresas e sugere trilhas de aprendizado.

Projeto interdisciplinar do curso de Sistemas de Informação (IFMG), com a teoria de grafos como eixo técnico.

## 🌟 Visão geral

O ELAB fomenta a equidade de gênero na área de tecnologia. A colaboradora monta um perfil estilo currículo (experiências, formações, áreas de interesse, habilidades e preferências) e vê o quanto cada vaga combina com ela, com a explicação do cálculo. A empresa publica vagas com requisitos estruturados e vê quem se encaixa melhor.

### 🛠️ Tecnologias

- **Frontend:** HTML5, CSS3 e JavaScript ES6+ com ES Modules (sem framework)
- **Backend:** Node.js e Express, em camadas (routes, controllers, services, repositories)
- **Banco de dados:** MySQL/MariaDB com migrations versionadas
- **Autenticação:** JWT e bcrypt
- **Segurança:** helmet (CSP, sem JavaScript inline), express-validator, prepared statements, rate limit nas rotas de autenticação, validação de CNPJ e upload de currículo conferido pela assinatura real do arquivo

---

## ✨ Funcionalidades

### 👩‍💻 Para colaboradoras
- **Perfil completo:** dados pessoais, experiências, formações, áreas de atuação com nível de interesse, habilidades, preferências (modalidade e pretensão) e upload de currículo (PDF ou DOCX, até 5 MB), com barra de completude.
- **Feed ranqueado:** vagas ordenadas por compatibilidade, com selo de porcentagem.
- **Detalhe da vaga:** explica "por que deu X%" (habilidades, área, nível e preferências), mostra a situação de cada requisito e a **trilha de aprendizado** até as habilidades que faltam.
- **Candidaturas:** envio de mensagem, protocolo de confirmação e histórico no perfil (vindo do servidor), com a nota de compatibilidade de cada vaga, busca e filtro por tipo.

### 🏢 Para empresas
- **Painel de publicações:** criação de vaga, evento, palestra ou bolsa. Vagas aceitam área, nível, modalidade, faixa salarial e requisitos com importância (1 a 5) e obrigatoriedade. A lista das publicações tem busca, filtro por tipo e paginação.
- **Candidaturas dentro da vaga:** a página de detalhe mostra as inscritas ordenadas por score, com as habilidades que faltam e o aviso de requisito obrigatório ausente, com busca e filtros por compatibilidade e por requisito obrigatório. Só a empresa dona da vaga enxerga.
- **Alocação ótima:** distribui as candidatas entre as vagas da empresa maximizando o score total.

### 🔎 Listas
Feed, vagas, oportunidades, painel da empresa, candidaturas e histórico usam o mesmo componente (`frontend/js/core/lista.js`): busca, filtros e paginação no topo e no rodapé. A filtragem acontece no navegador.

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

## 🗄️ Modelo de dados

| Tabela | Papel |
|---|---|
| `Usuarios` | Login e papel (`profissional`, `entidade_parceira`, `admin`) |
| `Profissionais` | Perfil da colaboradora (1:1 com `Usuarios`) |
| `Entidades_Parceiras` | Perfil da empresa (1:1 com `Usuarios`) |
| `Experiencias_Profissionais`, `Formacoes_Academicas` | Itens do currículo |
| `Preferencias_Profissional` | Modalidade e pretensão salarial |
| `Areas_Atuacao` | Árvore de áreas (autorreferência) |
| `Profissional_Areas` | Áreas de interesse da colaboradora, com nível de interesse |
| `Habilidades` | Catálogo de habilidades |
| `Habilidades_Relacionadas` | Arestas ponderadas do grafo de habilidades |
| `Habilidades_Profissional` | Habilidades da colaboradora, com anos de experiência |
| `Oportunidades` | Vagas, eventos, palestras e bolsas (coluna `tipo`) |
| `Oportunidades_Habilidades` | Requisitos da vaga (importância e obrigatoriedade) |
| `Cadastros_Oportunidades` | Candidaturas e inscrições (N:N), com mensagem e protocolo |

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
npm run migrate   # cria e atualiza as tabelas (migrations 001 a 020)
npm run seed      # carrega o catálogo: áreas, habilidades e relações entre habilidades
npm run dev       # servidor em http://localhost:3000
```

O seed carrega **apenas dados de referência**, sem usuárias, vagas ou inscrições falsas. Ele é idempotente e lê `backend/db/seeds/seeds.config.json` e os JSONs em `backend/db/seeds/data/`.

### 🎭 Dados de demonstração (opcional)
```bash
npm run seed:demo
```
> ⚠️ **Destrutivo:** apaga todos os usuários, exceto `admin@elab.com`, e recria os dados de demonstração. Faça backup antes se o banco tiver algo que importe.

Cria 8 empresas, 40 vagas, 8 eventos, palestras e bolsas, 100 colaboradoras e 429 candidaturas. A semente é fixa, então o resultado é sempre o mesmo. A tela de login tem botões de conta demo.

| Contas | E-mail | Senha |
|---|---|---|
| Empresas | `empresa1@elab.com` a `empresa8@elab.com` | `demo12345` |
| Colaboradoras | `colab1@elab.com` a `colab100@elab.com` | `demo12345` |

`empresa1` e `empresa2` recebem de 10 a 16 candidatas por vaga. `colab1` e `colab2` têm perfil completo e candidaturas, ideais para demonstrar o match.

### 🖥️ Frontend
O próprio Express serve a pasta `frontend/`. Com o servidor rodando, abra `http://localhost:3000`.

### 🧪 Testes
Com o servidor rodando:
```bash
npm test
```
Roda seis suítes: grafo (algoritmos e motor, com grafos pequenos de resposta conhecida), perfil, match, candidatos, criação de vaga e alocação. As suítes de API criam dados temporários e removem tudo no final.

---

## 🔌 API (`/api/v1`)

Resposta padrão: `{ "sucesso": true, "dados": ... }`. Erros seguem o mesmo envelope, com o status HTTP adequado.

| Grupo | Rotas | Acesso |
|---|---|---|
| Auth | `POST /auth/registrar`, `POST /auth/login` | público |
| Catálogo | `GET /catalogo/habilidades`, `/areas`, `/opcoes` | público |
| Oportunidades | `GET /oportunidades`, `GET /oportunidades/:id` | público |
| | `GET /oportunidades/minhas-inscricoes` | colaboradora (histórico, com nota de compatibilidade nas vagas) |
| | `POST /oportunidades/:id/inscricoes` | colaboradora |
| | `GET /oportunidades/minhas`, `POST /oportunidades`, `GET /oportunidades/:id/candidatos` | empresa (candidatos só da própria vaga) |
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
│       ├── core/         # dom, api, state, forms, render, lista, match, candidatas, vagaForm...
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
    │   ├── migrations/   # 001 a 020
    │   ├── seed.js       # seed do catálogo, idempotente
    │   ├── seed-demo.js  # seed de demonstração (destrutivo)
    │   └── seeds/        # configuração e JSONs do catálogo e da demonstração
    └── scripts/          # suítes de teste
```

> Migrations já aplicadas nunca são editadas: qualquer mudança de esquema vira uma migration nova. A 020 removeu tabelas legadas sem uso (`Eventos`, `Cadastros_Eventos` e `Habilidades_Oportunidade`).

---

## ⚠️ Limitações conhecidas

- Os pesos do score (55/20/15/10) e o fator 0,7 são escolhas de projeto, ainda sem validação experimental contra um baseline simples (por exemplo, similaridade de Jaccard entre tags).
- Não há ciclo de vida de candidatura: a empresa não altera o status (em análise, aprovada, recusada) e a colaboradora não cancela.
- Não há recuperação de senha, exclusão de conta nem moderação de cadastro de empresas (o CNPJ tem só o formato validado).
- O score é uma ferramenta de apoio e não deve ser usado como filtro eliminatório: a página mostra o motivo de cada nota justamente para manter o cálculo transparente.
- Busca, filtros e paginação rodam no navegador; com volume grande, seria preciso paginar no servidor.
- Alguns serviços consultam o banco em loop (por candidata ou por vaga), adequado ao volume atual.

---

## 📚 Documentação

| Pasta ou arquivo | Conteúdo |
|---|---|
| [`docs/es/`](docs/es/README.md) | Engenharia de software: requisitos, histórias de usuário, casos de uso, arquitetura e testes |
| [`docs/bd/`](docs/bd/README.md) | Banco de dados: modelo ER, dicionário de dados, normalização, índices e consultas |
| [`docs/GRAFOS.md`](docs/GRAFOS.md) | Teoria de grafos no projeto e experimento contra baselines |
| [`backend/db/README.md`](backend/db/README.md) | Migrations, runner e segurança do banco |

---
## 🎨 Identidade visual
Paleta em tons de roxo, rosa e lilás, pensada para criar um ambiente acolhedor para a comunidade feminina de tecnologia.

---

**Desenvolvido por:** Caio Vitor, David Rodrigues, Jonathan Alexandre, Igor Barbosa, Isabelle Pascini e Mateus Batista.