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
- **4 formatos**: Cartão de Visita (frente/verso), Post Instagram, Story e Flyer A5 — a mesma
  identidade visual do modelo se adapta a cada formato.
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
  stripe-webhook.js           Confirma o pagamento e cria a encomenda na Gelato
  order-status.js             Consulta o estado de uma encomenda (usado por pedido-confirmado.html)
  lib/{supabase,gelato,price}.js   Helpers dos três serviços externos
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

## Monetização: cartões impressos (Stripe + Supabase + Gelato)

No formato "Cartão de Visita", o editor mostra um botão **"Comprar cartões impressos"** que
abre um checkout: o cliente escolhe quantidade e morada, paga via Stripe, e o pedido é
enviado automaticamente para impressão e envio pela [Gelato](https://gelato.com) (rede de
impressão sob encomenda com API pública, print-on-demand local ao destinatário).

```
Cliente preenche morada → gera PNG do cartão no browser
  → POST /api/create-checkout-session
       (sobe o PNG para o Supabase Storage, grava a encomenda como "pending_payment",
        cria uma Stripe Checkout Session)
  → cliente paga na página da Stripe
  → Stripe chama /api/stripe-webhook (checkout.session.completed)
       (marca a encomenda como "paid", chama a Gelato Order API, marca "sent_to_print")
  → pedido-confirmado.html faz polling a /api/order-status até mostrar o estado final
```

### Pôr a funcionar

Isto deixa de ser só ficheiros estáticos: precisa de hosting com funções serverless. O caminho
mais simples (tudo com plano gratuito para começar):

1. **Cria as contas**: [Stripe](https://dashboard.stripe.com) (modo de teste já chega para
   validar o fluxo), [Supabase](https://supabase.com) e [Gelato](https://dashboard.gelato.com).
2. **Supabase**: cria um projeto, corre `supabase/schema.sql` no SQL Editor, e cria um bucket
   de Storage público chamado `print-files` (Storage → New bucket).
3. **Gelato**: confirma o `productUid` exato do cartão de visita que queres vender — usa a tua
   API key da Gelato para chamar `GET https://product.gelatoapis.com/v3/products:search`
   (filtra por "business card" no tamanho/acabamento desejado) e copia o `productUid`
   devolvido. **Não uses o valor em `.env.example` sem confirmar** — é só um placeholder.
4. **Preço**: define `PRICE_TABLE` no `.env` só depois de saberes o custo real da Gelato
   (impressão + envio) para o destino que vais vender — os valores de exemplo não são reais.
5. **Deploy**: importa este repositório na [Vercel](https://vercel.com) (deteta o `/api`
   automaticamente como funções serverless e serve o resto como site estático), copia
   `.env.example` para as variáveis de ambiente do projeto na Vercel com os valores reais.
6. **Webhook da Stripe**: no dashboard da Stripe, cria um endpoint de webhook apontando para
   `https://<o-teu-domínio>/api/stripe-webhook`, subscrito ao evento `checkout.session.completed`,
   e copia o "Signing secret" para `STRIPE_WEBHOOK_SECRET`.

### Limitações

- Preços e o `productUid` da Gelato em `.env.example` são **placeholders**, não valores
  verificados — confirma-os antes de aceitar pagamentos reais.
- Sem reconciliação automática: se a chamada à Gelato falhar depois do pagamento já cobrado
  (ex: API fora do ar), a encomenda fica marcada `failed` com o erro em `orders.error_message`
  — precisa de resolução manual (reprocessar ou reembolsar pelo dashboard da Stripe).
- Sem envio de e-mail de confirmação próprio: depende dos recibos automáticos da Stripe.
