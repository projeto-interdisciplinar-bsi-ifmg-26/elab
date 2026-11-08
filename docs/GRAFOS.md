# Teoria dos Grafos no ELAB

Este documento descreve a parte de Teoria dos Grafos do ELAB: o problema, a modelagem, os algoritmos, a implementação, um experimento e as limitações. As citações seguem o formato (Autor, ano) e as referências completas estão na seção 10. Tudo o que se afirma sobre o código descreve o que os arquivos de `backend/src/graph/` fazem de fato.

## 1. Introdução e problema

O ELAB é uma rede que conecta colaboradoras (mulheres em tecnologia) a empresas que publicam vagas. O projeto nasceu no curso de Sistemas de Informação do IFMG (campus Sabará), e a empresa fictícia dos dados de demonstração se chama "Tech Sabará". O trabalho de grafos responde a duas perguntas da plataforma:

1. **Compatibilidade:** quanto o perfil de uma candidata combina com uma vaga? A vaga lista habilidades exigidas (cada uma com importância de 1 a 5 e a marca de obrigatória), área, nível, modalidade e faixa salarial.
2. **Alocação:** dadas várias candidatas e várias vagas, quem deve ficar com qual vaga para que o resultado total seja o melhor possível, com cada candidata em no máximo uma vaga e cada vaga com no máximo uma candidata?

**Por que grafos.** Comparar habilidades pelo nome falha em casos óbvios: quem sabe TypeScript recebe nota zero numa vaga que pede JavaScript, embora as duas sejam muito próximas. Nos dados de demonstração, 57,1% dos pares candidata-vaga não têm nenhuma habilidade em comum (seção 7), e a comparação por nome daria zero para todos eles. Um grafo de habilidades permite medir proximidade, e não só igualdade.

> **Em palavras simples:** imagine um mapa em que cada habilidade é uma cidade e cada relação entre duas habilidades é uma estrada. Estradas fortes (JavaScript e TypeScript) são curtas; estradas fracas são longas. Para saber se alguém "está perto" de uma exigência da vaga, procuramos o caminho mais curto entre o que ela já sabe e o que a vaga pede.

**Escopo.** O trabalho integra algoritmos clássicos (Dijkstra, ancestral comum em árvore e método húngaro) num problema de recomendação; não propõe algoritmo novo. Os dados são **simulados** (seção 6) e os pesos do modelo são escolhas de projeto, sem calibração (seção 8). O contexto de Sabará aparece na motivação; o problema não depende de geografia, e não se modelou distância entre cidades.

## 2. Trabalho relacionado

### 2.1 Grafos em redes sociais e recomendação

Granovetter (1973) propôs a análise de redes sociais como ferramenta para ligar relações entre indivíduos a fenômenos de grande escala, e distinguiu laços fortes de laços fracos. No ELAB a escala de pesos de 0,3 a 0,9 também expressa intensidade de relação, mas entre habilidades, e não entre pessoas. Liben-Nowell e Kleinberg (2007) estudam a previsão de ligações em redes sociais medindo a proximidade entre dois nós apenas pela topologia do grafo; a similaridade entre habilidades do ELAB segue a mesma ideia, pois depende só da estrutura do grafo e dos pesos das arestas.

Em sistemas reais, Gupta et al. (2013) descrevem o serviço "Who To Follow" do Twitter, que recomenda a partir do grafo inteiro mantido na memória de um único servidor, estratégia análoga à do cache em memória do ELAB (seção 4.6), numa escala muito menor. Ying et al. (2018) combinam passeios aleatórios e convoluções em grafos para recomendar em escala de web (PinSage); ali a representação é aprendida dos dados, em contraste com os pesos definidos manualmente neste trabalho.

### 2.2 Similaridade em hierarquias e ancestral comum

Rada et al. (1989) medem a similaridade conceitual entre dois conceitos de uma rede semântica hierárquica pela distância entre eles na hierarquia; essa é a noção usada na árvore de áreas (seção 4.2). O decaimento `0,7^distância`, que converte distância em afinidade, é uma escolha do grupo e não vem desse trabalho. Há medidas alternativas, baseadas no conteúdo de informação do ancestral comum (Resnik, 1995) ou em sua profundidade (Wu e Palmer, 1994). Para achar o ancestral comum mais próximo existem algoritmos que respondem em tempo constante depois de um pré-processamento (Harel e Tarjan, 1984; Bender e Farach-Colton, 2000); com 33 áreas e altura 2, uma subida simples pela árvore basta.

