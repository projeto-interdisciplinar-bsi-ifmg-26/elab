# Plano de features: currículo, fotos, moderação e administração

Documento de trabalho para quem for implementar. **Apagar este arquivo ao concluir** e deixar a documentação definitiva em `docs/es/`, `docs/bd/` e no README (fase 6).

## 0. Regras do projeto

- Repositório de trabalho: `/home/pit/Projetos/elabproj` (o clone `/home/pit/Projetos/elab` é antigo, não usar).
- O usuário alterna entre fish e zsh: use comandos compatíveis com os dois (`&&`, sem heredoc, sem `for ... end`, sem `--include=*.js` no `grep`).
- MySQL pelo XAMPP: `sudo /opt/lampp/lampp startmysql`; cliente: `/opt/lampp/bin/mysql -u root elab`.
- Camadas: routes, controllers, services, repositories. Prepared statements sempre. Resposta `{ sucesso, dados }`; erros por `ApiError`.
- Migrations: nunca editar uma aplicada; uma operação lógica por arquivo; idempotente (padrão da `019`, com `information_schema` e `PREPARE`). A próxima é a `021`.
- Frontend: ES Modules, sem JavaScript inline (CSP do `helmet`), todo texto do usuário passa por `esc()`. Listas usam `montarLista`.
- Um commit por fase, só com `npm test` verde (servidor ligado) e telas conferidas no navegador.
- Antes de começar, ler o que este plano não cobre: `frontend/js/core/shell.js`, `frontend/js/pages/index.js`, `login.js`, `registro.js`, `candidatas.js`, `vagaForm.js`, `perfil.controller.js`, `perfil.service.js`, `perfilExtras.routes.js`, `perfilCompleto.service.js`, `alocacao.repository.js`, `db/seed-demo.js` (trechos de INSERT) e os `scripts/teste-*.js`.

## 1. Estado atual (verificado)

| Item | Situação |
|---|---|
| Currículo, backend | Pronto: `POST/GET/DELETE /perfil/curriculo`, campo multipart `curriculo`, 5 MB, PDF ou DOCX, assinatura conferida, nome aleatório em `backend/uploads/curriculos/` (fora de `frontend/`, nunca estático). Testado em `teste-perfil.js` |
| Currículo, interface | **Não existe.** Nenhuma tela menciona currículo |
| Perfil completo, interface | **Não existe.** O frontend só usa `GET/PUT /perfil` (nome, área, cidade, bio). Experiências, formações, áreas, habilidades e preferências só existem na API |
| Foto de perfil e imagem em postagem | Não existem (nem coluna, nem rota, nem tela) |
| Usuário `admin` | **Não existe no banco.** O cadastro só aceita `profissional` e `entidade_parceira`. O README cita `admin@elab.com`, mas nada o cria. O `seed:demo` apenas preserva um admin que não existe |
| `Entidades_Parceiras.status_aprovacao` | Existe (`pendente` por padrão), mas a API nunca o lê; só o `seed:demo` o grava. Hoje qualquer cadastro de empresa publica |
| `uploads/` | Existe e está vazio. **Não está no `.gitignore`** |
| `frontend/js/core/api.js` | Só JSON (`Content-Type` fixo e `JSON.stringify`), base `http://localhost:3000/api/v1` fixa. Não envia `FormData` e não baixa arquivo com token |
| CSP do `helmet` | `img-src 'self' data:`. Imagem por `blob:` seria bloqueada |
| `detalhe.js` | Chama `GET /oportunidades/:id` com `auth: false` |
| `editar.js` | Usa `$('main form')`: um segundo `<form>` antes do de perfil quebra a tela |
| `style.css` | `.avatar` e `.perfil-avatar` estão definidos várias vezes (linhas ~666, 1057, 1491, 2229, 2860). Regras novas vão no fim do arquivo |
| Migrations | Aplicadas até a `020` |

## 2. Decisões (padrões adotados; o grupo pode trocar)

