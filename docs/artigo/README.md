# Artigo: compatibilidade entre candidatas e vagas com Teoria dos Grafos (ELAB)

Artigo no modelo da SBC, escrito em LaTeX. Este guia mostra como gerar o `artigo.pdf` no Arch, no Debian/Ubuntu e no Windows.

## Arquivos

| Arquivo | Para que serve |
|---|---|
| `artigo.tex` | Texto do artigo |
| `referencias.bib` | Referências bibliográficas (BibTeX) |
| `sbc-template.sty` | Estilo do modelo SBC |
| `sbc.bst` | Estilo das referências da SBC |
| `artigo.pdf` | Resultado da compilação |

Os quatro primeiros precisam estar na mesma pasta. Sem o `referencias.bib`, o PDF sai com todas as citações como `[?]` e sem a lista de referências.

## 1. Instalar as dependências

O artigo usa os pacotes `geometry`, `caption2`, `titlesec`, `times`, `babel` (português do Brasil), `amsmath` e `graphicx`.

### Arch Linux

```bash
sudo pacman -S texlive-latexextra texlive-latexrecommended texlive-fontsrecommended texlive-langportuguese texlive-binextra
```

O `texlive-binextra` traz o `latexmk`. Para instalar tudo de uma vez (vários GB): `sudo pacman -S texlive texlive-lang`.

### Debian / Ubuntu

```bash
sudo apt update
sudo apt install texlive-latex-base texlive-latex-recommended texlive-latex-extra texlive-fonts-recommended texlive-lang-portuguese latexmk
```

Para instalar tudo de uma vez (vários GB): `sudo apt install texlive-full`.

### Windows

1. Instale o **MiKTeX** (https://miktex.org/download) ou o **TeX Live** (https://tug.org/texlive/windows.html).
2. No MiKTeX, deixe a opção de instalar pacotes que faltam "automaticamente" (ou "perguntar"). Na primeira compilação ele baixa o que precisar.
3. Para usar o `latexmk`, instale também o **Perl** (por exemplo, Strawberry Perl). Sem o Perl, use os comandos manuais da seção 2.

Alternativa sem instalar nada: crie um projeto no **Overleaf**, envie os quatro arquivos de entrada e compile com o compilador pdfLaTeX.

## 2. Compilar

Abra o terminal (no Windows, PowerShell ou o terminal do MiKTeX) na pasta do artigo.

### Com latexmk (recomendado)

```bash
latexmk -pdf artigo
```

Ele roda `pdflatex` e `bibtex` quantas vezes forem necessárias.

### Manualmente (Linux e Windows)

São quatro passos, nesta ordem:

```bash
pdflatex artigo
bibtex artigo
pdflatex artigo
pdflatex artigo
```

O `bibtex` lê o `artigo.aux` gerado pelo primeiro `pdflatex` e monta a lista de referências. Os dois últimos `pdflatex` resolvem as citações e a numeração. Pular qualquer passo deixa `[?]` no texto.

Para ver só os erros, no Linux: `pdflatex -interaction=nonstopmode artigo | tail -20`.

O resultado fica em `artigo.pdf`.

## 3. Limpar os arquivos auxiliares

A compilação gera `.aux`, `.log`, `.bbl`, `.blg` e outros. Eles não devem ir para o git.

```bash
latexmk -c
```

Sem o `latexmk`, no Linux:

```bash
find . -maxdepth 1 -type f \( -name "*.aux" -o -name "*.log" -o -name "*.bbl" -o -name "*.blg" -o -name "*.out" -o -name "*.toc" -o -name "*.fls" -o -name "*.fdb_latexmk" -o -name "*.synctex.gz" \) -delete
```

No Windows (PowerShell):

```powershell
Remove-Item *.aux, *.log, *.bbl, *.blg, *.out, *.toc, *.fls, *.fdb_latexmk, *.synctex.gz -ErrorAction SilentlyContinue
```

Isso não apaga o `artigo.pdf` nem os arquivos de entrada.

## 4. Problemas comuns

| Sintoma | Causa e solução |
|---|---|
| `File 'titlesec.sty' not found` (ou `caption2.sty`, `geometry.sty`, `times.sty`) | Faltam pacotes LaTeX. Instale os pacotes da seção 1. |
| `I couldn't open file name 'artigo.aux'` | O primeiro `pdflatex` falhou e não gerou o `.aux`. Corrija o erro do `pdflatex` antes de rodar o `bibtex`. |
| `I couldn't open database file referencias.bib` | O `referencias.bib` não está na mesma pasta do `artigo.tex`. |
| Citações aparecem como `[?]` | Rode a sequência completa: `pdflatex`, `bibtex`, `pdflatex`, `pdflatex`. |
| Acentos errados ou `babel` reclamando do idioma | Falta o pacote de português (`texlive-langportuguese` no Arch, `texlive-lang-portuguese` no Debian). |
| Erro nunca aparece e o PDF não muda | Confira se salvou o `artigo.tex` e se está compilando na pasta certa. |

Quando houver erro, o primeiro problema está no `artigo.log`. Procure por ele com:

```bash
grep -n -A3 "^!" artigo.log | head -20
```
