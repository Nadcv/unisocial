# Mercado Local — produtos locais e alugueres

Site para:

- **Vender produtos locais**: catálogo com pesquisa, filtro por categoria
  e ordenação por preço; carrinho; encomenda com recolha no mercado
  (grátis) ou entrega ao domicílio (3,50 €, grátis acima de 40 €). O stock
  é descontado a cada encomenda e reposto se ela for cancelada.
- **Reservar alugueres e equipamento**: alojamentos, espaços para eventos,
  transporte e ferramentas. Cada item tem um calendário com os dias
  ocupados; o cliente escolhe o início e o fim, vê o preço (preço/dia ×
  dias + caução) e envia o pedido. Não é possível reservar dias já
  ocupados nem datas passadas.
- **A minha conta**: com o email e a referência de uma encomenda ou
  reserva, o cliente vê o seu histórico e pode cancelar reservas futuras.
- **Gestão** (protegida por palavra-passe): resumo (vendas, receita de
  alugueres, pendentes, stock baixo, próximas reservas), estado das
  encomendas (Recebida → Preparada → Entregue / Cancelada) e reservas
  (Pendente → Confirmada → Concluída / Cancelada), e criar, editar ou
  apagar produtos e alugueres.

Funciona de duas formas, com o mesmo código:

| Modo | Onde ficam os dados | Para quê |
|------|---------------------|----------|
| **Google Sheets** (Apps Script) | Numa Google Sheet partilhada por todos os visitantes | Uso real |
| **Demonstração** (abrir `index.html`) | No `localStorage` de cada navegador | Experimentar / desenvolver |

## Publicar com Google Sheets

Tal como as outras apps deste repositório, o site é servido pelo Google
Apps Script. Não é preciso servidor próprio nem criar a Sheet à mão.

### Passo 1 — Criar o projeto

1. Aceda a [script.google.com](https://script.google.com) → **Novo projeto**
   e dê-lhe o nome `Mercado Local`.
2. Substitua o conteúdo de `Code.gs` pelo de
   [`apps-script/Code.gs`](apps-script/Code.gs).
3. Crie mais dois ficheiros de script (**+** → **Script**) chamados
   `Core` e `Dados`, e cole neles
   [`apps-script/Core.gs`](apps-script/Core.gs) e
   [`apps-script/Dados.gs`](apps-script/Dados.gs).
4. Crie um ficheiro HTML (**+** → **HTML**) chamado `Index` e cole
   [`apps-script/Index.html`](apps-script/Index.html).

### Passo 2 — Palavra-passe da Gestão

1. No editor, abra **Definições do projeto** (⚙️) → **Propriedades do
   script** → **Adicionar propriedade do script**.
2. Propriedade: `ADMIN_PASSWORD`; valor: a palavra-passe que quiser para
   a área de Gestão.

Sem esta propriedade a loja funciona, mas a Gestão fica bloqueada. Após
10 tentativas falhadas, a entrada é bloqueada durante 15 minutos.

### Passo 3 — Criar a Sheet

1. No editor, escolha a função `configurar` e clique em **▶ Executar**.
2. Autorize as permissões pedidas. Se aparecer "O Google não verificou
   esta aplicação", clique em **Avançado → Aceder a Mercado Local (não
   seguro) → Permitir**.
3. No **Registo de execução** aparece o link da Google Sheet
   **"Mercado Local - Dados"**. Ela já vem com os produtos e alugueres de
   exemplo de `data.js`.

### Passo 4 — Publicar como Aplicação Web

1. **Implementar → Nova implementação** → tipo **Aplicação Web**.
2. **Executar como**: Eu. **Quem tem acesso**: **Qualquer pessoa**
   (os clientes não precisam de conta Google).
3. Clique em **Implementar** e copie o URL que termina em `/exec`. Esse
   é o endereço do site.

Depois de alterar o código, use **Implementar → Gerir implementações →
✏️ → Versão: Nova versão** para manter o mesmo URL.

### A Google Sheet

Tem quatro folhas: **Produtos**, **Alugueres**, **Reservas** e
**Encomendas**. Pode consultar, filtrar e exportar diretamente na Sheet.
Também pode editar produtos e alugueres lá (preços, stock, textos), desde
que não altere a linha de cabeçalho nem a coluna `id`. Encomendas e
reservas devem ser geridas pelo site, para que o stock e o calendário
fiquem coerentes.

Todas as escritas correm com um bloqueio (`LockService`), por isso dois
clientes em simultâneo não conseguem comprar o mesmo stock nem reservar os
mesmos dias. Preços, totais e disponibilidade são sempre calculados no
servidor, nunca no navegador.

## Modo demonstração

Abra `index.html` no navegador, ou sirva a pasta:

```bash
cd mercado-local
python3 -m http.server 8000
# http://localhost:8000
```

A Gestão não pede palavra-passe e tem um botão **Repor dados de
demonstração**.

## Desenvolvimento

| Ficheiro | Conteúdo |
|----------|----------|
| `index.html` | Estrutura da página, carrinho e janela modal |
| `styles.css` | Estilos (tema claro/escuro automático) |
| `data.js` | Produtos e alugueres iniciais |
| `core.js` | Regras de negócio (stock, preços, reservas, estados), usadas no navegador e no Apps Script |
| `app.js` | Interface; usa `google.script.run` quando servido pelo Apps Script, senão `localStorage` |
| `apps-script/Code.gs` | Backend: leitura/escrita da Google Sheet e funções `api*` |
| `build-apps-script.mjs` | Gera `apps-script/Index.html`, `Core.gs` e `Dados.gs` |

Os ficheiros `apps-script/Index.html`, `Core.gs` e `Dados.gs` são
gerados. Depois de alterar `index.html`, `styles.css`, `core.js`,
`app.js` ou `data.js`, execute:

```bash
node build-apps-script.mjs
```

e volte a colar os ficheiros alterados no Apps Script.

## Limitações

- Não há pagamento online: a encomenda indica pagamento na entrega ou na
  recolha.
- Não são enviados emails de confirmação. O cliente guarda a referência
  mostrada no ecrã.
- A Google Sheet é adequada para um mercado local (dezenas de pedidos por
  dia), não para grande volume.
