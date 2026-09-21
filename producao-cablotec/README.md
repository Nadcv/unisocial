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
5. (Opcional) Em `Code.gs`, confirme que `FOLDER_ID_RELATORIOS` tem o ID da pasta do Drive usada pelo script de "Relatório de Testes" (já vem preenchido com o mesmo ID usado nesse script). Deixe `''` se não quiser o atalho.
6. **Implementar → Nova implementação → Aplicação Web**. Executar como "Eu", acesso "Qualquer pessoa" (ou conforme a política da empresa). Autorize as permissões pedidas (inclui acesso à folha de cálculo e a enviar e-mail).
7. Guarde o URL `/exec` gerado — é o link da aplicação.
8. Para atualizações futuras: depois de colar alterações nos ficheiros, vá a **Implementar → Gerir implementações → editar (lápis) → Nova versão → Implementar**, para o mesmo link ficar atualizado.

## Exportações

O botão "Enviar resumo (Excel + PDF)" exporta o estado atual completo da aba selecionada (Grupos ou Ciclos) diretamente da Google Sheet, em `.xlsx` e `.pdf`, e envia por e-mail em anexo. Não é preciso nenhuma configuração extra — usa a própria folha como fonte de dados.

## Mudar número de série

Use apenas em último caso (ex.: engano na etiquetagem). O número antigo fica guardado no histórico do registo, não se perde.