1. **Foto reprocessada com `sharp`**: redimensiona, converte para WebP e descarta metadados (localização). Limite de 2 MB, só JPEG, PNG e WebP. SVG e GIF são proibidos. Se `npm i sharp` falhar no Node do usuário (v26), usar o plano B: validar a assinatura e gravar sem reprocessar.
2. **Fotos são públicas por URL de nome aleatório** (16 bytes em hexadecimal). Currículos continuam privados.
3. **Moderação**: toda publicação nova nasce `pendente`; empresa nova nasce `pendente` e só publica depois de aprovada.
4. **Empresa não baixa currículo de candidata** nesta versão (privacidade). Se o grupo quiser, é extensão posterior com rota própria só para a empresa dona da vaga.
5. **Limitação assumida**: o DOCX só é conferido pelos 4 primeiros bytes (`PK\x03\x04`); um zip renomeado passa. Registrar em `docs/es/testes.md`.

## 2.1 Migrations previstas

| Nº | Conteúdo |
|---|---|
| 021 | `Usuarios.foto_arquivo VARCHAR(255) NULL` |
| 022 | `Entidades_Parceiras.motivo_rejeicao VARCHAR(255) NULL` |
| 023 | `Oportunidades.status_moderacao ENUM('pendente','aprovada','rejeitada') NOT NULL DEFAULT 'pendente'`, `motivo_moderacao VARCHAR(255) NULL`, `moderada_em DATETIME NULL` (ADD COLUMN, um arquivo por coluna se preferir) |
| 024 | `UPDATE Oportunidades SET status_moderacao = 'aprovada', moderada_em = NOW() WHERE status_moderacao = 'pendente'` (aprova o que já existia; idempotente) |
| 025 | `Oportunidades.imagem_arquivo VARCHAR(255) NULL` |

## 3. Fases

### Fase 0. Higiene e base

- `.gitignore`: acrescentar `backend/uploads/`.
- `api.js`: aceitar `FormData` (não definir `Content-Type`, não usar `JSON.stringify`); base relativa `/api/v1`; função `baixar(path, nomeSugerido)` que faz `fetch` com token, lê o `blob` e dispara o download.
- Admin: criar `backend/db/criar-admin.js` e o script `npm run admin:criar`, que lê `ADMIN_EMAIL` e `ADMIN_SENHA` do ambiente, grava hash bcrypt e é idempotente. O `seed:demo` passa a garantir `admin@elab.com` com senha `demo12345`.
- Conferir se `GET /perfil` funciona para admin (ele não tem linha em `Profissionais` nem em `Entidades_Parceiras`); se devolver 404, tratar o papel no `perfil.service.js`. O `main.js` depende dessa rota para qualquer página logada.
- Aceite: `git status` não mostra `uploads/`; login como admin devolve token e `GET /perfil` responde 200.

### Fase 1. Currículo na interface

- Novo `frontend/js/core/curriculo.js` com `montarCurriculo(el)`; bloco `<section id="curriculo">` em `editar-perfil.html`, **sem** `<form>` (usar `<input type="file" accept=".pdf,.docx">` e botões com handlers próprios, por causa do `main form`).
- Enviar: `POST /perfil/curriculo` com `FormData` (campo `curriculo`). Baixar: `GET /perfil/curriculo` via `baixar()`. Remover: `DELETE /perfil/curriculo` com confirmação.
- Validar no cliente (extensão e 5 MB) só como conforto; o servidor é a barreira. Mostrar o nome do arquivo e a data do último envio.
- `perfil.html`: mostrar "Currículo: nome.pdf" com o botão de baixar, ou "Não enviado".
- Contratos existentes: 201 `{ nome }`; 404 sem currículo; 400 para extensão ou conteúdo inválido ou acima de 5 MB; 403 para empresa; 401 sem token.
- Aceite: enviar PDF válido, trocar por outro (o arquivo antigo some de `uploads/curriculos/`), baixar, remover; arquivo falso mostra o erro do servidor.

### Fase 1B (recomendada). Perfil completo na interface

Sem ela, conta nova não tem habilidades nem áreas e o match fica baixo.

- Telas ou seções para: dados pessoais completos (`PUT /perfil/dados`), preferências (`PUT /perfil/preferencias`), áreas com interesse 1 a 5 (`PUT /perfil/areas`, lista completa substitui), habilidades com anos (`PUT /perfil/habilidades`, idem), experiências e formações (CRUD em `/perfil/experiencias` e `/perfil/formacoes`).
- Dados do catálogo: `GET /catalogo/habilidades`, `/areas`, `/opcoes`. Barra de completude: `GET /perfil/completo`.
- Aceite: conta nova preenche o perfil só pela interface e o feed passa a mostrar compatibilidade.

