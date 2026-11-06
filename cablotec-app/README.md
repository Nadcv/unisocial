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
- **Alertas por WhatsApp (opcional, até 5 números)** — além de material
  do Armazém a atingir o stock mínimo, também avisa por WhatsApp em
  checklists com não conformidade, checklists em falta e máquinas em
  atraso. Desligado por omissão, e configurado dentro da própria
  aplicação (🏭 Controlo de Produção → cartão "Alertas por WhatsApp"),
  sem precisar de tocar em código: cada número que deva receber
  alertas tem de, do seu próprio telemóvel, enviar a mensagem "I allow
  callmebot to send me messages" para o número indicado em
  https://www.callmebot.com/blog/free-api-whatsapp-messages/, receber a
  sua própria `apikey` de volta por WhatsApp (uma apikey só funciona
  para o número que a gerou), e preencher esse número + apikey nesse
  cartão. Até 5 números podem ser adicionados, todos a receber os
  mesmos alertas. É grátis e não precisa de aprovação de nenhuma app.
  (As variáveis `WHATSAPP_TELEFONE`/`WHATSAPP_APIKEY` no topo do
  `Code.gs` continuam a funcionar como um 1º número de reserva, só por
  compatibilidade com quem já as tinha preenchido antes desta
  atualização — para configurações novas, use antes o cartão na
  aplicação.)
- **Funciona parcialmente sem rede (PWA experimental)** — a aplicação
  pode ser "Adicionada ao ecrã principal" do telemóvel, e a própria
  página fica em cache para abrir mais rapidamente/mesmo sem rede.
  **Importante:** isto não torna o envio de fotos, e-mails ou
  gravações possível sem internet — essas continuam a precisar de
  ligação, como em qualquer aplicação Apps Script. É um recurso
  experimental e best-effort: dependendo do browser, pode não
  registar-se.

## Robustez, qualidade e configuração (novidades)

- **Lock contra edições em simultâneo** — as gravações mais sensíveis
  (guardar registo de produção, mudar número de série, guardar
  checklist, stock) usam `LockService` do Apps Script: se duas pessoas
  gravarem a mesma coisa ao mesmo tempo, a segunda espera a primeira
  terminar em vez de sobrepor/duplicar dados.
- **Registo de auditoria** — nova aba **"Auditoria"** na Google Sheet,
  com uma linha por cada gravação importante (criar/editar registo de
  produção, mudar número de série, criar/editar checklist, stock):
  data, responsável (quando preenchido), ação, entidade e detalhes.
  Serve para responder "quem fez o quê e quando" sem depender de login
  Google (que esta aplicação não usa — ver secção sobre acesso fora da
  rede da empresa). No Controlo de Produção, há um novo campo opcional
  **"Responsável"** que fica registado nesta aba quando preenchido.
- **Templates de checklist configuráveis** — os textos dos itens
  OK/NA/NOK do Checklist (rótulos e notas) passam a poder ser editados
  diretamente numa aba nova **"ChecklistTemplates"** da Sheet (colunas
  `tipo`, `chave`, `rotulo`, `nota`), sem tocar em código. Esta aba
  semeia-se a si própria com os textos atuais da aplicação na primeira
  vez que o Checklist é aberto (só se ainda estiver vazia — nunca
  sobrescreve uma edição já feita).
- **Paginação nas listas** — a lista de registos do Controlo de
  Produção e a lista de checklists no Histórico carregam agora em
  blocos de 50, com um botão **"Carregar mais"**, em vez de tudo de
  uma vez — mantém a aplicação rápida com centenas de registos.
- **Marca de água nas fotos** — todas as fotos (Relatórios e
  Checklist) ficam com uma faixa semi-transparente no canto inferior
  esquerdo com o número de série, o tipo de foto e a data/hora, para
  não haver dúvidas sobre a que máquina/momento uma foto pertence.
- **Fila de envio offline** — se o envio final de um Relatório ou
  Checklist falhar por falta de ligação (em vez de um erro do
  servidor), o que foi preenchido fica guardado neste dispositivo
  (`localStorage`) e é reenviado automaticamente quando a ligação
  voltar (ou ao reabrir a página) — aparece um aviso **"N envio(s)
  pendente(s)"** no topo da aplicação enquanto isso não acontecer.
  Não substitui o rascunho do Checklist (que é guardado assim que se
  clica "Guardar", mesmo com rede): é só para o momento em que o
  "Enviar" final em si falha por falta de rede.
- **Backup diário da Sheet** — todos os dias às 3h, a aplicação copia a
  Google Sheet inteira para uma subpasta **"Backups"** (dentro da pasta
  do Drive configurada em `FOLDER_ID`), e apaga cópias com mais de 30
  dias. Protege contra uma linha apagada por engano ou um dia mau do
  Google — não precisa de nenhuma configuração; o gatilho instala-se a
  si próprio na primeira vez que a aplicação é aberta depois desta
  atualização.
