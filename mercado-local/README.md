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
- **Pagamento online** (opcional, via [Stripe](https://stripe.com)): cartão,
  MB WAY, Multibanco, Apple Pay e Google Pay. O cliente pode sempre
  escolher pagar na entrega/recolha ou no levantamento.
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

### Passo 5 (opcional) — Pagamento online com Stripe

1. Crie uma conta em [stripe.com](https://stripe.com) e ative-a para
   Portugal. Em **Definições → Métodos de pagamento**, ative os métodos
   que quer aceitar (Cartões, **MB WAY**, **Multibanco**, Apple Pay,
   Google Pay).
2. Em **Programadores → Chaves de API**, copie a **chave secreta**
   (`sk_test_…` para testes, `sk_live_…` para pagamentos reais).
3. No Apps Script, adicione a propriedade do script `STRIPE_SECRET_KEY`
   com essa chave.
4. Volte a executar a função `configurar`. Ela valida a chave e cria um
   acionador que verifica os pagamentos pendentes a cada 10 minutos.

Comece com a chave `sk_test_…` e o cartão de teste `4242 4242 4242 4242`
(qualquer data futura e CVC). Quando tudo estiver a funcionar, troque
pela chave `sk_live_…`.

Como funciona:

- **Ao encomendar ou reservar com "Pagar agora online"**, o stock ou as
  datas ficam guardados e o cliente é encaminhado para a página segura do
  Stripe. O site nunca vê nem guarda dados de cartões.
- **Quando o cliente volta ao site**, o servidor pergunta ao Stripe se o
  pagamento foi feito. A confirmação nunca vem do navegador. Se foi pago,
  a encomenda passa a **Recebida** (reservas: **Pendente**, à espera da
  confirmação do proprietário).
- **Se o cliente desistir ou não pagar em 30 minutos**, a encomenda ou
  reserva é anulada e o stock e as datas ficam de novo livres.
- **Multibanco**: o cliente recebe uma referência e pode pagar mais
  tarde. O acionador de 10 minutos confirma o pagamento quando chegar.
  Enquanto isso, a encomenda fica em **Aguarda pagamento**.
- **Reembolsos automáticos**: se a Gestão cancelar uma encomenda ou
  reserva paga online, ou se o cliente cancelar uma reserva paga, o valor
  é devolvido pelo Stripe. Se o reembolso falhar, o cancelamento não é
  gravado e aparece o erro.
- **Alugueres**: online paga-se o aluguer. A caução é paga no
  levantamento.
- **Taxas**: o Stripe cobra uma comissão por pagamento. Consulte os
  valores em vigor em [stripe.com/pt/pricing](https://stripe.com/pt/pricing).

Na Sheet, as folhas **Encomendas** e **Reservas** têm as colunas
`pagamento` (Na entrega / Pendente / Pago / Não pago / Reembolsado),
`pagamentoId` (sessão do Stripe) e `pagamentoRef` (pagamento no Stripe,
para o encontrar no painel).

Se o endereço de retorno do Stripe não for o URL `/exec` da aplicação,
defina a propriedade `APP_URL` com o URL correto.

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
demonstração**. O pagamento online é simulado: não é feita nenhuma
cobrança.

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

- Não são enviados emails de confirmação. O cliente guarda a referência
  mostrada no ecrã.
- A Google Sheet é adequada para um mercado local (dezenas de pedidos por
  dia), não para grande volume.
