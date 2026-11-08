# Requisitos do ELAB

Cada requisito aponta para a rota (API) ou tela que o implementa, para ser verificável. Papéis: **Visitante** (sem login), **Colaboradora** e **Empresa**.

## 1. Requisitos funcionais

### Conta e acesso

| ID | Requisito | Papel | Implementação |
|---|---|---|---|
| RF01 | Cadastrar conta como colaboradora ou empresa, com validação de dados (empresa exige CNPJ válido) | Visitante | `POST /auth/registrar`, `registro.html` |
| RF02 | Impedir cadastro duplicado de e-mail ou CNPJ (resposta 409) | Visitante | `POST /auth/registrar` |
| RF03 | Entrar com e-mail e senha e receber um token de sessão | Visitante | `POST /auth/login`, `login.html` |
| RF04 | Restringir cada rota ao papel autorizado (401 sem token, 403 papel errado) | Todos | middlewares `autenticar` e `permitir` |

### Perfil da colaboradora

| ID | Requisito | Papel | Implementação |
|---|---|---|---|
| RF05 | Consultar e editar dados pessoais | Colaboradora | `GET/PUT /perfil`, `PUT /perfil/dados`, `editar-perfil.html`, `perfil.html` |
| RF06 | Gerenciar experiências profissionais e formações acadêmicas (criar, listar, editar, apagar) | Colaboradora | `/perfil/experiencias`, `/perfil/formacoes` |
| RF07 | Informar áreas de atuação com nível de interesse | Colaboradora | `PUT /perfil/areas` |
| RF08 | Informar habilidades com anos de experiência | Colaboradora | `PUT /perfil/habilidades` |
| RF09 | Informar preferências de modalidade e pretensão salarial | Colaboradora | `PUT /perfil/preferencias` |
| RF10 | Enviar, baixar e remover currículo (PDF ou DOCX) | Colaboradora | `POST/GET/DELETE /perfil/curriculo` |
| RF11 | Ver o perfil completo com barra de completude | Colaboradora | `GET /perfil/completo` |

### Oportunidades

| ID | Requisito | Papel | Implementação |
|---|---|---|---|
| RF12 | Listar e ver o detalhe de vagas, eventos, palestras e bolsas | Todos | `GET /oportunidades`, `GET /oportunidades/:id`, `vagas.html`, `oportunidades.html`, `detalhe.html` |
| RF13 | Buscar, filtrar e paginar as listas | Todos | `frontend/js/core/lista.js` (filtragem no navegador) |
| RF14 | Publicar vaga, evento, palestra ou bolsa | Empresa | `POST /oportunidades`, `painel-empresa.html` |
| RF15 | Definir em uma vaga área, nível, modalidade, faixa salarial e requisitos com importância (1 a 5) e obrigatoriedade | Empresa | `POST /oportunidades` |
| RF16 | Listar as próprias publicações | Empresa | `GET /oportunidades/minhas` |

### Candidatura

| ID | Requisito | Papel | Implementação |
|---|---|---|---|
| RF17 | Candidatar-se a vaga ou inscrever-se em evento, palestra ou bolsa, com mensagem opcional, recebendo protocolo | Colaboradora | `POST /oportunidades/:id/inscricoes`, `inscricao.html`, `confirmacao.html` |
| RF18 | Impedir inscrição repetida na mesma oportunidade (409) | Colaboradora | `POST /oportunidades/:id/inscricoes` |
| RF19 | Consultar o histórico de candidaturas e inscrições, com nota de compatibilidade nas vagas | Colaboradora | `GET /oportunidades/minhas-inscricoes`, `perfil.html` |
| RF20 | Ver as candidatas de uma vaga própria, ordenadas por compatibilidade, com habilidades faltantes e aviso de requisito obrigatório ausente | Empresa | `GET /oportunidades/:id/candidatos`, `detalhe.html` |
| RF21 | Negar acesso às candidaturas de vagas de outra empresa (403) | Empresa | `GET /oportunidades/:id/candidatos` |

