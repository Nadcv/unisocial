# Mercado Local — produtos locais e alugueres

Site estático (HTML + CSS + JavaScript, sem dependências nem build) para:

- **Vender produtos locais**: catálogo com pesquisa, filtro por categoria
  e ordenação por preço; carrinho; encomenda com recolha no mercado
  (grátis) ou entrega ao domicílio (3,50 €, grátis acima de 40 €). O stock
  é descontado a cada encomenda e reposto se ela for cancelada.
- **Reservar alugueres e equipamento**: alojamentos, espaços para eventos,
  transporte e ferramentas. Cada item tem um calendário com os dias
  ocupados; o cliente escolhe o início e o fim, vê o preço (preço/dia ×
  dias + caução) e envia o pedido. Não é possível reservar dias já
  ocupados nem datas passadas.
- **A minha conta**: com o email, o cliente vê as suas encomendas e
  reservas e pode cancelar reservas futuras.
- **Gestão**: resumo (vendas, receita de alugueres, pendentes, stock
  baixo, próximas reservas), mudar o estado de encomendas
  (Recebida → Preparada → Entregue / Cancelada) e reservas
  (Pendente → Confirmada → Concluída / Cancelada), e criar, editar ou
  apagar produtos e alugueres.

## Como usar

Abra `index.html` no navegador, ou sirva a pasta:

```bash
cd mercado-local
python3 -m http.server 8000
# http://localhost:8000
```

Para publicar, basta copiar a pasta para qualquer alojamento estático
(GitHub Pages, Netlify, etc.).

## Dados

Esta versão é uma demonstração: os dados ficam no `localStorage` do
navegador (cada visitante vê os seus próprios dados). Os produtos e
alugueres iniciais estão em `data.js`; em **Gestão → Repor dados de
demonstração** volta-se ao estado inicial.

Para uso real com vários clientes e um único painel de gestão, é
necessário ligar o site a um backend (por exemplo, Google Sheets via
Apps Script, como as outras apps deste repositório, ou Supabase/Firebase)
e a um meio de pagamento.

## Ficheiros

| Ficheiro     | Conteúdo                                        |
|--------------|-------------------------------------------------|
| `index.html` | Estrutura da página, carrinho e janela modal    |
| `styles.css` | Estilos (tema claro/escuro automático)          |
| `data.js`    | Produtos e alugueres de demonstração            |
| `app.js`     | Router, loja, reservas, conta e gestão          |
