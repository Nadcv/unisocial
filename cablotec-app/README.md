# Cablotec — Relatórios, Controlo de Produção &amp; Checklist (aplicação unificada)

Esta pasta junta três partes da Cablotec numa só aplicação:

- **📷 Relatórios** — recolha de fotos para o "Relatório de Testes" e o
  "Relatório de Ciclos" das máquinas (rascunhos, correção de envios
  anteriores, biblioteca de esquemas elétricos/de frio reutilizáveis).
- **🏭 Controlo de Produção** — números de série em produção por etapa
  (Grupos e Ciclos), materiais por modelo (elétrica + frio), resumos por
  e-mail manuais e automáticos.
- **✅ Checklist** — checklist de produção detalhado por página, igual
  ao formulário "CHECK-LIST DE PRODUÇÃO Grupo Cond. Walkin" (DP156/R05)
  usado até agora — ver secção própria abaixo.

Um botão no topo (📷 Relatórios / 🏭 Controlo de Produção / ✅ Checklist)
alterna entre as três partes — é a mesma aplicação, o mesmo URL, o mesmo
projeto no Apps Script. O atalho "Ver fotos/relatórios deste número de
série" (no Controlo de Produção) já chama a mesma implementação diretamente, sem
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

- **Relatório de entrega (Word / Excel / PDF)** — dentro de um registo
  de Controlo de Produção, três botões ("📄 Word", "📊 Excel",
  "🧾 PDF") geram um relatório de entrega com os dados do registo
  (número de série, grupo, estados, datas, materiais em falta/
  entregues), as etapas concluídas (com data e nota) e a lista de
  materiais elétrica/frio desse modelo — pronto para entregar ao
  cliente. O Word e o PDF são gerados a partir de um Google Doc
  temporário (apagado logo depois de descarregado); o Excel a partir
  de uma aba temporária na própria Sheet.
- **📷 Ler código QR / 🏷️ Gerar etiqueta** — junto ao número de série,
  nos dois separadores. "Ler código QR" é uma **alternativa** a
  escrever à mão (abre a câmara e preenche o campo sozinho); "Gerar
  etiqueta" abre uma janela com um código QR grande para imprimir e
  colar na máquina, para poder ser lido depois. Precisa de internet
  normal (duas bibliotecas pequenas carregadas de um CDN) e de
  permissão de câmara no browser.
  - No **Controlo de Produção**, a etiqueta gerada codifica um
    **link direto** para uma página pública de consulta (`?action=
    verRegisto&tipo=...&serial=...`), não apenas o número de série.
    Isto significa que qualquer câmara normal do telemóvel (sem ser a
    desta aplicação) consegue ler essa etiqueta e abrir logo uma
    página simples a mostrar o estado do grupo/ciclo (badge
    Em curso/Terminado/Em atraso, modelo, previsão de saída, data de
    entrega e lista de etapas concluídas), sem precisar de abrir a
    aplicação nem de procurar o número de série à mão. Essa página é
    só de leitura (não tem botões de editar) e não exige login Google
    (desde que a implementação esteja com "Quem tem acesso" em
    "Qualquer pessoa" — ver secção acima). No separador Relatórios, a
    etiqueta continua a codificar só o número de série, porque aí não
    existe uma página de estado para abrir.
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

## Checklist de Produção

Dentro de **✅ Checklist → Grupos**, está o checklist "CHECK-LIST DE
PRODUÇÃO Grupo Cond. Walkin" (DP156/R05), com as mesmas 8 páginas,
campos, verificações OK/NA/NOK, tabelas de componentes, fotos e
assinaturas do formulário original, pela mesma ordem.

**Como funciona:**

- Navega-se por "Anterior"/"Seguinte" **sem restrições** — pode avançar
  para a página seguinte mesmo com campos, assinaturas ou fotos por
  preencher nessa página, para poder preencher a checklist aos poucos,
  por qualquer ordem, ao longo do tempo. A validação completa (todas as
  páginas, de 1 até à última) só acontece ao clicar **"Enviar"** na
  última página: se faltar alguma coisa em qualquer página, a app volta
  a mostrar a primeira página com um campo em falta, com a mensagem a
  indicar qual.