### Compatibilidade (motor de grafos)

| ID | Requisito | Papel | Implementação |
|---|---|---|---|
| RF22 | Ranquear as vagas ativas por compatibilidade com o perfil | Colaboradora | `GET /match/vagas`, `feed.html` |
| RF23 | Explicar a nota (habilidades, área, nível e preferências) e a situação de cada requisito | Colaboradora | `detalhe.html`, `js/core/match.js` |
| RF24 | Sugerir trilha de aprendizado até as habilidades que faltam | Colaboradora | `GET /match/trilha/:vagaId` |
| RF25 | Distribuir candidatas entre as vagas da empresa maximizando o score total | Empresa | `POST /match/alocacao` |

### Catálogo

| ID | Requisito | Papel | Implementação |
|---|---|---|---|
| RF26 | Fornecer a lista de habilidades, áreas e opções de preenchimento | Todos | `GET /catalogo/habilidades`, `/areas`, `/opcoes` |

## 2. Requisitos não funcionais

| ID | Categoria | Requisito | Como é atendido |
|---|---|---|---|
| RNF01 | Segurança | Senhas guardadas com hash | bcrypt; o hash nunca é devolvido pela API |
| RNF02 | Segurança | Sessão por token com validade | JWT, validade padrão de 2 horas (`JWT_EXPIRES_IN`) |
| RNF03 | Segurança | Limitar tentativas de login e cadastro | 20 por IP a cada 15 minutos (`AUTH_RATE_LIMIT_MAX`), resposta 429 |
| RNF04 | Segurança | Validar toda entrada no servidor | express-validator em cada rota |
| RNF05 | Segurança | Evitar injeção de SQL | Prepared statements em todas as consultas |
| RNF06 | Segurança | Evitar XSS | CSP do helmet sem JavaScript inline e escape de todo texto exibido |
| RNF07 | Segurança | Aceitar só currículos legítimos | Máximo de 5 MB e 1 arquivo; tipo conferido pela assinatura real do arquivo |
| RNF08 | Manutenibilidade | Separar responsabilidades | Camadas routes, controllers, services e repositories |
| RNF09 | Manutenibilidade | Evoluir o banco sem perder dados | Migrations versionadas com checksum e lock; migration aplicada nunca é editada |
| RNF10 | Portabilidade | Reproduzir o ambiente de demonstração | `npm run seed:demo` determinístico |
| RNF11 | Confiabilidade | Operações compostas não ficam pela metade | Transações (`withTransaction`) |
| RNF12 | Usabilidade | Explicar o resultado do cálculo | Página de detalhe mostra o motivo de cada nota |
| RNF13 | Desempenho | Evitar recarregar o grafo a cada requisição | Cache em memória do grafo de habilidades e da árvore de áreas |
| RNF14 | Testabilidade | Verificar o sistema de forma automática | `npm test`, seis suítes (ver [testes.md](testes.md)) |

## 3. Regras de negócio

| ID | Regra |
|---|---|
| RN01 | Vagas nascem com status `ativo`; eventos, palestras e bolsas, com `agendado`. |
| RN02 | Só vagas têm requisitos e participam do cálculo de compatibilidade. |
| RN03 | Score de 0 a 100: 55% habilidades, 20% área, 15% nível e 10% preferências. |
| RN04 | Requisito obrigatório ausente multiplica o score por 0,7. |
| RN05 | Uma colaboradora só se inscreve uma vez em cada oportunidade. |
| RN06 | A empresa só enxerga as candidaturas das próprias vagas. |
| RN07 | A alocação descarta pares com score abaixo de 40. |

## 4. Rastreabilidade

Os requisitos RF22 a RF25 e as regras RN02 a RN04 e RN07 estão detalhados em [../GRAFOS.md](../GRAFOS.md). Os testes que verificam cada grupo de requisitos estão em [testes.md](testes.md).