- **Limpeza de ficheiros temporários órfãos** — o mesmo gatilho diário
  apaga ficheiros do Drive e abas da Sheet com nome a começar por
  `_tmp_` (criados durante a geração de PDFs/Word/Excel) que tenham
  mais de 2 horas — só acontece se uma geração for interrompida a meio
  (ex.: limite de 6 minutos de execução do Apps Script); em condições
  normais são sempre apagados no próprio momento.
- **Aviso de quota de e-mail** — no Painel do Controlo de Produção,
  aparece um aviso quando restam 20 e-mails ou menos na quota diária
  da conta Google (100/dia numa conta pessoal, 1500/dia numa conta
  Workspace), para saber com antecedência que os checklists/resumos
  podem deixar de chegar por e-mail até ao reset do dia seguinte.
- **Alerta de máquinas em atraso** — além do alerta já existente de
  "checklist em falta", quando o **"Envio automático de resumos"**
  estiver ativado, a aplicação avisa também (e-mail + WhatsApp, se
  configurado) sobre máquinas "Em curso" cuja previsão de saída já
  passou.
- **Número de checklist reservado antes de enviar** — ao avançar da
  primeira página de um checklist novo (Grupos ou Ciclos), o número
  (ex.: `CG-0042`) já aparece no topo da página, em vez de só depois de
  enviar — útil para o escrever na etiqueta da máquina durante o
  preenchimento. Se o checklist for abandonado sem enviar, esse número
  fica por usar (a numeração não precisa de ser contínua, só de nunca
  repetir).
- **Número de série normalizado** — o número de série é automaticamente
  convertido para maiúsculas (e sem espaços a mais) em todos os sítios
  onde é escrito (Relatórios, Controlo de Produção, Checklist),
  independentemente de como foi digitado (ex.: "sn-123" e "SN-123"
  passam a contar como o mesmo). Isto evita que o histórico de fotos da
  mesma máquina fique dividido em pastas diferentes por pequenas
  diferenças de maiúsculas/minúsculas. **Nota:** só afeta registos
  gravados a partir desta atualização — pastas/registos já existentes
  mantêm a capitalização com que foram criados.

## Qualidade, portal do cliente e inteligência de dados (novidades)

- **Assinatura do Supervisor** — além da assinatura do Responsável em
  cada página, a última página do Checklist (Grupos e Ciclos) passa a
  exigir também uma segunda assinatura, do Supervisor, antes de poder
  enviar.
- **Fotos mínimas configuráveis por campo** — o número mínimo de fotos
  exigido em cada campo do Checklist (hoje sempre 1) pode ser alterado
  numa aba nova **"RegrasFotosChecklist"** da Sheet (colunas `tipo`,
  `campo`, `minimo`), sem tocar em código. Um campo sem linha aqui
  continua a exigir 1 foto, como sempre.
- **Encomenda automática de stock sugerida** — quando um movimento
  deixa um material do Armazém no stock mínimo (ou abaixo), além do
  alerta de WhatsApp já existente, cria-se uma sugestão de encomenda
  (quantidade = stock máximo − stock atual, ou o dobro do mínimo se não
  tiver stock máximo definido) numa nova secção **"Encomendas
  sugeridas"**, com botão para marcar como resolvida quando a compra for
  feita. Os novos campos opcionais "Stock máximo" e "Fornecedor
  habitual" aparecem ao adicionar um material.
