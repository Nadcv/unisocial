# Cablotec — Relatórios &amp; Controlo de Produção (aplicação unificada)

Esta pasta junta as duas aplicações da Cablotec numa só:

- **📷 Relatórios** — recolha de fotos para o "Relatório de Testes" e o
  "Relatório de Ciclos" das máquinas (rascunhos, correção de envios
  anteriores, biblioteca de esquemas elétricos/de frio reutilizáveis).
- **🏭 Controlo de Produção** — números de série em produção por etapa
  (Grupos e Ciclos), materiais por modelo (elétrica + frio), resumos por
  e-mail manuais e automáticos.

Um botão no topo (📷 Relatórios / 🏭 Controlo de Produção) alterna entre
as duas partes — é a mesma aplicação, o mesmo URL, o mesmo projeto no
Apps Script. O atalho "Ver fotos/relatórios deste número de série" (no
Controlo de Produção) já chama a mesma implementação diretamente, sem
depender de nenhum URL externo.

## Já existe: Envio de produção por e-mail (um único sítio)

Dentro de **🏭 Controlo de Produção**, a funcionalidade de enviar
atualizações de produção por e-mail já está concentrada num único
sítio, com dois cartões:

- **"Enviar resumo de produção por e-mail"** — envio manual imediato
  (Excel + PDF em anexo, do estado atual de Grupos ou Ciclos).
- **"Envio automático de resumos"** — agenda o mesmo envio para
  acontecer sozinho: todos os dias, toda a semana (num dia à escolha),
  ou uma única vez numa data/hora exata.

Não há nenhum outro sítio na aplicação que envie "atualizações de
produção" — isto evita duplicação e confusão sobre qual botão usar.

## Correção importante: falhas de envio fora da rede da empresa

Se o envio de e-mails (ou o carregamento da aplicação) falhava fora do
wifi da empresa (ex.: dados móveis) mas funcionava normalmente lá, a
causa quase certa é a definição **"Quem tem acesso"** da implementação
estar em **"Qualquer pessoa com uma Conta Google"**. Essa opção exige
que o telemóvel/computador já esteja autenticado no browser com a
conta Google certa — isso acontece sozinho em dispositivos/rede da
empresa (sessão Google já guardada), mas falha noutra rede/dispositivo,
porque a Google serve uma página de login HTML em vez de executar o
script.

**Fix:** na implementação, mudar "Quem tem acesso" para **"Qualquer
pessoa"** (ver Passo 2 abaixo). Esta aplicação também já deteta esse
caso no browser (nos dois separadores) e mostra uma mensagem clara em
vez do erro críptico "Unexpected token '&lt;'".

## Passo 1 — Preparar o projeto no Apps Script

Este script fica **ligado a uma Google Sheet** (é assim que o Controlo
de Produção guarda os seus registos) — não é um script standalone.

1. Abra a Google Sheet que já usa para o Controlo de Produção (ou crie
   uma nova, vazia, se estiver a começar do zero).
2. Nessa folha, vá a **Extensões → Apps Script**.
3. Apague o conteúdo de `Código.gs`/`Code.gs` e cole o conteúdo do
   ficheiro `Code.gs` deste repositório.
4. Confirme/substitua `FOLDER_ID` (perto do topo) pelo ID da pasta do
   Google Drive onde as fotos dos Relatórios devem ficar guardadas.
5. Crie/edite o ficheiro HTML chamado exatamente `Index` e cole o
   conteúdo do ficheiro `Index.html` deste repositório.

## Passo 2 — Publicar como Aplicação Web

1. No editor, clique em **Implementar → Nova implementação** (ou
   **Gerir implementações → editar (lápis) → Nova versão**, se já
   tinha uma implementação anterior do Controlo de Produção ou dos
   Relatórios e quer manter o mesmo URL).
2. Tipo: **Aplicação Web**.
3. **Executar como**: Eu (a sua conta).
4. **Quem tem acesso**: **Qualquer pessoa** (importante — ver secção
   acima sobre falhas fora da rede da empresa).
5. Clique em **Implementar** e autorize as permissões pedidas (Google
   Sheets, Gmail, Drive, gatilhos). Se aparecer "O Google não
   verificou esta aplicação", clique em **Avançado → Ir para... (não
   seguro) → Permitir**.
6. Se acabou de adicionar permissões novas (ex.: vinha só dos
   Relatórios e nunca tinha usado Google Sheets/gatilhos, ou
   vice-versa): abra o editor, escolha a função `doGet`, clique em
   **Executar** uma vez, aceite o aviso, e só depois volte a
   **Implementar → Gerir implementações → editar → Nova versão →
   Implementar**, para a autorização ficar ativa no link `/exec`.
7. Copie o **URL da Aplicação Web** (termina em `/exec`) e partilhe-o
   com a equipa.

## Passo 3 — Usar

1. Abra o URL `/exec` — a aplicação abre sempre no separador
   **📷 Relatórios**; toque em **🏭 Controlo de Produção** para mudar.
