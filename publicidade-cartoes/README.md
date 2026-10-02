# UniAds Studio

Gerador de cartões de visita e artes publicitárias para múltiplos segmentos de negócio
(companhias aéreas, casamentos, restaurantes, imobiliárias, beleza, tecnologia, eventos,
saúde, automotivo, educação, moda e corporativo/advocacia). App estática (HTML/CSS/JS puro,
sem build), pensada para abrir direto no navegador ou publicar em GitHub Pages.

## Rodar localmente

```sh
cd publicidade-cartoes
python3 -m http.server 8080   # ou qualquer servidor estático
```

Abra `http://localhost:8080`. Não precisa de `npm install`: é HTML/CSS/JS puro.

## O que dá para fazer

- **12 segmentos, 24 modelos**: cada segmento (`Companhias Aéreas`, `Casamentos`,
  `Restaurantes & Gastronomia`, `Imobiliárias`, `Beleza & Estética`, `Tecnologia & Startups`,
  `Eventos & Festas`, `Saúde & Bem-estar`, `Automotivo`, `Educação`, `Moda`,
  `Corporativo & Advocacia`) traz 2 modelos com paleta, layout e ícone próprios.
- **5 formatos**: Cartão de Visita (frente/verso), Post Instagram, Story, Flyer A5 e Convite —
  a mesma identidade visual do modelo se adapta a cada formato. No Convite, os campos do
  editor são reaproveitados com outro significado (Nome → Título do convite, Cargo → Data e
  hora, Endereço → Local do evento, etc.), sem precisar de um formulário à parte.
- **Editor ao vivo**: nome, cargo, empresa, slogan, telefone, e-mail, site, rede social e
  endereço atualizam a pré-visualização em tempo real; logotipo por upload (substitui o ícone
  do segmento) e cores primária/secundária personalizáveis por cima da paleta do modelo.
- **Exportar**: PNG em alta resolução (via `html2canvas`, carregado por CDN — precisa de
  internet) ou impressão direta do navegador.
- **Meus Projetos**: salvar, editar, duplicar e excluir projetos — persistidos no
  `localStorage` do navegador (nada é enviado a um servidor).

## Arquitetura

```
index.html              Estrutura da página (hero, categorias, editor, projetos, checkout)
style.css               Tema da aplicação + sistema de "art board" (cartão/anúncio) themeable
                        via CSS custom properties (--tpl-primary, --tpl-bg, --tpl-icon, ...)
app.js                  CATEGORIES / TEMPLATES / FORMATS (dados) + estado do editor +
                        renderização do board + projetos (localStorage) + exportação + checkout
pedido-confirmado.html  Página de retorno do Stripe Checkout (consulta /api/order-status)
api/
  create-checkout-session.js  Recebe o design, grava a encomenda, cria a Stripe Checkout Session
  stripe-webhook.js           Confirma o pagamento; imprime na Gelato OU entrega o digital
  order-status.js             Consulta o estado de uma encomenda (usado por pedido-confirmado.html)
lib/{supabase,gelato,price,email}.js   Helpers dos serviços externos — fora de api/ de propósito:
                        a Vercel trata cada ficheiro dentro de api/ como uma função serverless
                        separada (limite de 12 no plano Hobby), por isso código partilhado que
                        não é um endpoint fica em lib/ na raiz, nunca dentro de api/.
supabase/schema.sql     Tabela `orders` (ver secção de monetização abaixo)
```

Cada modelo combina um `layout` (`split` | `topbar` | `diagonal` | `frame` | `centered`) com
um `pattern` de fundo (`none` | `diagonal` | `dots` | `grid` | `carbon` | `confetti`) e uma
paleta de cores — a mesma malha de CSS é reaproveitada por todos os 24 modelos, então cores e
textos personalizados no editor não quebram o layout. Modelos com fundo escuro (`Tech Mono`,
`Carbon Speed`, `Bistrô Noir`, `Editorial Preto`) e os que usam uma cor de fundo diferente no
verso do cartão (`Skyline Azul`, `Festa Vibrante`) definem `iconAccent`/`textBack` no próprio
template para garantir contraste — ver `TEMPLATES` em `app.js`.

## O que NÃO dá para fazer (e por quê)

- **Exportação em PNG depende de internet**: `html2canvas` é carregado via CDN
  (cdnjs.cloudflare.com); sem conexão, o botão "Baixar PNG" avisa e sugere usar "Imprimir".