- **Histórico de alterações campo a campo** — a Auditoria (Controlo de
  Produção) passa a guardar, em cada gravação de um registo já
  existente, exatamente o que mudou (ex.: "previsaoSaida: 2026-10-10 →
  2026-10-15"), em vez de só "estado + previsão atuais". Ajuda a
  responder "quem mudou isto e quando" numa reclamação.
- **Comparação previsto vs. real por etapa** — no histórico combinado
  de um número de série (botão "Ver histórico completo"), cada etapa
  concluída mostra agora quantos dias demorou face à média histórica
  dessa etapa (por modelo, quando há amostras suficientes; senão a
  média geral), destacado a vermelho quando o desvio é superior a 50%.
- **Previsão de conclusão por regressão linear** — dentro de um registo
  em curso, aparece uma "Previsão estimada (histórico)" junto da
  Previsão de saída manual: soma, para cada etapa ainda não concluída,
  a duração projetada por uma regressão linear simples sobre os tempos
  históricos dessa etapa/modelo (capta tendências de melhoria ou
  atraso, não só uma média fixa) — puramente informativa, nunca
  substitui o campo preenchido à mão.
- **Exportar o Painel por e-mail** — novo botão "Enviar snapshot do
  Painel por e-mail" no topo do Controlo de Produção, que gera um PDF
  curto com os 3 cartões do Painel (resumo geral, etapas mais lentas,
  tendência de atrasos) e envia para os e-mails já configurados no
  cartão de resumo, abaixo.
- **Google Calendar para prazos** — sempre que a "Previsão de saída" de
  um registo é preenchida ou alterada, cria/atualiza automaticamente um
  evento de dia inteiro no calendário Google da conta que publicou a
  aplicação, com o número de série e o modelo; é apagado automaticamente
  quando a máquina é marcada "Terminado" ou a previsão é removida.
- **Pesquisa global** — nova barra de pesquisa no topo da aplicação
  (visível em qualquer separador), que procura um número de série em
  simultâneo no Controlo de Produção, nos Checklists e no histórico
  combinado de Relatórios, com botões para abrir diretamente o que for
  encontrado.
- **Portal do cliente** — botão "Enviar link ao cliente" em cada
  registo do Controlo de Produção, que mostra/copia o link público (sem
  login) de consulta do estado — o mesmo que já é usado no QR code — e
  pode enviá-lo diretamente por e-mail ao cliente.
- **Modo kiosk para a fábrica** — abrir a aplicação com `?modo=kiosk`
  no final do URL mostra uma página autónoma, de fundo escuro e letra
  grande, pensada para ficar sempre aberta num tablet/ecrã na linha de
  produção: lista só as máquinas "Em curso" com a etapa atual de cada
  uma, destacadas a vermelho quando em atraso, e atualiza-se sozinha de
  2 em 2 minutos. Não é a aplicação normal (não tem botões de editar).
- **QR code por material (Armazém)** — cada material do stock passa a
  ter um botão 🏷️ para gerar uma etiqueta QR (para colar na prateleira),
  e o registo de movimentos tem um botão "Ler QR do material" para
  selecionar o material lendo essa etiqueta em vez de o procurar na
  lista.
- **Backup/limpeza diários e aviso de quota** (ver secção anterior) e as
  correções de segurança/robustez abaixo completam este lote: um erro
  numa página de download que ecoasse texto do próprio pedido sem
  escapar foi corrigido (podia permitir HTML/script injetado num link
  malicioso), e o link de edição do Checklist deixa de ficar guardado
  no histórico do browser depois de usado.

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
- **"Guardar"**, em cada página, envia o que já foi preenchido (campos e
  fotos, incluindo os de páginas anteriores) para um **rascunho no
  servidor** — não precisa de chegar ao fim nem de manter o browser
  aberto. Ao voltar a abrir o separador Checklist (mesmo noutro
  dispositivo), aparece um aviso **"Checklist(s) em curso"** com botões
  **Retomar** (preenche tudo de novo, incluindo as fotos já guardadas) e
  **Descartar** (apaga o rascunho). Só o **"Enviar"** da última página
  grava o checklist definitivamente (Sheet + Drive, com número de
  checklist e PDF) e apaga o rascunho correspondente. Para corrigir algo
  DEPOIS de já ter enviado, use o link de edição que chega por e-mail
  (ver abaixo) — não é preciso recomeçar do zero.
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
   ecrã. **As cores são exatamente as mesmas da aplicação** (texto
   principal `#1f2937`, código DP a cinza `#5f6b7a`) — não se usam
   "Título 1/2" do Google Docs (que trariam a cor de tema do Docs),
   nem nenhuma cor nova; é deliberadamente o mesmo visual simples do
   formulário, sem alterações.
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

### Histórico de checklists enviados

Dentro de **✅ Checklist**, há agora uma terceira aba, **"Histórico"**,
com a lista de todos os checklists já enviados (Grupos e Ciclos
juntos):

- Filtros por tipo (Todos/Grupos/Ciclos) e uma caixa para "Mostrar só
  com não conformidade".
- Pesquisa por texto (número de série, equipamento ou número do
  checklist).
- Cada item mostra o número do checklist, número de série, equipamento,
  data de envio e um aviso vermelho se houve não conformidade.
- Botão **"Ver / Editar"** — reabre esse checklist preenchido (igual ao
  link que chega por e-mail).
- Botão **"PDF"** — gera e descarrega de novo o PDF desse checklist, a
  qualquer momento (não precisa de ir à caixa de correio procurar o
  e-mail original).

### Leitor de código QR no Checklist

Na página 1 de ambos os formulários (Grupos e Ciclos), junto ao campo
"Nº Série", há agora também o botão **"📷 Ler código QR"** — a mesma
câmara/alternativa já usada em Relatórios e Controlo de Produção, para
preencher o número de série lendo uma etiqueta QR em vez de escrever à
mão.

### Lembrete automático de checklists em falta

Se tiver o **"Envio automático de resumos"** ativado (dentro de
Controlo de Produção — ver "Já existe" acima), de cada vez que esse
envio agendado correr, a aplicação verifica também se há máquinas
marcadas como **"Terminado"** há pelo menos 2 dias que **ainda não
têm nenhum checklist de produção enviado** com o mesmo número de
série. Se houver, envia um e-mail extra (para os mesmos destinatários
configurados) a listar essas máquinas, e um alerta por WhatsApp (se
configurado). Este lembrete usa o mesmo agendamento do resumo — não há
uma configuração própria separada; se quiser um horário diferente só
para isto, diga-me e eu acrescento essa opção.

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
