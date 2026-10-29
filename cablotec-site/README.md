# Site Cablotec

Site institucional moderno para a Cablotec, Cablagens e Sistemas, Lda. É estático (HTML, CSS e JS) e não precisa de build: basta alojar a pasta em qualquer servidor web.

## Estrutura

| Ficheiro | Conteúdo |
|---|---|
| `index.html` | Página principal: hero, soluções, setores, processo, qualidade, I&D, empresa, pedido de orçamento |
| `styles.css` | Estilos, todos responsivos |
| `main.js` | Troca PT/EN, menu móvel, animações e formulário |
| `setores/*.html` | 6 páginas de setor em português (geradas) |
| `en/industries/*.html` | As mesmas 6 páginas em inglês (geradas) |
| `tools/setores.json` | **Textos das páginas de setor (PT e EN): edite aqui** |
| `tools/gerar_setores.py` | Gera as páginas de setor e o `sitemap.xml` |
| `privacidade.html` | Política de privacidade (texto-base a rever pelo jurídico) |
| `robots.txt`, `sitemap.xml` | SEO (o sitemap é gerado) |
| `assets/favicon.svg` | Ícone provisório |

## Ver localmente

```bash
cd cablotec-site && python3 -m http.server 8000
# abrir http://localhost:8000  (versão inglesa: ?lang=en)
```

## Editar as páginas de setor

Os textos estão todos em `tools/setores.json`. Depois de editar, corra:

```bash
python3 cablotec-site/tools/gerar_setores.py
```

Não edite os HTML de `setores/` e `en/industries/` à mão: são reescritos sempre que o script corre. Os botões "Pedir orçamento" das páginas de setor abrem o formulário da página inicial com o setor já escolhido (`?setor=ferroviario`).

## Antes de publicar

### 1. Formulário de orçamento
Em `main.js`, preencha `FORM_ENDPOINT` com um serviço que aceite anexos, por exemplo Formspree ou Getform, ou com um script próprio. Enquanto estiver vazio, o formulário abre o email do visitante com o pedido já escrito. Nesse caso os desenhos têm de ser anexados à mão.

### 2. Conteúdos a confirmar
O texto foi escrito a partir de informação pública: o site atual, LinkedIn, Kompass, Europages e AED Cluster. Confirme o seguinte:

- [ ] **Exportação:** o site diz "a maior parte da produção" é exportada. Algumas fontes indicam 80%. Se o número estiver certo, pode ser usado.
- [ ] **Certificação UL:** foi mencionada numa fonte, mas não está confirmada, por isso **não** foi incluída.
- [ ] **Normas nas páginas de setor:** a secção "Requisitos típicos do setor" cita normas do setor (EN 45545-2, EN 61373, EN 50155, IEC 60601-1, EN 61439, RoHS/REACH). O texto apresenta-as como requisitos a que os materiais e processos respondem conforme o projeto, não como certificações da Cablotec. Mesmo assim, a engenharia deve confirmar cada uma ou retirá-la em `tools/setores.json`.
- [ ] Normas a acrescentar se se aplicarem: IPC/WHMA-A-620, ISO 13485 (médico).
- [ ] Conectores MIL usados na prática (para eventualmente citar séries concretas, como MIL-DTL-38999).
- [ ] Membro da ANIMEE e do AED Cluster Portugal.
- [ ] Morada e código postal (2710-089 Sintra).
- [ ] "Rastreabilidade por lote" e "NDA a pedido" (secções de qualidade e orçamento).
- [ ] Datas intermédias da cronologia (secção Empresa). Hoje o marco intermédio aparece como "—".
- [ ] Logótipo oficial: o símbolo atual é provisório e deve ser substituído pelo vetor da marca.

### 3. Fotografias
O site usa ilustrações vetoriais. Recomenda-se substituí-las ou complementá-las com fotografias reais da fábrica, das máquinas de cravação e injeção, dos moldes e dos bancos de teste.

### 4. RGPD
As fontes vêm do Google Fonts. Para cumprir o RGPD na íntegra, aloje as fontes no próprio servidor (Inter Tight e IBM Plex Mono, ambas de licença livre).

## Próximos passos sugeridos
- Casos de estudo (com fotografias) em cada página de setor.
- Passar também a página inicial para URLs separados por idioma (`/en/`), como as páginas de setor.
- Página de certificados com os PDFs para descarregar.