- **"Guardar"**, em cada página, só guarda o progresso nesta sessão do
  browser (para poder ir para trás e para a frente sem perder o que já
  escreveu) — **não** envia nada para o servidor. Se fechar o separador/
  app antes de chegar ao fim, perde o que preencheu. Só o **"Enviar"**
  da última página grava tudo definitivamente (Sheet + Drive). Para
  corrigir algo DEPOIS de já ter enviado, use o link de edição que
  chega por e-mail (ver abaixo) — não é preciso recomeçar do zero.
- As assinaturas são feitas com o dedo/rato diretamente no ecrã.
- As fotos (etiquetas, controlador) são comprimidas antes de enviar,
  tal como nos Relatórios.
- Ao enviar, tudo fica guardado numa aba nova **"Checklists"** da
  Google Sheet (uma linha por checklist, com os dados num campo JSON
  para o formulário poder evoluir sem reformatar a folha), e as fotos/
  assinaturas ficam numa subpasta `Checklists/` dentro da pasta do
  Drive configurada em `FOLDER_ID`.
- Se "Durante a produção do grupo, houve alguma não conformidade..."
  for respondido "Sim", é enviado um alerta por WhatsApp (se
  configurado — ver secção de Novidades acima).

### PDF automático por e-mail + edição posterior

Sempre que um checklist (Grupos ou Ciclos) é enviado com sucesso — seja
pela primeira vez ou numa correção — a aplicação:

1. Gera um **número de checklist** sequencial e legível (ex.: `CG-0001`
   para Grupos, `CC-0001` para Ciclos — contadores independentes),
   diferente do id técnico interno. Ao editar/corrigir um checklist já
   enviado, o número **mantém-se o mesmo** (não gera um novo).
2. Gera automaticamente um **PDF em formato A4**, reproduzindo página a
   página o mesmo formulário tal como aparece no ecrã durante o
   preenchimento: o título ("CHECK-LIST DE PRODUÇÃO Grupo Cond. Walkin"
   / "DP156/R05", ou o equivalente de Ciclos) repete-se no topo de cada
   página, os campos seguem a mesma ordem da respetiva página do
   formulário, os itens OK/NA/NOK aparecem numa tabela Item/Resultado,
   as fotos e assinaturas ficam incorporadas como imagens, e há um
   contador "N/Total" (ex.: "1/8") no fundo de cada página, tal como no
   ecrã.
3. Envia esse PDF por e-mail para o endereço preenchido em "E-Mail de
   quem preenche o documento" (página 1), com um **link de edição** no
   corpo da mensagem.
4. Abrir esse link mais tarde leva direto à aplicação, já no separador
   Checklist certo (Grupos ou Ciclos), com **todos os campos
   preenchidos** tal como ficaram guardados — só é preciso corrigir o
   que for preciso e enviar de novo.

**Coisas a saber sobre a edição:**

- As **fotos já enviadas não são recarregadas** no ecrã (para não
  tornar o link pesado/lento) — aparece só uma nota "N foto(s) já
  enviada(s) anteriormente (mantidas ao enviar)" por baixo de cada
  campo de fotos. Isso já satisfaz a validação da página; se quiser,
  pode tirar/escolher fotos adicionais, que se juntam às antigas (as
  antigas nunca são apagadas por esta via).
- As **assinaturas têm de ser feitas de novo** em cada página que
  passar — não ficam pré-carregadas (faz sentido pedir a confirmação
  outra vez ao corrigir um checklist já assinado).
- Ao reenviar, o checklist **substitui o mesmo registo** na aba
  "Checklists" (não cria uma linha nova) — a data de criação original
  mantém-se, só a data de atualização muda.
- Esta funcionalidade de PDF/e-mail/edição é "best effort": se o envio
  do e-mail falhar por algum motivo, o checklist fica guardado na
  mesma — só não chega o PDF/link dessa vez. Qualquer falha fica
  registada em **Execuções** (menu lateral do editor Apps Script), para
  conseguir perceber o motivo.