2. Em **Relatórios**: escolha Testes ou Ciclos no topo, preencha o
   número de série, e-mails, técnico, grupo, etc., tire as fotos e
   envie. Use "Guardar progresso" para continuar mais tarde (ex.: um
   vácuo de 24h) e "Corrigir envio anterior" se precisar de corrigir
   algo já enviado.
3. Em **Controlo de Produção**: procure/crie um número de série,
   escolha o Grupo/Tipo (as tabelas de materiais elétrica/frio desse
   modelo aparecem automaticamente), marque as etapas concluídas, e
   guarde. Use os cartões do fundo para o resumo por e-mail (manual ou
   automático).

## Novidades

- **📷 Ler código QR / 🏷️ Gerar etiqueta** — junto ao número de série,
  nos dois separadores. "Ler código QR" é uma **alternativa** a
  escrever à mão (abre a câmara e preenche o campo sozinho); "Gerar
  etiqueta" abre uma janela com um código QR grande para imprimir e
  colar na máquina, para poder ser lido depois. Precisa de internet
  normal (duas bibliotecas pequenas carregadas de um CDN) e de
  permissão de câmara no browser.
- **Armazém — stock de materiais** (dentro de Controlo de Produção) —
  diferente da tabela "Materiais por modelo" (que é só a lista do que
  cada modelo precisa): aqui regista-se o stock real (quantidade
  atual e mínima) e cada entrada/saída, e a aplicação calcula uma
  previsão de quantos dias faltam até atingir o mínimo, com base no
  consumo médio dos últimos 60 dias. Fica assinalado a vermelho
  quando faltam 7 dias ou menos.
- **Etapas mais lentas (gargalos)** e **tendência de atrasos por mês**
  — novo cartão no Painel que mostra o tempo médio gasto em cada etapa
  (para identificar onde a produção costuma atrasar) e quantos
  registos ficaram em atraso em cada um dos últimos meses.
- **Histórico completo por número de série** — dentro de um registo
  de Controlo de Produção, o botão "Ver histórico completo" junta num
  único feed cronológico os relatórios enviados (Drive) e as etapas
  de produção concluídas, sem ter de consultar os dois separadores em
  separado.
- **Alerta por WhatsApp (opcional)** — quando um material do Armazém
  atinge o stock mínimo, pode enviar um aviso por WhatsApp em vez de
  (ou além de) e-mail. Desligado por omissão. Para ativar: envie a
  mensagem "I allow callmebot to send me messages" para o número
  indicado em
  https://www.callmebot.com/blog/free-api-whatsapp-messages/, receba a
  sua `apikey` de volta por WhatsApp, e preencha `WHATSAPP_TELEFONE` e
  `WHATSAPP_APIKEY` no topo do `Code.gs` (procure por "Alerta por
  WhatsApp"). É grátis e não precisa de aprovação de nenhuma app.
- **Funciona parcialmente sem rede (PWA experimental)** — a aplicação
  pode ser "Adicionada ao ecrã principal" do telemóvel, e a própria
  página fica em cache para abrir mais rapidamente/mesmo sem rede.
  **Importante:** isto não torna o envio de fotos, e-mails ou
  gravações possível sem internet — essas continuam a precisar de
  ligação, como em qualquer aplicação Apps Script. É um recurso
  experimental e best-effort: dependendo do browser, pode não
  registar-se.

## Notas técnicas

- As duas partes partilham o mesmo `doGet`/`doPost`: os Relatórios
  usam `?action=...` (fotos, rascunhos, correções); o Controlo de
  Produção usa `dados.acao` no `POST` e `?action=...` próprios no
  `GET` (listar, obter, resumo, etc.) — não há colisão de nomes de
  ação entre os dois.
- Os dois separadores partilham praticamente o mesmo sistema visual
  (mesmas cores, cartões, botões) — por isso os estilos não precisaram
  de isolamento; só 5 ids de elementos que coincidiam entre os dois
  HTMLs originais (`serial`, `grupo`, `grupo-outro`, `estado`,
  `abaCiclos`) foram renomeados no lado do Controlo de Produção
  (`serialProducao`, `grupoProducao`, etc.) para não haver confusão
  sobre qual elemento é lido/escrito.
- Nenhuma das pastas antigas (`relatorio-testes/`, `producao-cablotec/`)
  foi apagada — continuam a existir como apps autónomas, caso prefira
  manter alguma delas publicada separadamente. Esta pasta
  (`cablotec-app/`) é a versão unificada recomendada a partir de agora.
- O Armazém cria duas abas novas na Google Sheet, na primeira vez que
  forem usadas: `Materiais` (stock real) e `MovimentosStock`
  (histórico de entradas/saídas). São independentes das abas `Grupos`,
  `Ciclos` e `MateriaisPadrao` já existentes.
- O manifesto e o service worker do PWA são servidos pelo próprio
  `doGet` (`?action=manifest` e `?action=sw`), para não precisar de
  nenhum ficheiro extra no projeto.