- **Projetos não sincronizam entre dispositivos**: ficam só no `localStorage` do navegador
  onde foram salvos — não há backend nem conta de usuário.

## Monetização: cartões e convites, impressos ou digitais (Stripe + Supabase + Gelato)

Nos formatos "Cartão de Visita" e "Convite", o editor mostra um botão **"Comprar"** que abre
um checkout. No Convite, o cliente escolhe primeiro a **entrega**:

- **Impresso**: escolhe uma quantidade pequena (5, 10, 20, 50 ou 100 unidades — convites não
  se vendem às centenas como cartões) e a morada de envio; segue o mesmo caminho da Gelato.
- **Digital**: só pede o e-mail de contacto — sem morada, sem Gelato. O ficheiro gerado no
  browser é guardado no Supabase Storage e entregue por **download direto** (link na página
  de confirmação) e por **e-mail** (via Resend, se `RESEND_API_KEY` estiver configurada).

```
Cliente preenche morada (se impresso) → gera PNG do design no browser
  → POST /api/create-checkout-session
       (sobe o PNG para o Supabase Storage, grava a encomenda como "pending_payment",
        cria uma Stripe Checkout Session)
  → cliente paga na página da Stripe
  → Stripe chama /api/stripe-webhook (checkout.session.completed)
       → produto "convite-digital": marca "delivered" e envia o e-mail de entrega
       → produto "card" / "convite": marca "paid", chama a Gelato Order API, marca "sent_to_print"
  → pedido-confirmado.html faz polling a /api/order-status até mostrar o estado final
       (e, se digital, o botão de download)
```

### Pôr a funcionar

Isto deixa de ser só ficheiros estáticos: precisa de hosting com funções serverless. O caminho
mais simples (tudo com plano gratuito para começar):

1. **Cria as contas**: [Stripe](https://dashboard.stripe.com) (modo de teste já chega para
   validar o fluxo), [Supabase](https://supabase.com) e [Gelato](https://dashboard.gelato.com).
2. **Supabase**: cria um projeto, corre `supabase/schema.sql` no SQL Editor, e cria um bucket
   de Storage público chamado `print-files` (Storage → New bucket).
3. **Gelato**: confirma o `productUid` exato de cada produto físico que queres vender — usa a
   tua API key da Gelato para chamar `GET https://product.gelatoapis.com/v3/products:search`
   (filtra por "business card" para `GELATO_PRODUCT_UID`, ou por um postal/flyer A5-A6 para
   `GELATO_PRODUCT_UID_CONVITE`) e copia o `productUid` devolvido. **Não uses os valores em
   `.env.example` sem confirmar** — são só placeholders. "Convite digital" nunca passa pela
   Gelato, não precisa de nenhum UID.
4. **Preço**: define `PRICE_TABLE` no `.env` só depois de saberes o custo real da Gelato
   (impressão + envio) para o destino que vais vender — os valores de exemplo não são reais.
   O formato agora é `produto:quantidade:cêntimos` (ver comentário em `.env.example`).
5. **E-mail (opcional)**: cria uma conta em [Resend](https://resend.com) e configura
   `RESEND_API_KEY` se quiseres que o convite digital seja também enviado por e-mail (sem
   isto, a entrega continua a funcionar só por download).
6. **Deploy**: importa este repositório na [Vercel](https://vercel.com) (deteta o `/api`
   automaticamente como funções serverless e serve o resto como site estático), copia
   `.env.example` para as variáveis de ambiente do projeto na Vercel com os valores reais.
7. **Webhook da Stripe**: no dashboard da Stripe, cria um endpoint de webhook apontando para
   `https://<o-teu-domínio>/api/stripe-webhook`, subscrito ao evento `checkout.session.completed`,
   e copia o "Signing secret" para `STRIPE_WEBHOOK_SECRET`.

### Limitações

- Preços e os `productUid` da Gelato em `.env.example` são **placeholders**, não valores
  verificados — confirma-os antes de aceitar pagamentos reais.
- Sem reconciliação automática: se a chamada à Gelato falhar depois do pagamento já cobrado
  (ex: API fora do ar), a encomenda fica marcada `failed` com o erro em `orders.error_message`
  — precisa de resolução manual (reprocessar ou reembolsar pelo dashboard da Stripe).
- Sem envio de e-mail de confirmação próprio para cartões/convites impressos: depende dos
  recibos automáticos da Stripe. Só o convite digital tem e-mail próprio (via Resend).
