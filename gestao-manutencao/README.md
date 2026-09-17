# Gestão de Manutenção — Eletrificação &amp; Refrigeração

Web app para uma equipa de 4 técnicos responsáveis pela eletrificação
(trocas de grupos/quadros elétricos, ciclos) e pela refrigeração de uma
linha de produção. Acessível de qualquer lugar (telemóvel, tablet,
computador) através de um URL do Google Apps Script — não precisa de
servidor próprio nem de configuração de base de dados.

## O que faz

- **Painel** — contadores de tarefas pendentes/em curso/concluídas e
  últimos alarmes de temperatura.
- **Tarefas** — criar e acompanhar tarefas (troca de grupo/quadro,
  ciclo, refrigeração, outro), atribuídas a um técnico, com estado
  (Pendente / Em curso / Concluída).
- **Equipamentos** — registo dos grupos, quadros elétricos, câmaras e
  outros equipamentos, por tipo (Elétrico / Refrigeração).
- **Refrigeração** — histórico de leituras de temperatura por
  equipamento, com marcação de alarme.
- **Armazém** — stock de materiais elétricos e de refrigeração (nome,
  categoria, unidade, stock atual e stock mínimo). Cada consumo ou
  reposição é registado como um movimento (Entrada/Saída) com uma
  operação associada — *Corte de tubo de cobre*, *Dobra de tubo de
  cobre*, *Soldadura*, *Reposição de stock* ou *Outro* — que atualiza
  automaticamente o stock atual do material. O Painel mostra os
  materiais que já estão no stock mínimo ou abaixo dele.
- **Equipa** — gerir os técnicos (por defeito pensado para 4 pessoas,
  mas sem limite fixo).

Todos os dados ficam numa Google Sheet criada automaticamente (uma
folha por tipo de dado), o que permite também consultar/editar os
dados diretamente na própria Sheet se for preciso.

Ficheiros:

- `Index.html` — frontend (SPA com 6 separadores).
- `Code.gs` — backend em Google Apps Script (cria a Sheet de dados na
  primeira execução e expõe funções chamadas via `google.script.run`).

## Passo 1 — Criar o projeto no Apps Script

1. Aceda a [script.google.com](https://script.google.com) → **Novo projeto**.
2. Apague o conteúdo de `Code.gs` por defeito e cole o conteúdo do
   ficheiro `Code.gs` deste repositório.
3. Crie um novo ficheiro HTML (menu **+** → **HTML**) chamado `Index`
   e cole o conteúdo do ficheiro `Index.html` deste repositório.

Não é preciso criar nenhuma Sheet nem copiar IDs — na primeira vez que
a app for aberta, o `Code.gs` cria automaticamente uma Google Sheet
chamada **"Gestão de Manutenção - Dados"** e guarda o ID internamente.

## Passo 2 — Publicar como Aplicação Web

1. No editor, clique em **Implementar → Nova implementação**.
2. Tipo: **Aplicação Web**.
3. Descrição: `Gestão de Manutenção`.
4. **Executar como**: Eu (a sua conta).
5. **Quem tem acesso**: escolha consoante o caso —
   - **Qualquer pessoa com uma Conta Google** (recomendado, para a
     equipa autenticar) ou
   - **Qualquer pessoa** (mais simples, sem login, mas menos seguro).
6. Clique em **Implementar** e autorize as permissões pedidas (acesso
   ao Google Sheets/Drive para criar e ler a folha de dados). Se
   aparecer o aviso "O Google não verificou esta aplicação", clique em
   **Avançado → Ir para... (não seguro) → Permitir**.
7. Copie o **URL da Aplicação Web** (termina em `/exec`).

## Passo 3 — Usar

1. Partilhe o URL `/exec` com a equipa (funciona em qualquer
   telemóvel/computador com internet e browser).
2. Na primeira utilização, vá ao separador **Equipa** e adicione os 4
   técnicos.
3. Vá ao separador **Equipamentos** e registe os grupos/quadros
   elétricos e os equipamentos de refrigeração.
4. Vá ao separador **Armazém** e registe os materiais (elétricos, de
   refrigeração e consumíveis como tubo de cobre e solda), com o
   stock inicial e o stock mínimo desejado.
5. A partir daí, use **Tarefas** para trocas de grupos/quadros e
   ciclos, **Refrigeração** para o registo de temperaturas e
   **Armazém** para registar cada consumo (corte/dobra de tubo,
   soldadura, etc.) ou reposição de stock.

> Como o `doGet` do `Code.gs` já serve o `Index.html`, basta abrir o
> URL `/exec` diretamente — sem necessidade de alojar o frontend noutro
> sítio nem de lidar com CORS.

## Notas

- **Concorrência**: o Google Apps Script serializa bem escritas
  simultâneas numa Sheet para o volume de uma equipa pequena (4
  pessoas); não é uma base de dados de alta concorrência.
- **Auditoria**: como os dados ficam numa Sheet normal, pode sempre
  abrir "Gestão de Manutenção - Dados" no Google Drive para consultar,
  filtrar ou exportar o histórico.
- **Sem internet**: tal como qualquer app Apps Script, precisa de
  ligação à internet — os dados ficam na cloud da Google.