**Zoom nas fotos:** em qualquer campo de fotos do Checklist, depois de
tirar/escolher uma foto, basta tocar na miniatura para a ver em
tamanho grande (toque fora da foto, ou no ✕, para fechar). O botão ✕
pequeno no canto da miniatura continua a servir para remover a foto.

Dentro de **✅ Checklist → Ciclos**, está o checklist "CHECK-LIST DE
PRODUÇÃO Clico/VA" (DP155/R06), com as mesmas 9 páginas, verificações,
tabelas e assinaturas do formulário original, funcionando da mesma
forma (Anterior/Guardar/Seguinte sem restrições, validação completa só
no "Enviar" final, fotos comprimidas, tudo gravado na mesma aba
"Checklists" ao enviar na última página). Este não tem a pergunta final
de não conformidade
(o original também não tem), por isso não dispara o alerta por
WhatsApp.
- Na página 6/9 (testes do Clico), além dos 3 testes do formulário
  original (elétrico, pressão, vácuo), foi acrescentado um 4º campo de
  fotos — **"Teste elétrico Humidificador"** — também obrigatório,
  pedido fora do formulário original.
- Na página 1 de ambos (Grupos e Ciclos), ao escolher **"Subcontrato"**
  em "Produção por", aparece um campo de texto obrigatório para
  escrever o nome da empresa subcontratada. Ao escolher "Aralab", o
  campo esconde-se e limpa automaticamente.
- Na página 5/8 (Grupos), o campo "Teste Eléctrico" passou a ter
  também as opções **OK/NA/NOK** (obrigatório, "Conforme IT128"),
  tal como os testes de pressão e de vácuo logo abaixo; o campo de
  seleção do gás (ex.: R513A) ficou com o rótulo **"Gás"**, por baixo
  desse OK/NA/NOK.
- Na página 6/8 (Grupos), depois de "Fotos Controlador" foram
  acrescentados 3 campos de fotos obrigatórios — **"Fotos Teste
  Eléctrico"**, **"Fotos Teste de Pressão"** e **"Fotos Teste de
  Vácuo"** (todos "Conforme IT128") — para documentar com imagem os
  testes já marcados OK/NA/NOK na página anterior.

## Campos de escolha com "Outro (escrever)..."

Os campos que no formulário original eram dropdowns já estão como
**listas que crescem sozinhas**, exatamente como o resto da aplicação
(ex.: o campo "Grupo" dos Relatórios): escolhe-se um valor já existente
ou "Outro (escrever)...", escreve-se o novo valor, e ele fica
disponível para a próxima vez — sem precisar de mexer no código.

- **Equipamento** (Ciclos) — lista própria, começa vazia.
- **Esquema Elétrico** e **Esquema de refrigeração** (Grupos e
  Ciclos) — usam as **mesmas listas** já existentes no Relatório de
  Testes (`esquemasEletrico`/`esquemasFrio`): se adicionar um esquema
  novo aqui, ele passa a aparecer também nos Relatórios, e vice-versa
  — é uma única lista partilhada, não uma por formulário.
- **Teste Eléctrico** (Grupos) — usa a mesma lista de gases
  (`gases`) já existente nos Relatórios.
- **Fabricante/Modelo da Sonda** e **Fabricante do Clico** (Ciclos)
  — listas próprias do Checklist, começam com o único exemplo visto
  nas fotos (Vaisala / HMP110 / Z.A) e crescem a partir daí.

**Diferenças a saber** entre o formulário original (Zoho) e esta
versão:

- A pergunta "Há Ventiladores adicionais?" (página 4, Ciclos) pode ter
  campos extra no original quando se responde "Sim" (lógica
  condicional) que não apareceram nas fotos — aqui fica só a
  pergunta, sem campos extra. Diga-me se precisar deles.
- Mantive tal e qual os nomes das verificações do original, incluindo
  pequenas gralhas ("tampa exteriror", "base metática") — para ficar
  igual ao documento que a equipa já conhece.

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
- O Checklist cria uma aba nova "Checklists" na primeira vez que for
  usado. Os ids de elementos deste separador usam todos o prefixo
  `cg-` (Checklist Grupos), por isso não há colisão com os ids de
  Relatórios ou Controlo de Produção.