### 2.3 Caminhos mínimos e atribuição

Dijkstra (1959) resolve caminhos mínimos com custos não negativos. O desempenho depende da fila de prioridade: com heap de Fibonacci chega-se a O(E + V log V) (Fredman e Tarjan, 1987), mas o ELAB usa um heap binário, mais simples e suficiente para o tamanho do grafo. O método húngaro (Kuhn, 1955; Munkres, 1957) resolve o problema de atribuição. Tomizawa (1971) e Edmonds e Karp (1972) tratam o transporte e o fluxo de custo mínimo com técnicas de caminhos mínimos; o resumo de Tomizawa informa um limite de n³ operações para a atribuição n por n.

### 2.4 Emparelhamento em mercados de trabalho

Gale e Shapley (1962) definem o emparelhamento estável, em que nenhum par prefere mutuamente ficar junto a manter o que recebeu. Roth (1984) estuda a evolução do mercado de médicos residentes como estudo de caso. O ELAB adota outro critério: maximiza a soma das notas (emparelhamento de peso máximo), porque a plataforma tem um score único e comum, sem listas de preferência dos dois lados. A consequência é que o resultado não garante estabilidade (seção 8).

### 2.5 Viés e transparência

Raghavan et al. (2019) analisam o que as empresas que vendem algoritmos de triagem de candidatos declaram sobre desenvolvimento, validação e mitigação de viés, e discutem as implicações técnicas e legais. Isso motiva as decisões da seção 9: explicar cada nota e não usá-la como filtro eliminatório.

## 3. Modelagem

O motor usa três estruturas.

| Estrutura | Vértices | Arestas | Tamanho nos dados |
|---|---|---|---|
| Grafo de habilidades | habilidades | relação entre duas habilidades, peso em (0, 1] | 142 vértices, 252 arestas |
| Árvore de áreas | áreas de atuação | ligação pai-filho | 33 vértices, altura 2 |
| Grafo bipartido de alocação | candidatas e vagas | nota de compatibilidade (0 a 100) | 100 candidatas x 40 vagas |

### 3.1 Grafo de habilidades

É um grafo não direcionado e ponderado, em que o peso de uma aresta é a similaridade entre as duas habilidades. Propriedades dos dados:

- 142 vértices e 252 arestas; grau médio de 3,5 (504/142) e densidade de 2,5% (252 de 10.011 pares possíveis). Maiores graus: python e sql (14), react (12), javascript e node (10).
- Cada par é gravado uma única vez na tabela `Habilidades_Relacionadas` (chave primária composta por `Habilidade_A` e `Habilidade_B`, peso `DECIMAL(3,2)`); a classe `Grafo` simetriza ao carregar. Não há par repetido em sentidos opostos nem laços.
- Os pesos assumem só sete valores:

| Peso | 0,3 | 0,4 | 0,5 | 0,6 | 0,7 | 0,8 | 0,9 |
|---|---|---|---|---|---|---|---|
| Arestas | 15 | 43 | 52 | 31 | 51 | 42 | 18 |

A média dos pesos é 0,60. A escala adotada no modelo é: 0,9 para habilidades quase intercambiáveis (javascript e typescript); 0,7 para o mesmo ecossistema (javascript com react e com node); 0,5 e 0,6 para alternativas da mesma categoria (javascript com vue, 0,6; com angular e svelte, 0,5); 0,3 e 0,4 para relações fracas.

**Origem dos pesos.** As relações e os pesos foram definidos a priori, por julgamento de plausibilidade, e estão no arquivo `habilidades_relacionadas.json`. Não foram estimados a partir de dados de uso (por exemplo, co-ocorrência de habilidades em currículos ou vagas) nem calibrados. É a premissa mais forte do modelo e é discutida na seção 8.

**Dois componentes conexos.** O grafo tem 131 vértices num componente e 11 em outro: scrum, product-management, gestao-de-projetos, lideranca, comunicacao, ingles, trabalho-em-equipe, resolucao-de-problemas, mentoria, jira e kanban. Não existe aresta entre os dois componentes, então a afinidade entre uma habilidade de gestão e uma habilidade técnica é sempre zero.

