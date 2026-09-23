# Controlo de Produção — Cablotec

Aplicação separada do "Relatório de Testes", para acompanhar números de série em produção por etapa (Grupos e Ciclos). Liga-se ao script de relatórios de forma solta: usa o mesmo número de série como identificador comum, e mostra um atalho para procurar as fotos/relatórios desse número de série no Drive.

## O que guarda

Duas abas na própria Google Sheet (`Grupos` e `Ciclos`), uma linha por número de série:

- Grupo/Tipo, Estado geral (Em curso / Terminado), Em atraso (calculado automaticamente a partir da Previsão de saída)
- Previsão de saída, Data de entrega
- Materiais em falta, Materiais entregues
- Números de série anteriores (histórico, quando o número é mudado)
- 13 etapas de produção, cada uma com a data em que foi concluída: Preparação, Embalamento, Desmontagem, Montagem, Intervenção extra, Corte de tubo, Montagem e soldadura HVAC, Eletrificação do grupo, Eletrificação do quadro, Isolamento, Teste elétrico, Teste de pressão, Teste de vácuo

## Como configurar

1. Crie uma **Google Sheet nova e vazia** (esta é diferente da app de relatórios — este script fica ligado à própria folha de cálculo).
2. Nessa folha, vá a **Extensões → Apps Script**.
3. Apague o conteúdo de `Código.gs` e cole o conteúdo de `Code.gs` deste projeto.
4. Crie um ficheiro novo do tipo **HTML**, chamado exatamente `Index`, e cole o conteúdo de `Index.html`.
5. (Opcional) Em `Code.gs`, confirme `FOLDER_ID_RELATORIOS` e `APPS_SCRIPT_URL_RELATORIOS` — já vêm preenchidos com o ID da pasta e o URL `/exec` do script de "Relatório de Testes", para os atalhos e a contagem de fotos funcionarem. Deixe `''` em qualquer um dos dois se não quiser essa ligação.
6. **Implementar → Nova implementação → Aplicação Web**. Executar como "Eu", acesso "Qualquer pessoa" (ou conforme a política da empresa).
7. Depois de implementar, abra o editor, escolha a função `doGet` no menu de funções e clique em **Executar** uma vez — isto pede a autorização completa (folha de cálculo, e-mail, Drive, gatilhos). Aceite tudo, incluindo o aviso "app não verificada" → Avançado → Aceder.
8. Volte a **Implementar → Gerir implementações → editar (lápis) → Nova versão → Implementar**, para a autorização ficar ativa no link `/exec`.
9. Guarde o URL `/exec` gerado — é o link da aplicação.
10. Para atualizações futuras: depois de colar alterações nos ficheiros, repita o passo 8 (Nova versão), para o mesmo link ficar atualizado.

## Exportações

O botão "Enviar resumo (Excel + PDF)" exporta o estado atual completo da aba selecionada (Grupos ou Ciclos) diretamente da Google Sheet, em `.xlsx` e `.pdf`, e envia por e-mail em anexo. Não é preciso nenhuma configuração extra — usa a própria folha como fonte de dados.

## Envio automático

No card "Envio automático de resumos", ative o interruptor, indique os e-mails e escolha quando enviar:

- **Todos os dias**, a uma hora à escolha.
- **Toda a semana**, num dia e hora à escolha (ex.: toda sexta-feira às 17h).
- **Uma única vez**, numa data e hora exatas (ex.: só amanhã às 9h) — depois de disparar, desativa-se sozinho.

Isto cria um gatilho (trigger) no Apps Script que corre sozinho, sem precisar de ter a página aberta, e envia o resumo de Grupos e de Ciclos (Excel + PDF) automaticamente. Para desativar antes da hora, desligue o interruptor e guarde outra vez.

## Materiais por modelo (elétrica e frio)

Dentro de cada registo, depois de escolher o Grupo/Tipo, aparecem duas tabelas — "Materiais — Parte elétrica" e "Materiais — Parte de frio" — com os materiais (código, descrição, quantidade) desse modelo. Esta estrutura é **permanente por modelo** (fica guardada numa aba `MateriaisPadrao`, partilhada por todos os números de série desse Grupo/Tipo): ao identificar o modelo, a tabela já aparece preenchida automaticamente; adicionar ou remover um material ali atualiza logo a estrutura desse modelo para sempre (não é só para aquele número de série). Para começar, adicione os materiais uma vez por modelo — nos números de série seguintes desse mesmo modelo, a tabela já vem pronta.

## Resumo geral (dashboard)

No topo da página, o card "Resumo geral" mostra, para Grupos e para Ciclos, quantos números de série estão em curso, terminados e em atraso — atualiza-se sozinho sempre que muda de aba ou guarda um registo.

## Dias em produção

Cada registo mostra há quantos dias está em produção (calculado a partir da data de criação), tanto no ecrã do registo como na lista de números de série.

## Notas por etapa

Ao lado de cada etapa há um botão "📝" que mostra um campo de texto curto, para registar o motivo se uma etapa ficar bloqueada ou tiver alguma observação. A nota fica guardada junto com a data de conclusão da etapa.

## Ligação com o script de relatórios

Além do atalho para o Drive, o formulário pergunta ao script de "Relatório de Testes" (via `APPS_SCRIPT_URL_RELATORIOS`) quantas fotos/relatórios já existem para o número de série aberto, e mostra isso por baixo do atalho. Continua a ser uma ligação solta — não há sincronização de dados entre os dois scripts, só esta consulta.

## Mudar número de série

Use apenas em último caso (ex.: engano na etiquetagem). O número antigo fica guardado no histórico do registo, não se perde.
