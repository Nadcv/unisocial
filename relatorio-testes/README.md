# Relatório de Testes — recolha de fotos por técnico

Mini aplicação web para um técnico preencher o número de série de uma
máquina, indicar destinatários de e-mail, tirar fotos de várias categorias
de teste e enviar tudo por e-mail (com as fotos em anexo) e guardar as
fotos numa pasta do Google Drive.

Ficheiros:

- `index.html` — frontend (formulário + câmara + compressão de imagem).
- `Code.gs` — backend em Google Apps Script (`doPost` grava no Drive e
  envia o e-mail; `doGet` opcionalmente serve o próprio `index.html`,
  desde que o ficheiro HTML no projeto do Apps Script se chame `Index`).

## Passo 1 — Criar a pasta no Google Drive

1. Crie uma pasta no Drive, por exemplo `Fotos_Testes_App`.
2. Abra a pasta e copie o **ID** a partir do URL:
   `https://drive.google.com/drive/folders/AQUI_ESTA_O_ID`

## Passo 2 — Criar o projeto no Apps Script

1. Aceda a [script.google.com](https://script.google.com) → **Novo projeto**.
2. Apague o conteúdo de `Code.gs` por defeito e cole o conteúdo do
   ficheiro `Code.gs` deste repositório.
3. Substitua a constante `FOLDER_ID` pelo ID copiado no Passo 1.
4. Crie um novo ficheiro HTML (menu **+** → **HTML**) chamado `Index`
   e cole o conteúdo do ficheiro `index.html` deste repositório.

## Passo 3 — Publicar como Aplicação Web

1. No editor, clique em **Implementar → Nova implementação**.
2. Tipo: **Aplicação Web**.
3. Descrição: `Recolha Fotos Testes`.
4. **Executar como**: Eu (a sua conta).
5. **Quem tem acesso**: Qualquer pessoa.
6. Clique em **Implementar** e autorize as permissões pedidas
   (se aparecer o aviso "O Google não verificou esta aplicação",
   clique em **Avançado → Ir para... (não seguro) → Permitir**).
7. Copie o **URL da Aplicação Web** (termina em `/exec`).

## Passo 4 — Ligar o frontend ao backend

Há duas formas de usar a aplicação:

### Opção A — servida pelo próprio Apps Script (mais simples)

Não precisa de fazer nada: abra diretamente o URL `/exec` copiado no
Passo 3 no telemóvel. O `doGet` do `Code.gs` já serve o `index.html`, e
como o formulário deteta que está a correr dentro do Apps Script, envia
os dados para o mesmo URL. Evita problemas de CORS.

### Opção B — alojar o `index.html` noutro sítio (GitHub Pages, Netlify, etc.)

Este repositório já está preparado para o GitHub Pages: a versão publicada
fica em `https://<utilizador>.github.io/<repositório>/relatorio-testes/`
(a raiz do site apenas redireciona para lá).

1. Abra o ficheiro `relatorio-testes/index.html` no repositório e edite a
   constante `APPS_SCRIPT_URL` no topo do `<script>`, colando o URL
   `/exec` copiado no Passo 3.
2. Faça commit/push dessa alteração — o GitHub Pages atualiza
   automaticamente em 1–2 minutos.

> Evite abrir o `index.html` diretamente como ficheiro local
> (`file://...`) — alguns navegadores bloqueiam o `fetch` por CORS
> nesse modo. Use a Opção A ou aloje o ficheiro num servidor (Opção B).

## Passo 5 — Testar

1. Abra a aplicação no Chrome do telemóvel.
2. Preencha o número de série e um ou mais e-mails (separados por vírgula).
3. Tire fotos (ou escolha da galeria) para cada categoria.
4. Toque em **Enviar**.
5. Confirme que:
   - Chegou o e-mail com assunto `Relatório de Testes - S/N: <serial>`
     e as fotos em anexo.
   - As fotos ficaram guardadas numa subpasta dentro da pasta do Drive
     configurada (uma subpasta por envio, nomeada com o número de série
     e a data/hora).

## Notas importantes

- **Limite de anexos**: o Gmail aceita cerca de 25 MB no total por
  e-mail. O frontend já comprime automaticamente cada foto (máximo
  1600px no lado maior, qualidade JPEG 0.8) para reduzir o tamanho, mas
  o backend também valida o total e recusa o envio (com mensagem de
  erro clara) se ultrapassar 25 MB.
- **Vários destinatários**: separe os e-mails por vírgula no campo
  "E-mail(s) dos destinatários".
- **Quotas do Gmail**: contas pessoais têm limite de ~100 e-mails/dia.
  Para uso intenso, considere uma conta Google Workspace.
- **Funciona só online**: a aplicação precisa de ligação à internet
  (o backend corre na cloud da Google).