### Fase 2. Foto de perfil (colaboradora e empresa)

- Migration `021`.
- Novo `middlewares/uploadImagem.js`: `multer` com `memoryStorage`, limite de 2 MB, 1 arquivo, campo `foto`.
- Novo `services/imagem.service.js`: confere a assinatura (JPEG `FF D8 FF`; PNG `89 50 4E 47 0D 0A 1A 0A`; WebP `RIFF....WEBP`), reprocessa com `sharp` (`rotate()`, `resize` 512x512 `cover`, WebP qualidade 80, sem metadados), grava em `backend/uploads/fotos/<hex aleatório>.webp` e apaga a anterior.
- Rotas (qualquer usuário autenticado): `POST /perfil/foto` (201 `{ fotoUrl }`) e `DELETE /perfil/foto`. Limitador de requisições próprio nas duas.
- Servir: em `server.js`, `express.static` apenas da pasta `uploads/fotos` em `/media/fotos` (`index: false`, `dotfiles: 'deny'`). **Nunca** expor `uploads/curriculos`.
- `GET /perfil` passa a devolver `fotoUrl`. A lista de candidatas (`candidatos.repository.js`) devolve `fotoUrl` de cada inscrita.
- Frontend: helper `avatarHtml(nome, fotoUrl)` (imagem com `alt` ou a inicial como reserva) usado em `shell.js` (barra do topo), `perfil.js` e `candidatas.js`. Regra CSS nova no fim do `style.css`: `.avatar img, .perfil-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: inherit; }`.
- Erros: 400 tipo ou conteúdo inválido, 400 acima de 2 MB, 401 sem token.
- Aceite: enviar PNG, ver o avatar no topo e no perfil; trocar; remover volta à inicial; arquivo `.svg` ou texto renomeado para `.png` é recusado.

### Fase 3. Administração: aprovação de empresas

- Migration `022`.
- Novos `admin.routes.js`, `admin.controller.js`, `admin.service.js`, `admin.repository.js`, montados em `server.js` em `/api/v1/admin`, todos com `autenticar` e `permitir('admin')`.
  - `GET /admin/empresas?status=pendente|aprovada|rejeitada` devolve `{ id, nome, cnpj, email, statusAprovacao, motivoRejeicao }`.
  - `PUT /admin/empresas/:id/status` com `{ status, motivo? }` (`motivo` obrigatório quando `rejeitada`). 404 se não existir; 400 se o status for inválido.
- Trava: em `oportunidade.service.js` `criar`, ler `status_aprovacao` junto do `SELECT` já existente; se não for `aprovada`, `ApiError(403, 'Sua empresa ainda não foi aprovada')`.
- `GET /perfil` da empresa devolve `statusAprovacao` e `motivoRejeicao`.
- Frontend: `admin.html` + `js/pages/admin.js` (registrar em `pages/index.js`; item de menu no `shell.js` só para admin; `login.js` leva admin a `admin.html`). Lista com `montarLista` (busca por nome ou CNPJ, filtro por status, 6 por página) e botões Aprovar e Rejeitar (pede o motivo). `painel-empresa.html` mostra aviso e desabilita o formulário enquanto a empresa não estiver aprovada, com o motivo se rejeitada.
- Aceite: empresa nova não publica (403); o admin aprova; ela passa a publicar; rejeitada vê o motivo; colaboradora e empresa recebem 403 em `/admin/*`.

### Fase 4. Administração: moderação de publicações

- Migrations `023` e `024`.
- Autenticação opcional: novo middleware `autenticarOpcional` (preenche `req.usuario` se houver token válido, senão segue anônimo). Usar em `GET /oportunidades` e `GET /oportunidades/:id`. **Trocar `auth: false` por token em `detalhe.js`.**
- Visibilidade:
  - `POST /oportunidades` cria com `status_moderacao = 'pendente'` e devolve `statusModeracao`.
  - `GET /oportunidades` (público) devolve só `aprovada`. `listar` do repository ganha o filtro `moderacao`; `listarMinhas` não filtra e devolve `statusModeracao` e `motivoModeracao`.
  - `GET /oportunidades/:id`: `aprovada` para todos; qualquer estado para a empresa dona e para o admin; para os demais, 404.
  - `inscrever`: oportunidade não aprovada responde 404 para a colaboradora.
  - Match: `listarVagasAtivas` em `match.repository.js` filtra `AND status_moderacao = 'aprovada'`; o serviço de trilha trata vaga não aprovada como inexistente. Conferir `alocacao.repository.js`.