### 3.2 Árvore de áreas

A tabela `Areas_Atuacao` guarda a hierarquia com autorreferência (`Area_Pai_idArea`). São 33 áreas: uma raiz (`ti`, Tecnologia da Informação), 13 filhas (por exemplo backend, frontend e dados) e 19 netas (por exemplo backend-node e frontend-react), portanto altura 2.

### 3.3 Candidatas, vagas e requisitos

A vaga se liga às habilidades que exige pela tabela `Oportunidades_Habilidades`, com importância (1 a 5) e obrigatoriedade. A candidata tem habilidades (`Habilidades_Profissional`) e áreas de interesse com nível de interesse. O motor usa apenas a presença da habilidade; os anos de experiência registrados não entram no cálculo.

### 3.4 Grafo bipartido de alocação

De um lado ficam as candidatas, do outro as vagas, e cada aresta tem como peso a nota de compatibilidade (inteiro de 0 a 100). Um emparelhamento é um conjunto de arestas em que nenhum vértice aparece duas vezes.

## 4. Algoritmos

### 4.1 Similaridade entre habilidades: Dijkstra

> **Em palavras simples:** é o GPS do mapa de habilidades. Colocamos a candidata em todas as habilidades que ela já tem e "andamos" pelas estradas mais fortes primeiro. Quanto mais forte o caminho até a habilidade exigida, mais perto ela está.

**Do peso ao custo.** O algoritmo de Dijkstra (1959) soma custos e busca o menor total, mas o que queremos é o caminho de maior similaridade, que se obtém multiplicando os pesos. A ponte entre as duas coisas é o custo de aresta `-ln(peso)`:

- Seja um caminho com arestas de pesos w1, ..., wk, todos em (0, 1]. Sua similaridade é o produto w1 x ... x wk.
- Como o logaritmo é estritamente crescente, maximizar o produto equivale a maximizar a soma dos ln(wi), ou seja, a minimizar a soma dos -ln(wi).
- Como cada wi é no máximo 1, cada custo -ln(wi) é maior ou igual a zero, que é a condição exigida por Dijkstra. No código, `custoAresta = Math.max(0, -Math.log(peso))`.
- Portanto o caminho de menor custo é o de maior produto de pesos, e a similaridade entre duas habilidades é `exp(-distância)`.

**Exemplo.** Considere só as arestas typescript-javascript (0,9) e javascript-react (0,7). De typescript a react os custos são 0,105 + 0,357 = 0,462, e a similaridade é `exp(-0,462)` = 0,63, que é igual a 0,9 x 0,7.

**Multi-origem e poda.** Todas as habilidades que a candidata já tem entram como origens com distância 0; o resultado para cada habilidade exigida é a distância até a origem mais próxima. Assim, uma única execução por candidata serve para todas as vagas. Habilidade que a candidata já tem vale 1; habilidade fora do alcance vale 0. O corte `SIM_MINIMA = 0,25` equivale a `custoMax = -ln(0,25)`, cerca de 1,386, e vértices além dele são descartados (similaridade 0). Como o menor peso do grafo é 0,3, toda aresta direta passa no corte; um caminho de duas arestas só passa se o produto for pelo menos 0,25 (0,5 e 0,5 passa; 0,3 e 0,8 não).

**Complexidade.** O((V + E) log V) por execução, com o heap binário próprio (`MinHeap.js`, inserção e remoção em O(log n)). O Dijkstra implementado não tem operação de diminuir chave: insere entradas repetidas e descarta as obsoletas ao retirá-las. Neste grafo, V = 142 e E = 252.

**Consequência do modelo:** conta só a habilidade mais próxima; várias habilidades vizinhas não somam evidências.

### 4.2 Afinidade entre áreas: ancestral comum mais próximo

> **Em palavras simples:** é como um organograma. Para saber quão perto estão duas áreas, contamos quantos passos é preciso subir até um "chefe" comum e descer de novo. Quanto mais passos, menor a afinidade.

