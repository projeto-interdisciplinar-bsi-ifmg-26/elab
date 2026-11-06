# Teoria de grafos no ELAB

Este documento descreve **como** a teoria de grafos é usada no projeto, **por que** cada estrutura foi escolhida e **o que o experimento mostra e não mostra**. O código está em `backend/src/graph/`.

## 1. Problema e modelagem

O ELAB precisa responder três perguntas, e cada uma virou um problema clássico de grafos:

| Pergunta | Modelagem | Algoritmo |
|---|---|---|
| Quão próxima uma habilidade da candidata está de uma habilidade que a vaga pede? | Grafo não direcionado e ponderado de habilidades | Dijkstra multi-origem |
| O que a candidata deve aprender para chegar a uma habilidade que falta? | Mesmo grafo, caminho mínimo com reconstrução | Dijkstra + predecessores |
| Quão próxima é a área de interesse da candidata da área da vaga? | Árvore de áreas de atuação | Ancestral comum mais baixo (LCA) |
| Como distribuir candidatas entre vagas da empresa maximizando o total? | Grafo bipartido ponderado (candidatas × vagas) | Emparelhamento de peso máximo (húngaro) |

## 2. Grafo de habilidades

- **Vértices:** habilidades (tabela `Habilidades`). Habilidades sem aresta também existem como vértice.
- **Arestas:** pares de habilidades relacionadas, com peso em (0, 1] (tabela `Habilidades_Relacionadas`). Peso próximo de 1 significa quase intercambiáveis (ex.: `javascript` e `typescript`).
- **Estrutura:** lista de adjacência (`Grafo.js`), adequada porque o grafo é esparso.
- **Carga:** lido do banco e mantido em cache em memória (`grafo.service.js`). Habilidade ou aresta nova entra no match sem mudar código.

### Transformação peso → distância

Dijkstra minimiza uma **soma**, mas a afinidade ao longo de um caminho é um **produto** de pesos (cada salto dilui a afinidade). Para usar Dijkstra sem alterá-lo, cada aresta recebe custo `-ln(peso)`:

- soma dos custos = `-ln(produto dos pesos)`;
- o caminho de **menor** custo é o de **maior** produto de pesos;
- a similaridade final é `exp(-distância)`, de volta ao intervalo (0, 1].

Como `peso <= 1`, todo custo é `>= 0`, condição necessária para o Dijkstra estar correto.

### Dijkstra multi-origem

Em vez de rodar Dijkstra uma vez por requisito, o motor roda **uma vez por candidata**, com todas as habilidades dela como origens simultâneas (distância 0). O resultado serve para pontuar **todas** as vagas. Há também poda: similaridade abaixo de 0,25 é tratada como zero, então a busca para em `custoMax = -ln(0,25)`.

A fila de prioridade é um min-heap próprio (`MinHeap.js`), o que dá custo `O((V + E) log V)`.

## 3. Árvore de áreas e LCA

As áreas de atuação formam uma árvore (autorreferência em `Areas_Atuacao`). A distância entre duas áreas passa pelo ancestral comum mais baixo, e a afinidade é `0,7^distância`. Áreas irmãs (mesmo pai) ficam próximas; áreas de ramos diferentes se afastam rápido.

## 4. Alocação ótima (grafo bipartido)

Dadas as candidatas de uma empresa e as vagas dela, monta-se uma matriz de scores (grafo bipartido completo e ponderado) e resolve-se o **emparelhamento de peso máximo** com o algoritmo húngaro, com limiar mínimo de score (padrão 40). Cada candidata fica em no máximo uma vaga e vice-versa. O teste `teste-alocacao.js` mostra um caso em que o ótimo global supera a escolha gulosa.

## 5. Pontuação final

Score de 0 a 100: **55% habilidades + 20% área + 15% nível + 10% preferências**. Requisito obrigatório com similaridade abaixo de 0,5 vira "eliminatória" e multiplica o score por 0,7. Só o componente de habilidades usa o grafo de habilidades; o de área usa a árvore.

## 6. Mapa conceito → código

| Conceito | Arquivo |
|---|---|
| Grafo ponderado, lista de adjacência | `backend/src/graph/Grafo.js` |
| Fila de prioridade (min-heap) | `backend/src/graph/MinHeap.js` |
| Caminho mínimo (Dijkstra multi-origem) | `backend/src/graph/dijkstra.js` |
| Árvore e LCA | `backend/src/graph/arvoreAreas.js` |
| Emparelhamento de peso máximo (húngaro) | `backend/src/graph/hungaro.js` |
| Motor de match, trilha e alocação | `backend/src/graph/motorMatch.js` |
| Cache do grafo | `backend/src/services/grafo.service.js` |
| Testes dos algoritmos | `backend/scripts/teste-grafo.js` |
| Experimento contra baselines | `backend/scripts/experimento-baseline.js` |

