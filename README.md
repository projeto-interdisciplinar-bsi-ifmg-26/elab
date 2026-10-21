# ELAB 🚀
Rede profissional que conecta colaboradoras (mulheres em tech) a empresas — vagas, eventos e projetos freelance.

## 🌟 Visão Geral
O ELAB é uma plataforma desenvolvida para fomentar a inclusão de mulheres na área de tecnologia, facilitando a conexão entre profissionais e oportunidades de carreira, eventos de networking e bolsas de estudo.

### 🛠️ Tecnologias Utilizadas
- **Frontend:** HTML5, CSS3, JavaScript ES6+ (Vanilla JS)
- **Backend:** Node.js, Express
- **Banco de Dados:** MySQL
- **Autenticação:** JWT (JSON Web Tokens) & bcrypt

---

## ✨ Funcionalidades

### 👩‍💻 Para Profissionais
- **Feed de Oportunidades:** Exploração de vagas, eventos, palestras e bolsas com filtros por categoria.
- **Inscrições Simplificadas:** Fluxo de candidatura com envio de portfólio/GitHub e geração de protocolo de confirmação.
- **Gestão de Perfil:** Visualização e edição de dados pessoais e área de atuação.
- **Histórico:** Acompanhamento de candidaturas e inscrições realizadas.

### 🏢 Para Empresas
- **Painel Administrativo:** Publicação de novas oportunidades (vagas, eventos, etc.).
- **Gestão de Vagas:** Listagem e controle das postagens realizadas pela empresa.

---

## 🚀 Como Executar o Projeto

### 📋 Pré-requisitos
- [Node.js](https://nodejs.org/) instalado.
- [MySQL](https://dev.mysql.com/downloads/) instalado e rodando.
- Um banco de dados criado com o nome `elab`.

### ⚙️ Configuração do Backend
1. Acesse a pasta do backend:
   ```bash
   cd backend
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Configure as variáveis de ambiente:
   ```bash
   cp .env.example .env
   # Edite o arquivo .env com suas credenciais do MySQL
   ```

### 🗄️ Banco de Dados (Migrations & Seed)
O projeto possui scripts automatizados para configurar o banco de dados via npm:

1. **Executar Migrations** (Criação das tabelas):
   ```bash
   npm run migrate
   ```
2. **Executar Seed** (Popular com dados de teste):
   ```bash
   npm run seed
   ```

### 🏃 Executando a Aplicação
1. **Iniciar o Servidor:**
   ```bash
   npm run dev
   ```
   O servidor estará disponível em `http://localhost:3000`.

2. **Frontend:**
   Os arquivos do frontend estão na pasta `/frontend`. Você pode:
   - Abrir os arquivos `.html` diretamente no navegador.
   - Utilizar a extensão **Live Server** do VS Code para um desenvolvimento mais fluido.

---

## 📂 Estrutura do Projeto

```
.
├── frontend/           # Interface do usuário (HTML, CSS, JS)
└── backend/            # API Node.js
    ├── src/
    │   ├── config/       # Configurações e variáveis de ambiente
    │   ├── controllers/  # Lógica de controle das requisições
    │   ├── middlewares/  # Auth, Validação, Rate Limit e Erros
    │   ├── repositories/ # Camada de persistência (MySQL)
    │   ├── services/    # Regras de negócio
    │   └── routes/       # Definição dos endpoints da API
    └── db/
        ├── pool.js       # Singleton de conexão com banco
        ├── migrate.js    # Script de migração de esquema
        └── seed.js       # Script de população de dados
```

## 🎨 Identidade Visual
A interface foi projetada com foco em acessibilidade e modernidade, utilizando uma paleta de cores baseada em tons de roxo, rosa e lilás, proporcionando um ambiente acolhedor e profissional.

---

**Desenvolvido por:** Caio Vitor, David Rodrigues, Jonathan Alexandre, Igor Barbosa, Isabelle Pascini e Mateus Batista.