A classe `ArvoreAreas` monta, para cada área, a lista de ancestrais até a raiz. O primeiro ancestral da área A que também aparece na lista de B é o ancestral comum mais próximo (LCA), e a distância é a posição dele na lista de A somada à posição na lista de B. A afinidade é `0,7^distância`: 1 para a mesma área e 0 se não houver ancestral comum. É uma subida simples, de custo O(h) por consulta, onde h é a altura da árvore (aqui, 2). Não há corte de similaridade nesta etapa.

| Distância | 0 | 1 | 2 | 3 | 4 |
|---|---|---|---|---|---|
| Afinidade | 1,00 | 0,70 | 0,49 | 0,34 | 0,24 |

Exemplos: backend-node e backend têm distância 1; backend-node e backend-java, 2; backend-node e frontend-react, 4 (a maior distância possível nesta árvore).

### 4.3 Nota de compatibilidade

A nota combina quatro componentes, cada um entre 0 e 1:

`final = (0,55 x H + 0,20 x A + 0,15 x N + 0,10 x P) / soma dos pesos`

Se algum requisito obrigatório tiver similaridade menor que 0,5, a nota final é multiplicada por 0,7 (`PENALIDADE_OBRIGATORIA`). A nota exibida é `round(100 x final)`.

| Componente | Peso | Como é calculado |
|---|---|---|
| Habilidades (H) | 55% | Média das similaridades dos requisitos, ponderada pela importância (padrão 3). Vaga sem requisitos: 0,5. |
| Área (A) | 20% | Vaga sem área: 0,5. Candidata sem área: 0,4. Senão, o máximo, entre as áreas da candidata, de afinidade x (0,6 + 0,4 x interesse/5), com interesse padrão 3. |
| Nível (N) | 15% | Escala estagio, junior, pleno, senior, especialista. Igual: 1. Candidata acima da vaga: max(0,5; 1 - 0,15 x d). Abaixo: max(0; 1 - 0,4 x d). Vaga sem nível ou "qualquer": 1. Candidata sem nível: 0,6. |
| Preferências (P) | 10% | Média entre modalidade (incompatível vale 0, ou 0,5 se um dos lados é híbrido; "indiferente" não penaliza) e salário (min(1, salário máximo da vaga / pretensão mínima)). Sem preferências: 1. |

Aqui `d` é a diferença de níveis entre candidata e vaga. Os pesos 55/20/15/10, o fator 0,7, o corte 0,25 e as fórmulas de nível e preferências são escolhas de projeto, sem calibração. O requisito chamado "eliminatório" no código só aciona a penalidade de 0,7; não exclui ninguém.

### 4.4 Trilha de aprendizado

> **Em palavras simples:** é um GPS de estudo. Para cada habilidade que a vaga pede e a candidata ainda não domina, mostra o caminho a partir de uma habilidade que ela já tem, passando por habilidades intermediárias.

A trilha reaproveita o resultado do Dijkstra: para cada requisito com similaridade menor que 1, reconstrói o caminho pelos predecessores, da habilidade mais próxima que a candidata tem até o alvo. Os itens são ordenados por importância e, em empate, por similaridade, e a lista devolve no máximo 5 (`GET /match/trilha/:vagaId`). Atenção: "alcançável" significa dentro do corte de 0,25; um alvo fora do corte aparece como não alcançável, com o próprio alvo como único passo.

### 4.5 Alocação ótima: método húngaro

> **Em palavras simples:** é distribuir tarefas. Escolher sempre a melhor nota disponível pode estragar o conjunto. Com as notas [[90, 80], [85, 20]], pegar primeiro o 90 obriga a segunda candidata a ficar com o 20, total 110; já trocar as duas (80 + 85) dá 165. O método húngaro encontra o melhor total.

O problema é um emparelhamento de peso máximo no grafo bipartido de candidatas e vagas. O método húngaro (Kuhn, 1955; Munkres, 1957) resolve a atribuição minimizando custos; o ELAB maximiza as notas passando seus negativos. A versão de `hungaro.js` usa potenciais (variáveis duais) e caminhos aumentantes de custo mínimo, da família de técnicas de Tomizawa (1971) e Edmonds e Karp (1972), com custo O(n² m) para n linhas e m colunas, n menor ou igual a m. Para matriz retangular, transpõe quando há mais linhas que colunas, e o custo passa a ser O(min² x max); com 100 candidatas e 40 vagas são cerca de 160 mil operações elementares. O parâmetro `minimo` (padrão 40 na alocação) descarta, **depois** de otimizar, os pares com nota abaixo dele. É usado em `POST /match/alocacao`.

