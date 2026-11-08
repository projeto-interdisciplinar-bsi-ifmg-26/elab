# Engenharia de Software: documentação do ELAB

Documentação de engenharia de software do projeto interdisciplinar (Programação Web II, Banco de Dados e Engenharia de Software), IFMG Campus Sabará.

## Índice

| Documento | Conteúdo |
|---|---|
| [requisitos.md](requisitos.md) | Requisitos funcionais e não funcionais, ligados à rota ou tela que os implementa |
| [historias-de-usuario.md](historias-de-usuario.md) | Histórias por papel, com critérios de aceite |
| [casos-de-uso.md](casos-de-uso.md) | Casos de uso em texto e diagrama |
| [arquitetura.md](arquitetura.md) | Camadas, componentes e decisões de projeto |
| [testes.md](testes.md) | Estratégia de testes e o que ficou sem cobertura |
| [../../backend/db/README.md](../../backend/db/README.md) | Banco de dados: migrations e segurança |
| [../GRAFOS.md](../GRAFOS.md) | Motor de grafos e experimento |

## Escopo

O ELAB é uma rede profissional que conecta mulheres em tecnologia (colaboradoras) a empresas, com vagas, eventos, palestras e bolsas. A colaboradora monta um perfil estilo currículo e vê o quanto cada vaga combina com ela; a empresa publica vagas com requisitos e vê as candidatas ordenadas por compatibilidade.

### Dentro do escopo

- Cadastro e login de colaboradoras e empresas.
- Perfil completo da colaboradora (dados, experiências, formações, áreas, habilidades, preferências, currículo).
- Publicação de vagas, eventos, palestras e bolsas pela empresa.
- Candidatura e inscrição, com protocolo e histórico.
- Compatibilidade entre candidata e vaga, trilha de aprendizado e alocação ótima.

### Fora do escopo (não implementado)

- Comunidade e mentoria, previstas nas propostas iniciais do projeto.
- Recuperação de senha e exclusão de conta.
- Mudança de status de candidatura (em análise, aprovada, recusada) e cancelamento.
- Edição e encerramento de publicações.
- Moderação de cadastro de empresas.

## Equipe

Caio Vitor, David Rodrigues, Jonathan Alexandre, Igor Barbosa, Isabelle Pascini e Mateus Batista.

### Papéis e divisão de tarefas

> Preencher pelo grupo. Não foi inferido do repositório para não registrar algo que não aconteceu.

| Integrante | Papel | Principais entregas |
|---|---|---|
| Caio Vitor | | |
| David Rodrigues | | |
| Jonathan Alexandre | | |
| Igor Barbosa | | |
| Isabelle Pascini | | |
| Mateus Batista | | |

### Contribuições registradas no Git

Contagem de commits por autor (`git shortlog -sn --all`), para referência. Contribuições que não passam pelo Git (pesquisa, design, documentação, testes manuais) não aparecem aqui.

> Colar a saída do comando e ajustar nomes duplicados (o mesmo integrante pode ter commitado com mais de um nome).

## Processo de desenvolvimento

> Preencher pelo grupo: metodologia adotada (Scrum, Kanban ou outra), duração e quantidade de iterações, cerimônias realizadas, ferramenta de backlog e como as tarefas foram divididas.

Práticas que o repositório evidencia:

- Commits semânticos (`feat`, `fix`, `docs`, `chore`) e histórico linear na branch `main`.
- Mudanças de banco sempre por migration nova, nunca editando migration aplicada.
- Suítes de teste ponta a ponta executadas antes de cada etapa fechada.