## 7. Experimento: grafo contra baselines

### Pergunta

O grafo acrescenta algo em relação a um casamento simples de habilidades?

### Métodos comparados (só o componente de habilidades)

- **grafo:** nota de habilidades do motor (similaridade pelo caminho mínimo, ponderada pela importância).
- **cobertura:** o mesmo cálculo **sem o grafo**: só conta habilidade idêntica, ponderada pela importância. Isola exatamente o que o grafo acrescenta.
- **jaccard:** interseção sobre união entre o conjunto de habilidades da candidata e o de requisitos da vaga. Baseline clássico de comparação de conjuntos.

### Dados

Seed de demonstração determinístico (`npm run seed:demo`): 100 candidatas, 40 vagas ativas com requisitos, 4.000 pares. Reproduzir com `node scripts/experimento-baseline.js` (só lê o banco). A saída bruta desta execução está em `docs/experimento-baseline-saida.txt`.

### Resultado 1: resgate de pares sem habilidade em comum

- Pares em que os dois baselines dão nota 0 (nenhuma habilidade em comum): **2.286 de 4.000 (57,1%)**.
- Nesses pares, o grafo reconhece alguma afinidade em **1.566 (68,5%)**, com nota média de habilidades de 19,7 em 100.

Exemplos reais da execução (a candidata não tem a habilidade pedida, mas tem uma vizinha forte):

| A candidata tem | A vaga pede | Via | Afinidade |
|---|---|---|---|
| `typescript` | `javascript` | `typescript` | 0,90 |
| `mysql` | `sql` | `mysql` | 0,90 |
| `sql` | `postgresql` | `sql` | 0,90 |

### Resultado 2: divergência de ranking

Sobreposição média do top-5 de vagas por candidata: grafo × cobertura **76,6%**; grafo × jaccard **71,0%**. Ou seja, o grafo muda cerca de 1 a 1,5 vaga em cada 5 recomendadas.

### Resultado 3: habilidade oculta (leave-one-out)

Para cada par em que a candidata tem alguma habilidade pedida, esconde-se a habilidade mais importante dela para a vaga e mede-se o efeito no ranking entre as 40 vagas (1.714 casos).

| Método | Piora média no ranking | Nota retida | Continua no top-10 |
|---|---|---|---|
| grafo | 4,29 posições | 66,6% | 67,5% |
| cobertura | 8,81 posições | 25,8% | 49,8% |
| jaccard | 8,43 posições | 28,8% | 55,8% |

### Interpretação

O grafo é **mais robusto** à ausência de uma habilidade exata, porque habilidades vizinhas compensam parte da perda. Na prática, isso trata `TypeScript` e `JavaScript` (ou `MySQL` e `SQL`) como próximas, em vez de totalmente diferentes.

### Limites (leia antes de citar os números)

1. **Não há gabarito de relevância.** O banco não diz quais vagas realmente combinam com quais candidatas. Por isso o experimento mede **robustez e cobertura**, não acerto.
2. **O resultado 3 favorece o grafo por construção.** Os baselines não têm nenhum mecanismo para compensar uma habilidade removida, então piorar mais é esperado. Ele demonstra a propriedade do método, não superioridade empírica.
3. **Dados sintéticos.** Candidatas, vagas e candidaturas vêm do seed de demonstração, e as arestas de `Habilidades_Relacionadas` foram definidas pela equipe. O resultado depende da qualidade dessas arestas: arestas ruins gerariam afinidades falsas.
4. **Pesos arbitrários.** Os pesos 55/20/15/10, o fator 0,7 e o corte de similaridade 0,25 são escolhas de projeto, sem calibração.
5. **Só habilidades.** A comparação cobre apenas o componente de habilidades. Área, nível e preferências são iguais nos três métodos e ficaram fora.

### Como validar de verdade (trabalho futuro)

Coletar julgamentos humanos (recrutadoras marcando quais pares fazem sentido) e medir precisão@k ou NDCG de cada método; ou usar candidaturas reais como sinal de relevância; ou calibrar os pesos com esses dados.

## 8. Transparência e uso responsável

O score é apoio à decisão, não filtro eliminatório. A página de detalhe mostra o motivo de cada nota (por componente e por requisito), o caminho do grafo que gerou a afinidade e a trilha de aprendizado, justamente para o cálculo ser auditável por quem é avaliada por ele.
