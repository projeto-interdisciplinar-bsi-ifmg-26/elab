# Documentação do Front-end — ELAB (Ponto de Controle III)

**Trabalho Interdisciplinar — Programação Web II**  
**IFMG — Campus Sabará • 2026**  
**Integrantes:** Caio Vitor • David Rodrigues • Jonathan Alexandre • Igor Barbosa • Isabelle Pascini • Mateus Batista  

---

## 1. Visão Geral do Front-end

O front-end do **ELAB** foi feito com tecnologias web normais: HTML5, CSS3 e JavaScript ES6+. Ele se conecta com o backend Node.js/Express. Existe um modo de demonstração local que você ativa escolhendo uma conta de demonstração na tela de login.

O projeto segue os fluxos de navegação que já existiam e tem uma interface simples, focada em oportunidades e pessoas da área de tecnologia.

---

## 2. Sistema de Design Gráfico Definido

### 2.1 Paleta de Cores

A interface usa rosa e lilás junto com roxo para destacar coisas importantes e a navegação:

| Token / Variável | Código Hexadecimal | O que faz na Interface |
| :--- | :--- | :--- |
| `--roxo` | `#821c8c` | Ações e links |
| `--roxo-esc` | `#580c5e` | Títulos e texto que precisa de mais destaque |
| `--painel` | `#ffffff` | Fundo de cartões e áreas de conteúdo |
| `--rosa` | `#f6a0f0` | Destaques e botões |
| `--bg` | `#fff6ff` | Fundo geral da página |
| `--borda` | `#efc9ef` | Contornos de cartões, campos e linhas divisórias |
| `--verde` | `#228b50` | Etiquetas de status confirmados e resultados de sucesso |
| `--texto` | `#35183a` | Texto principal |
| `--mut` | `#79657e` | Textos secundários e informações extras |

### 2.2 Tipografia e Escala Visual
* **Fonte principal:** Google Sans Flex (do Google Fonts), com fontes do sistema como alternativa.
* **Tamanhos de texto:**
  * `h1`: `1.75rem` / `2.0rem` (para títulos de página e seções)
  * `h2`: `1.30rem` (para subtítulos e blocos de informações principais)
  * `h3`: `1.10rem` (para títulos de cards de vagas e oportunidades)
  * `body`: `16px` com espaçamento entre linhas de `1.55` para facilitar a leitura
* **Acessibilidade:**
  * Quando o usuário usa a navegação pelo teclado, aparecem contornos claros de `3px` nos elementos clicáveis.
  * Tem suporte para quem prefere menos animação (`prefers-reduced-motion`).

### 2.3 Identidade Visual
* **Logo ELAB:** Usada nas páginas públicas, telas de acesso e no topo do site.
* **Interface:** A navegação tem ícones simples (sem emojis), uma barra lateral rosa e um topo lilás. Os cartões são mais claros.
* **Telas de entrada:** Login e cadastro aparecem em duas colunas, uma com ilustração e outra com o formulário.
* **Navegação lateral:** Pode ser encolhida no computador e aparece deslizando em telas menores.
* **Vídeos nas telas de entrada:** Usa vídeos WebM para o login (`media/login-elab-transparente.webm`) e o cadastro (`media/registro-elab.webm`).
* **Categorias:** São identificadas por nomes escritos.

---

## 3. Documentação das Páginas Funcionais

As páginas e os fluxos da interface que foram criados no front-end são:

