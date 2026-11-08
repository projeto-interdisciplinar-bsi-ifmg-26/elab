# Histórias de usuário do ELAB

Formato: **Como** (papel), **quero** (ação), **para** (benefício). Cada história tem critérios de aceite verificáveis e aponta para os requisitos de [requisitos.md](requisitos.md).

## Visitante

### HU01. Criar conta
**Como** visitante, **quero** me cadastrar como colaboradora ou empresa, **para** acessar a plataforma.
- Aceite: o cadastro exige e-mail válido e senha com no mínimo 8 caracteres.
- Aceite: empresa precisa informar um CNPJ válido.
- Aceite: e-mail ou CNPJ já cadastrado resulta em erro 409, sem criar conta duplicada.
- Requisitos: RF01, RF02.

### HU02. Entrar
**Como** visitante, **quero** entrar com e-mail e senha, **para** usar as áreas restritas.
- Aceite: credenciais corretas levam ao feed; incorretas mostram mensagem de erro sem revelar qual campo falhou.
- Aceite: após 20 tentativas em 15 minutos pelo mesmo IP, o sistema responde 429.
- Requisitos: RF03, RF04, RNF03.

## Colaboradora

### HU03. Montar meu perfil
**Como** colaboradora, **quero** cadastrar dados pessoais, experiências, formações, áreas, habilidades e preferências, **para** que o sistema me conheça e calcule a compatibilidade.
- Aceite: posso criar, editar e apagar experiências e formações.
- Aceite: data de fim anterior à de início é rejeitada.
- Aceite: a barra de completude sobe conforme o perfil é preenchido.
- Requisitos: RF05 a RF09, RF11.

### HU04. Enviar meu currículo
**Como** colaboradora, **quero** anexar meu currículo em PDF ou DOCX, **para** que ele fique no meu perfil.
- Aceite: arquivo de até 5 MB é aceito; arquivo falso ou de extensão não permitida é rejeitado.
- Aceite: posso baixar e remover o currículo; sem currículo, o download responde 404.
- Requisitos: RF10, RNF07.

### HU05. Ver vagas que combinam comigo
**Como** colaboradora, **quero** ver as vagas ordenadas por compatibilidade, **para** priorizar onde me candidatar.
- Aceite: cada vaga do feed mostra a porcentagem de compatibilidade.
- Aceite: a lista pode ser buscada e filtrada, com paginação.
- Requisitos: RF12, RF13, RF22.

### HU06. Entender a nota
**Como** colaboradora, **quero** saber por que uma vaga deu determinada porcentagem, **para** confiar no cálculo e saber o que melhorar.
- Aceite: o detalhe mostra a nota por componente (habilidades, área, nível, preferências) e a situação de cada requisito.
- Aceite: requisito obrigatório ausente é sinalizado.
- Requisitos: RF23, RNF12.

### HU07. Saber o que aprender
**Como** colaboradora, **quero** ver uma trilha até as habilidades que me faltam, **para** planejar meu estudo.
- Aceite: a trilha mostra o caminho de habilidades até cada requisito faltante, ordenado por importância.
- Aceite: habilidade sem caminho no grafo é marcada como não alcançável.
- Requisitos: RF24.

### HU08. Candidatar-me
**Como** colaboradora, **quero** me candidatar a uma vaga ou me inscrever em um evento, palestra ou bolsa, **para** participar.
- Aceite: posso incluir uma mensagem de até 500 caracteres.
- Aceite: recebo um protocolo na tela de confirmação.
- Aceite: segunda inscrição na mesma oportunidade resulta em erro 409.
- Requisitos: RF17, RF18.

### HU09. Acompanhar minhas candidaturas
**Como** colaboradora, **quero** ver o histórico das minhas candidaturas e inscrições, **para** lembrar onde participei.
- Aceite: o perfil lista cada registro com título, tipo, empresa, data e protocolo.
- Aceite: vagas mostram a nota de compatibilidade; os demais tipos mostram "Confirmada".
- Aceite: posso buscar e filtrar por tipo, com 5 itens por página.
- Requisitos: RF19.

## Empresa

### HU10. Publicar oportunidades
**Como** empresa, **quero** publicar vagas, eventos, palestras e bolsas, **para** divulgá-los às colaboradoras.
- Aceite: título e tipo são obrigatórios.
- Aceite: numa vaga posso definir área, nível, modalidade, faixa salarial e requisitos com importância de 1 a 5 e obrigatoriedade.
- Aceite: salário máximo menor que o mínimo é rejeitado.
- Requisitos: RF14, RF15.

### HU11. Gerenciar minhas publicações
**Como** empresa, **quero** ver e buscar minhas publicações, **para** acompanhar o que divulguei.
- Aceite: o painel lista só as publicações da minha empresa, com busca, filtro por tipo e 6 itens por página.
- Requisitos: RF13, RF16.

### HU12. Ver quem se candidatou
**Como** empresa, **quero** ver as candidatas de uma vaga ordenadas por compatibilidade, **para** priorizar a análise.
- Aceite: a lista mostra a nota, as habilidades que faltam e o aviso de requisito obrigatório ausente.
- Aceite: posso filtrar por faixa de compatibilidade e por requisito obrigatório, com 5 itens por página.
- Aceite: ao abrir uma vaga de outra empresa, recebo erro 403.
- Requisitos: RF20, RF21.

### HU13. Distribuir candidatas entre vagas
**Como** empresa, **quero** uma distribuição das candidatas entre minhas vagas que maximize o total, **para** não disputar a mesma pessoa em duas vagas.
- Aceite: cada candidata fica em no máximo uma vaga e cada vaga recebe no máximo uma candidata.
- Aceite: pares com score abaixo de 40 são descartados.
- Aceite: o total supera o da escolha gulosa em cenários de disputa.
- Requisitos: RF25.

## Histórias fora do escopo atual

Registradas para o backlog, ainda não implementadas:

| Papel | História |
|---|---|
| Visitante | Recuperar minha senha. |
| Colaboradora | Cancelar uma candidatura. |
| Colaboradora | Excluir minha conta. |
| Empresa | Aprovar ou recusar uma candidata e acompanhar o status. |
| Empresa | Editar ou encerrar uma publicação. |
| Administradora | Moderar o cadastro de empresas. |