### 4.6 Cache do grafo

O serviço `grafo.service.js` carrega do banco as habilidades, as arestas e as áreas, monta o grafo e o motor, e guarda a Promise em memória, de modo que requisições simultâneas não carregam o grafo duas vezes; se a carga falhar, o cache é limpo. `invalidarCache()` força a recarga depois de alterar habilidades, arestas ou áreas. O cache é por processo, e uma habilidade ou aresta nova entra no cálculo sem mudar código.

## 5. Implementação e testes

### 5.1 Mapa entre conceito e código

| Conceito | Onde |
|---|---|
| Grafo não direcionado e ponderado (lista de adjacência) | `backend/src/graph/Grafo.js`; arestas em `Habilidades_Relacionadas` |
| Fila de prioridade (heap binário) | `backend/src/graph/MinHeap.js` |
| Caminho mínimo (Dijkstra multi-origem, com poda) | `backend/src/graph/dijkstra.js` |
| Árvore e ancestral comum | `backend/src/graph/arvoreAreas.js` |
| Emparelhamento de peso máximo (método húngaro) | `backend/src/graph/hungaro.js` |
| Nota, trilha, ranking e alocação | `backend/src/graph/motorMatch.js` |
| Cache do grafo | `backend/src/services/grafo.service.js` |
| Rotas | `GET /match/vagas`, `GET /match/trilha/:vagaId`, `POST /match/alocacao` |
| Experimento | `backend/scripts/experimento-baseline.js` e `backend/scripts/experimento-sensibilidade.js` |

### 5.2 Testes

O arquivo `backend/scripts/teste-grafo.js` faz 13 verificações em grafos pequenos de resposta conhecida e roda dentro do `npm test`: heap, simetria do grafo, Dijkstra (maior produto de pesos, multi-origem e poda), ancestral comum e afinidade, método húngaro (igual à força bruta em 200 matrizes aleatórias retangulares) e o motor de nota. Esses testes mostram que as implementações acertam nesses casos; não provam a utilidade das notas.

### 5.3 Como reproduzir

```bash
cd backend
npm install
cp .env.example .env      # ajuste as credenciais do MySQL e o segredo do JWT
npm run migrate           # cria as tabelas
npm run seed              # catálogo: áreas, habilidades e relações
npm run seed:demo         # dados simulados (apaga usuários, exceto admin@elab.com)
node scripts/experimento-baseline.js   # só leitura; precisa do MySQL, não do servidor
node scripts/experimento-sensibilidade.js   # idem
npm run dev               # em outro terminal, para rodar os testes de API
npm test
```

## 6. Dados

**Catálogo.** Três arquivos em `backend/db/seeds/data/`: `areas.json` (33 áreas), `habilidades.json` (142 habilidades, com `nome_habilidade` e `categoria`) e `habilidades_relacionadas.json` (252 relações com peso). São carregados por `npm run seed`, que é idempotente. O catálogo foi elaborado para o projeto e não foi calibrado com dados externos.

**Demonstração.** `npm run seed:demo`, com semente fixa, gera 8 empresas, 40 vagas, 100 colaboradoras e 429 candidaturas. Todos os dados são **simulados**: não há pessoas reais, e a mesma semente produz sempre o mesmo resultado.

| Instância | Tamanho |
|---|---|
| Habilidades (vértices) | 142 |
| Relações entre habilidades (arestas) | 252 |
| Áreas | 33 |
| Candidatas com habilidades | 100 |
| Vagas ativas com requisitos | 40 |
| Pares candidata-vaga | 4.000 |

## 7. Experimento

**Pergunta.** O grafo traz algo que a comparação por nome não traz? O experimento não tem gabarito de relevância (não há registro de quem "deveria" ficar com cada vaga), então mede dois efeitos observáveis: a cobertura (quanta afinidade o grafo enxerga onde a comparação por nome vê zero) e a robustez (como a nota reage quando uma habilidade some do perfil).

**Métodos comparados**, apenas no componente de habilidades, que é onde o grafo atua:

- **Grafo:** o componente de habilidades do motor, arredondado para duas casas decimais.
- **Cobertura ponderada:** o mesmo cálculo sem grafo; soma das importâncias dos requisitos que a candidata tem, dividida pela soma total.
- **Jaccard** (1901): tamanho da interseção dividido pelo tamanho da união entre o conjunto de habilidades da candidata e o de requisitos da vaga; ignora as importâncias.

Empates de posição são resolvidos pela média das posições empatadas. A saída completa está em `docs/experimento-baseline-saida.txt`.

### 7.1 Resgate: pares sem habilidade em comum

Dos 4.000 pares, 2.286 (57,1%) não têm nenhuma habilidade em comum, e nesses a cobertura e o Jaccard dão zero. Nesses mesmos pares, o grafo reconhece alguma afinidade em 1.566 (68,5%), com nota média de habilidades de 19,7 em 100. Exemplos de afinidades que os métodos sem grafo não enxergam: typescript e javascript, mysql e sql, sql e postgresql (todas com afinidade 0,90).

### 7.2 Divergência de ranking

A sobreposição média do top-5 de vagas por candidata é de 76,6% entre grafo e cobertura e de 71,0% entre grafo e Jaccard. Ou seja, o grafo muda entre 23% e 29% das cinco primeiras vagas.

### 7.3 Habilidade oculta

Para cada par em que a candidata tem ao menos um requisito da vaga, esconde-se do perfil a habilidade de maior importância que ela tem e a vaga pede, e mede-se o que acontece com aquela vaga no ranking das 40 vagas. São 1.714 casos.

| Método | Piora média no ranking | Nota retida | Continua no top-10 |
|---|---|---|---|
| Grafo | 4,29 | 66,6% | 67,5% |
| Cobertura | 8,81 | 25,8% | 49,8% |
| Jaccard | 8,43 | 28,8% | 55,8% |

### 7.4 O que o experimento mostra e o que não mostra

Mostra que o grafo enxerga afinidades que a comparação por nome ignora e que sua nota é mais estável quando uma habilidade falta. **Não mostra** que o grafo "acerta mais", por três motivos: não há gabarito de relevância; o teste de habilidade oculta favorece o grafo por construção (ao esconder uma habilidade, as vizinhas continuam valendo, então a nota cair menos prova robustez, e não acerto); e os dados são sintéticos.

### 7.5 Sensibilidade aos pesos

> **Em palavras simples:** se mexermos um pouco nos números do modelo, o ranking de vagas de cada candidata muda muito ou pouco? Se mudar pouco, as conclusões não dependem do valor exato de cada peso.

O script `backend/scripts/experimento-sensibilidade.js` (saída em `docs/experimento-sensibilidade-saida.txt`) perturba o modelo e compara o ranking resultante com o original, para as 100 candidatas e as 40 vagas. Cada configuração faz 30 tentativas com sementes fixas. Há dois tipos de perturbação:

- **Pesos das arestas:** cada aresta do grafo de habilidades ganha ou perde um valor fixo, sorteado aresta a aresta, com o peso limitado ao intervalo de 0,1 a 1. Como os pesos originais variam em passos de 0,1, a perturbação de 0,10 equivale a deslocar cada relação para um nível vizinho da escala, e a de 0,20, a dois níveis.
- **Pesos do score (55/20/15/10):** cada peso é multiplicado por um fator sorteado entre 0,8 e 1,2; o motor normaliza pela soma.

A métrica é a sobreposição do top-5 de vagas de cada candidata com o top-5 original (100% significa ranking igual) e a fração de candidatas cuja vaga em primeiro lugar não muda. Ao acaso, a sobreposição esperada do top-5 entre 40 vagas é de 12,5%.

| Perturbação | Top-5 médio (desvio padrão) | Pior tentativa | Mesma vaga em 1º lugar (média) |
|---|---|---|---|
| Arestas ±0,05 | 94,8% (1,1) | 92,6% | 96,9% |
| Arestas ±0,10 | 90,5% (1,4) | 88,0% | 94,5% |
| Arestas ±0,20 | 84,9% (1,8) | 80,2% | 92,4% |
| Pesos do score ±20% | 97,9% (0,7) | 96,4% | 96,5% |

