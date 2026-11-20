# Testes do ELAB

## 1. Estratégia

Os testes são **automatizados e ponta a ponta no backend**: cada suíte cria dados temporários (usuárias, vagas, habilidades de teste), exercita a API real por HTTP e remove tudo no final, verificando que nada sobrou. A suíte de grafos é a exceção: testa os algoritmos diretamente, com grafos pequenos de resposta conhecida, sem banco.

## 2. Como executar

Com o MySQL rodando, as migrations e o seed de catálogo aplicados e o servidor ligado (`npm run dev`), em outro terminal:

```bash
cd backend
npm test
```

Cada suíte imprime `OK` por verificação e termina com `TUDO OK` ou com o número de falhas. As suítes rodam em sequência e a primeira que falhar interrompe o comando.

## 3. Suítes

| Suíte | Arquivo | O que verifica | Requisitos |
|---|---|---|---|
| Grafo | `scripts/teste-grafo.js` | MinHeap em ordem; grafo (ordem, tamanho, simetria); Dijkstra (maior produto de pesos, multi-origem, poda); LCA e afinidade de área; húngaro igual à força bruta em 200 matrizes aleatórias; descarte abaixo do mínimo; motor (match perfeito = 100, crédito parcial pelo grafo, obrigatória ausente, ranking, trilha, alocação global) | RF22 a RF25, RN03, RN04, RN07 |
| Perfil | `scripts/teste-perfil.js` | Cadastro e login; 401 sem token; completude; dados, preferências, áreas e habilidades; experiências e formações (criar, editar, apagar, data inválida, 404); currículo (PDF válido, PDF falso rejeitado, extensão proibida, download, remoção, 404 sem currículo) | RF01, RF03 a RF11, RNF07 |
| Match | `scripts/teste-match.js` | Ranking de vagas ordenado por score; componentes e eliminatórias; ordem esperada entre vagas de teste; requisitos com nome; trilha (vaga completa, inalcançável, caminho mínimo); 404 e 400; empresa sem acesso ao match; vaga de empresa desativada some do ranking e da trilha | RF22 a RF24, RF35 |
| Candidatos | `scripts/teste-candidatos.js` | Empresa dona recebe as inscritas ordenadas por score; eliminatória identificada; 403 para outra empresa e para colaboradora; 401 sem token; 404 para vaga inexistente | RF20, RF21, RN06 |
| Vaga | `scripts/teste-vaga.js` | Criação de vaga completa e dos campos gravados; requisitos com valores padrão; vaga aparece no ranking; 400 para área, habilidade, salário, nível e importância inválidos; nenhuma vaga pela metade; evento ignora requisitos; texto livre de habilidades ignorado; 403 para colaboradora | RF14, RF15, RN01, RN02 |
| Alocação | `scripts/teste-alocacao.js` | Cenário de disputa em que o ótimo global supera o guloso; total igual à soma dos pares; empresa sem vagas; empresa desativada não aloca; 403 e 401 | RF25, RN07, RF35 |
| Admin | `scripts/teste-admin.js` | Aprovação de empresa (pendente, motivo obrigatório, aprovar limpa o motivo); empresa rejeitada não publica; empresa aprovada publica; fila de empresas e de publicações; 401/403; filtro de status inválido; alvos inexistentes | RF27, RF28, RF30 |
| Moderação | `scripts/teste-moderacao.js` | Visibilidade por papel (pública, dona, admin, outra empresa, colaboradora); 404 para pendente/rejeitada; motivo obrigatório; aprovar limpa o motivo; efeito no feed e na inscrição; fila filtrada; histórico de inscrições esconde publicação rejeitada e empresa desativada, e volta ao reativar; desativar a empresa oculta do feed, do detalhe e da inscrição (dona e admin seguem vendo); reativar devolve ao feed | RF29, RF31, RF35, RN08 |
| Imagem | `scripts/teste-imagem.js` | Upload do banner (URL, arquivo em disco, WebP real nas dimensões originais e sem EXIF); `imagemUrl` nas listagens e no detalhe; 403 para outra empresa e colaboradora; 400 para arquivo falso, PNG corrompido com assinatura válida, acima de 2 MB e envio vazio; erro de envio não apaga o banner atual; troca reabre a moderação e apaga o antigo; duas trocas simultâneas elegem um banner só, e o perdedor sai do disco e retorna 404 em `/media/postagens`; remoção apaga o arquivo | RF32, RF33, RNF07, RNF15 |
| Foto | `scripts/teste-foto.js` | Upload da foto de perfil (URL, arquivo em disco, WebP 512×512 sem EXIF); `fotoUrl` no perfil; arquivo servido em `/media/fotos`; troca apaga a anterior sem apagar a nova em caso de erro; duas trocas simultâneas deixam uma foto só, e a perdedora sai do disco e retorna 404 em `/media/fotos`; 400 para arquivo falso e envio vazio; 401 sem token; empresa também envia e remove; remoção apaga o arquivo, zera `fotoUrl` e repetir retorna 404 | RF34, RNF15, RNF16 |

Ao todo são mais de duzentas e cinquenta verificações em dez suítes. Na última execução completa, todas terminaram com `TUDO OK`.

## 4. Experimento (não faz parte do `npm test`)

`scripts/experimento-baseline.js` compara o motor de grafos com dois baselines (Jaccard e cobertura ponderada) sobre os dados do `seed:demo`. Só lê o banco. Detalhes e limites em [../GRAFOS.md](../GRAFOS.md).

```bash
cd backend
node scripts/experimento-baseline.js
```

## 5. Dados de demonstração

`npm run seed:demo` cria um conjunto determinístico (100 colaboradoras, 8 empresas, 40 vagas, 429 candidaturas) usado para demonstração manual e para o experimento. Apaga todos os usuários, exceto `admin@elab.com`.

## 6. O que não está coberto

- **Frontend:** não há testes automatizados de interface. A verificação das telas foi manual, em navegador.
- **Rota `GET /oportunidades/minhas-inscricoes`:** o caminho principal é coberto por `teste-moderacao.js` (inscrição com score, publicação rejeitada e empresa desativada somem do histórico, e voltam ao reaprovar/reativar). O 403 para empresa e o 401 sem token foram verificados manualmente com `curl`.
- **Catálogo** (`GET /catalogo/*`) e **limite de tentativas (429)**: sem teste automatizado. A listagem pública (`GET /oportunidades`) é verificada de forma indireta pelas suítes de moderação e imagem (o que aparece e o que some do feed), mas não há teste dedicado aos filtros de busca e tipo.
- **Segurança de cabeçalhos (CSP)** e **XSS**: sem teste automatizado. O upload de imagem é conferido pela assinatura de bytes, então SVG e arquivos falsos são recusados (a suíte cobre o arquivo falso, não o SVG em particular).
- **Integração contínua:** não há pipeline que rode os testes a cada push.
- **Carga e desempenho:** não medidos.
- **Dependência de ambiente:** as suítes de API exigem servidor e banco ligados; não há banco de teste isolado, e elas rodam contra o mesmo banco de desenvolvimento (por isso limpam o que criam).

## 7. Melhorias sugeridas

1. Teste automatizado para o 429 do login.
2. Teste de que o frontend escapa texto do usuário.
3. Banco de teste separado.
4. Pipeline de CI (por exemplo, GitHub Actions) que suba MySQL, aplique migrations e rode `npm test`.