| Página | Arquivo | Rota / Função Principal |
| :--- | :--- | :--- |
| **Início (Landing)** | `index.html` | Apresenta o ELAB, dá acesso à plataforma e mostra um resumo do que o site oferece. |
| **Login** | `login.html` | Formulário de acesso com ilustração, opção de mostrar/esconder a senha e dados para teste. A redefinição de senha ainda não funciona no site. |
| **Cadastro** | `registro.html` | Formulário com ilustração, escolha do tipo de conta, verificação da senha, aceite dos termos e login após o cadastro. |
| **Feed** | `feed.html` | Navegação principal, campo de busca, mensagem de boas-vindas personalizada, filtros por categoria e oportunidades em destaque. |
| **Vagas e Empregos** | `vagas.html` | Lista de vagas com filtros por tipo de trabalho (*Remoto*, *Híbrido*, *Presencial*). |
| **Oportunidades** | `oportunidades.html` | Uma grade com categorias e abas para filtrar (*Todas*, *Eventos*, *Palestras*, *Bolsas de Estudo*). |
| **Detalhes** | `detalhe.html` | Página que carrega informações específicas de cada item pelo seu `id`, mostrando a empresa, descrição, requisitos e um botão de ação (*Candidatar-se* / *Inscrever-se*). |
| **Inscrição** | `inscricao.html` | Formulário para se candidatar, pedindo uma carta de apresentação, link do portfólio/GitHub e autorização para usar os dados. O link é enviado para a API. |
| **Confirmação** | `confirmacao.html` | Tela de sucesso com uma animação de certo, um número de protocolo e informações sobre os próximos passos. |
| **Meu Perfil** | `perfil.html` | Um painel com avatar, dados pessoais, área de atuação e uma seção **Minhas Candidaturas e Inscrições** que mostra o histórico. |
| **Editar Perfil** | `editar-perfil.html` | Formulário para mudar as informações cadastradas, com salvamento automático pela API (`PUT /api/v1/perfil`). |
| **Painel da Empresa** | `painel-empresa.html` | Só para contas de empresas. Permite cadastrar novas vagas/oportunidades com validação completa, e elas aparecem no feed imediatamente. |

---

## 4. Dificuldades Percebidas no Desenvolvimento

1. **Visual e Identidade do Projeto:**  
   Achar um jeito de deixar a interface simples e clara, com bom contraste e destacando o que é importante.
2. **Arquitetura sem Frameworks:**  
   Criar partes que podem ser usadas em vários lugares (como a barra lateral que abre e fecha e o topo com o avatar) usando só JavaScript puro, de um jeito organizado e fácil de ler.
3. **Políticas de Segurança (CSP do Helmet):**  
   Mudar todo o código para não usar mais os comandos `onclick` diretos, seguindo as regras de *Content Security Policy* do servidor Express.
4. **Resiliência e Demonstração Independente:**  
   O modo de demonstração no `app.js` usa dados locais quando a pessoa escolhe uma conta de demonstração e a API não responde. Se não escolher essa opção, aparecem erros de conexão; erros de HTTP, como credenciais erradas, nunca são mostrados como sucesso.

---

## 5. Próximos Passos para o Front-end

* **Área de Comunidade:** Criar um fórum e um feed social para as pessoas compartilharem posts e conversarem.
* **Módulo de Mentoria:** Telas para conectar pessoas a mentoras voluntárias e marcar sessões.
* **Upload de Documentos:** Adicionar a opção de enviar currículo em PDF na tela de candidatura.
* **Notificações em Tempo Real:** Um aviso visual para novas mensagens e mudanças no status das candidaturas.

---

## 6. Boas Práticas de Manutenção

* Cada página diz qual é o seu controlador em `data-page`. Novos comportamentos devem ser adicionados ao controlador certo em `js/app.js`, para não ter código repetido.
* Continue usando a validação HTML nativa (`required`, `type`, `maxlength`, etc.). Só use `novalidate` se a validação já estiver feita e funcionando no JavaScript.
* Separe os erros de conexão de rede das respostas de erro da API: o modo local só deve mostrar falha se a API não estiver funcionando, sem esconder erros do servidor.
* Os dados de demonstração guardados no navegador são só para um usuário e não devem ser usados como se fosse uma conta real ou para produção. Sair da conta desativa o modo de demonstração.
* Guarde o CSS que é usado em vários lugares em `css/style.css`. Use classes que podem ser reutilizadas em vez de estilos diretos no HTML para novas interfaces e preste atenção nos tamanhos de tela pequeno, médio e grande.
* O front-end é feito em JavaScript, sem TypeScript, e não tem um sistema automático de testes próprio. Verifique as mudanças testando a sintaxe, no navegador e nos fluxos de formulário/API.