Mesmo deslocando todas as arestas em até dois níveis da escala, o top-5 médio mantém 84,9% de sobreposição e a pior das 30 tentativas fica em 80,2%, muito acima do acaso (12,5%). Variar os pesos do score em 20% muda ainda menos o ranking. Dentro dessas faixas, o ranking não depende do valor exato de cada peso.

**Limites.** O teste mede a estabilidade do ranking em relação ao próprio ranking original, e não a correção das relações: um modelo pode ser estável e estar errado. As perturbações são aleatórias e simétricas, então não cobrem erro sistemático (por exemplo, todos os pesos de uma categoria altos demais) nem mudança de estrutura (adicionar ou remover relações). O corte de 0,25, o fator 0,7 e o decaimento de 0,7^distância não foram variados. Só o ranking da nota final foi reavaliado; as medidas das seções 7.1 a 7.3 não foram refeitas sob perturbação. São 30 tentativas por configuração, sobre dados simulados, e os empates da nota inteira são desempatados pelo índice da vaga.

## 8. Ameaças à validade e limitações

### 8.1 Ameaças à validade

- **Construto:** a nota de compatibilidade não foi validada contra nenhum resultado real (contratação, desempenho, satisfação).
- **Interna:** as arestas e os pesos foram definidos a priori; mudar a escala pode mudar rankings. A sensibilidade a perturbações aleatórias dos pesos foi testada (seção 7.5), mas só mede a estabilidade do ranking, e não a correção das relações.
- **Externa:** os dados são simulados por uma semente fixa, com 100 candidatas e 40 vagas; a distribuição de habilidades não reflete o mercado real, e os percentuais da seção 7 dependem dela.
- **Conclusão:** a execução é determinística e não há repetição com intervalos de confiança nem testes estatísticos. Só o componente de habilidades foi compar도; área, nível e preferências não entram no experimento.

### 8.2 Limitações do modelo

- Os pesos 55/20/15/10, o fator 0,7, o corte 0,25 e o decaimento `0,7^distância` são escolhas de projeto, sem calibração.
- O grafo de habilidades tem dois componentes sem ligação: as 11 habilidades de gestão e comunicação nunca têm afinidade com as técnicas.
- Só a habilidade mais próxima conta; várias habilidades vizinhas não acumulam evidência.
- Os anos de experiência não entram no cálculo.
- O corte `minimo` da alocação é aplicado depois da otimização, então o resultado não é o melhor possível sujeito ao mínimo. Exemplo: com a matriz [[70, 60], [45, 39]] e mínimo 40, o método húngaro escolhe 70 + 39 = 109, e o par de 39 é descartado, sobrando 70; a alternativa 60 + 45 = 105 teria os dois pares válidos.
- As notas são arredondadas para inteiros antes da alocação, o que cria empates.
- O emparelhamento de peso máximo não garante estabilidade: pode haver uma candidata e uma vaga que prefeririam ficar juntas (seção 2.4).
- O cache é por processo e a invalidação é manual.
- Na trilha, "alcançável" significa dentro do corte de 0,25.

### 8.3 Trabalhos futuros

- Ampliar a análise de sensibilidade: variar também o corte 0,25, o fator 0,7 e o decaimento 0,7^distância, e alterar a estrutura do grafo (adicionar e remover relações), e não só os pesos.
- Estimar pesos a partir de dados reais (co-ocorrência de habilidades em currículos e vagas) e validar contra um gabarito.
- Ligar os dois componentes do grafo de habilidades.
- Corrigir o filtro `minimo`, zerando as notas abaixo do mínimo antes de otimizar.
- Comparar a alocação de peso máximo com o emparelhamento estável (Gale e Shapley, 1962).
- Avaliar medidas de similaridade alternativas para a árvore de áreas (Resnik, 1995; Wu e Palmer, 1994).

## 9. Ética e transparência

