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
index.html   Estrutura da página (hero, categorias, editor, projetos, como funciona)
style.css    Tema da aplicação + sistema de "art board" (cartão/anúncio) themeable via
             CSS custom properties (--tpl-primary, --tpl-bg, --tpl-text, --tpl-icon, ...)
app.js       CATEGORIES / TEMPLATES / FORMATS (dados) + estado do editor + renderização do
             board (frente/verso do cartão ou anúncio) + projetos (localStorage) + exportação
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