- Admin: `GET /admin/oportunidades?status=pendente` e `PUT /admin/oportunidades/:id/moderacao` com `{ status: 'aprovada'|'rejeitada', motivo? }` (`motivo` obrigatório na rejeição). Grava `moderada_em` e `motivo_moderacao`.
- Frontend: fila no `admin.html` (aba ou seção) com pré-visualização do conteúdo; `painel-empresa` e `empresa.js` mostram selo "Em análise", "Aprovada" ou "Rejeitada (motivo)" em cada publicação, com filtro por esse estado.
- **`seed-demo.js`**: gravar `status_moderacao = 'aprovada'` nas oportunidades e `status_aprovacao = 'aprovada'` nas empresas, senão a demonstração fica vazia.
- **Testes existentes quebram sem ajuste**: empresas registradas pela API nascem pendentes e as vagas também. Criar `backend/scripts/_aprovar.js` com `aprovarEmpresa(email)` e `aprovarOportunidade(id)` (UPDATE direto no banco) e usá-lo em `teste-vaga`, `teste-candidatos`, `teste-alocacao` e `teste-match` (este insere vagas por SQL e elas passam a nascer pendentes).
- Aceite: vaga nova some do feed público e do ranking até o admin aprovar; a empresa dona a vê com "Em análise"; rejeitada some e mostra o motivo.

### Fase 5. Imagem nas postagens

- Migration `025`. Reaproveita `imagem.service.js` com perfil "banner" (caber em 1280x720 sem cortar, WebP), gravando em `backend/uploads/postagens/` e servida em `/media/postagens`.
- Rotas (empresa dona): `PUT /oportunidades/:id/imagem` (multipart, campo `imagem`, 2 MB) e `DELETE /oportunidades/:id/imagem`. 403 para empresa que não é dona; 404 para oportunidade inexistente.
- Trocar a imagem de uma publicação já aprovada devolve o estado para `pendente` (nova revisão).
- API: as listagens e o detalhe devolvem `imagemUrl`. `render.js` (`card`) e `detalhe.js` exibem a imagem com `alt`; o `painel-empresa` ganha o campo de imagem após criar a publicação. O admin vê a imagem na fila.
- Aceite: criar vaga, anexar imagem, aprovar no admin, ver no feed e no detalhe; substituir manda de volta para análise.

### Fase 6. Testes e documentação

- Novas suítes, todas encadeadas no `npm test`: `teste-admin.js` (aprovação de empresa, 403 e 401, trava de publicação), `teste-moderacao.js` (visibilidade por papel, 404 para não aprovada, motivo obrigatório, ranking), `teste-imagem.js` (PNG de poucos bytes gerado no próprio teste; arquivo falso, SVG e acima de 2 MB recusados; URL pública devolve `image/webp`; arquivo anterior é apagado; currículo não é acessível por `/media`). Cada uma limpa o que criar, inclusive os arquivos em `uploads/`.
- Atualizar: `README.md` (funcionalidades, rotas, admin e como criá-lo, pasta `uploads/`), `docs/es/requisitos.md` (novos RF e RNF), `historias-de-usuario.md`, `casos-de-uso.md`, `arquitetura.md` (uploads, `/media`, moderação), `testes.md`, `docs/bd/README.md` (colunas novas; remover a nota de que `status_aprovacao` não é usado) e `backend/db/README.md` (migrations 021 a 025).
- Apagar este arquivo.

## 4. Riscos

- `sharp` é dependência nativa: validar a instalação no Node do usuário antes da fase 2.
- Moderação e aprovação mudam o comportamento de listagens, ranking e testes: a fase 4 é a de maior risco de regressão.
- `GET /perfil` é chamado por todas as páginas logadas: qualquer erro nele (por exemplo, para admin) derruba o site inteiro.
- Arquivos órfãos em `uploads/` se o banco for gravado e o arquivo anterior não for apagado: sempre apagar o antigo e tolerar falha no `unlink`.