- **A nota é apoio, não filtro.** A plataforma mostra, para cada vaga, de onde vem a nota (habilidades, área, nível e preferências) e a situação de cada requisito; o fator 0,7 do requisito obrigatório reduz a nota, mas não elimina a candidata. A recomendação de uso é não decidir por corte automático de nota.
- **Explicabilidade.** Cada componente da nota e o caminho no grafo que justifica uma afinidade (`via`) são devolvidos pela API, o que permite conferir o cálculo. A literatura sobre triagem algorítmica aponta a falta de transparência e de validação como problemas centrais (Raghavan et al., 2019).
- **Dimensões sensíveis.** O componente de preferências compara a pretensão salarial com o salário máximo da vaga. Pretensões salariais podem refletir desigualdades históricas de remuneração, algo especialmente relevante numa plataforma voltada a mulheres; por isso o peso desse componente é pequeno (10%) e deve ser revisto antes de uso real. O modelo não usa gênero nem outros atributos protegidos no cálculo da nota.
- **Dados.** Todos os dados do experimento são simulados; nenhuma pessoa real foi usada.

## 10. Referências

Bender, M. A.; Farach-Colton, M. (2000). The LCA problem revisited. In *LATIN 2000*, LNCS 1776, pp. 88-94. DOI: 10.1007/10719839_9.

Dijkstra, E. W. (1959). A note on two problems in connexion with graphs. *Numerische Mathematik*, 1(1):269-271. DOI: 10.1007/BF01386390.

Edmonds, J.; Karp, R. M. (1972). Theoretical improvements in algorithmic efficiency for network flow problems. *Journal of the ACM*, 19(2):248-264. DOI: 10.1145/321694.321699.

Fredman, M. L.; Tarjan, R. E. (1987). Fibonacci heaps and their uses in improved network optimization algorithms. *Journal of the ACM*, 34(3):596-615. DOI: 10.1145/28869.28874.

Gale, D.; Shapley, L. S. (1962). College admissions and the stability of marriage. *American Mathematical Monthly*, 69(1):9-15.

Granovetter, M. S. (1973). The strength of weak ties. *American Journal of Sociology*, 78(6):1360-1380. DOI: 10.1086/225469.

Gupta, P.; Goel, A.; Lin, J.; Sharma, A.; Wang, D.; Zadeh, R. (2013). WTF: the Who to Follow service at Twitter. In *WWW '13*, pp. 505-514. DOI: 10.1145/2488388.2488433.

Harel, D.; Tarjan, R. E. (1984). Fast algorithms for finding nearest common ancestors. *SIAM Journal on Computing*, 13(2):338-355. DOI: 10.1137/0213024.

Jaccard, P. (1901). Étude comparative de la distribution florale dans une portion des Alpes et des Jura. *Bulletin de la Société Vaudoise des Sciences Naturelles*, 37:547-579.

Kuhn, H. W. (1955). The Hungarian method for the assignment problem. *Naval Research Logistics Quarterly*, 2(1-2):83-97. DOI: 10.1002/nav.3800020109.

Liben-Nowell, D.; Kleinberg, J. (2007). The link-prediction problem for social networks. *Journal of the American Society for Information Science and Technology*, 58(7):1019-1031. DOI: 10.1002/asi.20591.

Munkres, J. (1957). Algorithms for the assignment and transportation problems. *Journal of the Society for Industrial and Applied Mathematics*, 5(1):32-38.

Rada, R.; Mili, H.; Bicknell, E.; Blettner, M. (1989). Development and application of a metric on semantic nets. *IEEE Transactions on Systems, Man, and Cybernetics*, 19(1):17-30. DOI: 10.1109/21.24528.

Raghavan, M.; Barocas, S.; Kleinberg, J.; Levy, K. (2019). Mitigating bias in algorithmic hiring: evaluating claims and practices. arXiv:1906.09208.

Resnik, P. (1995). Using information content to evaluate semantic similarity in a taxonomy. In *IJCAI-95*, pp. 448-453.

Roth, A. E. (1984). The evolution of the labor market for medical interns and residents: a case study in game theory. *Journal of Political Economy*, 92(6):991-1016.

Tomizawa, N. (1971). On some techniques useful for solution of transportation network problems. *Networks*, 1(2):173-194. DOI: 10.1002/net.3230010206.

Wu, Z.; Palmer, M. (1994). Verb semantics and lexical selection. In *ACL 1994*, pp. 133-138.

Ying, R.; He, R.; Chen, K.; Eksombatchai, P.; Hamilton, W. L.; Leskovec, J. (2018). Graph convolutional neural networks for web-scale recommender systems. In *KDD '18*, pp. 974-983. DOI: 10.1145/3219819.3219890.
