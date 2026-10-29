#!/usr/bin/env python3
"""Gera as páginas de setor (PT e EN) a partir de tools/setores.json.

Uso:  python3 tools/gerar_setores.py
Edite os textos em setores.json e volte a correr o script; não edite os HTML
gerados em setores/ e en/industries/ à mão.
"""
import json
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://www.cablotec.com"
DATA = json.loads((ROOT / "tools" / "setores.json").read_text(encoding="utf-8"))
C = DATA["common"]
SECTORS = DATA["sectors"]

ANCHORS = ["solucoes", "setores", "processo", "qualidade", "empresa", "contactos"]

LOGO = (
    '<svg class="brand-mark" viewBox="0 0 40 40" aria-hidden="true">'
    '<rect x="1" y="1" width="38" height="38" rx="9" fill="currentColor"/>'
    '<path d="M28 13.5a9 9 0 1 0 0 13" fill="none" stroke="var(--copper)" stroke-width="3.2" stroke-linecap="round"/>'
    '<circle cx="28" cy="13.5" r="2.6" fill="var(--copper)"/><circle cx="28" cy="26.5" r="2.6" fill="var(--copper)"/></svg>'
)


def paths(lang):
    """Prefixo até à raiz, URL da home e caminho público de um setor."""
    if lang == "pt":
        return "../", "../index.html", lambda s: f"setores/{s['pt_slug']}.html"
    return "../../", "../../index.html?lang=en", lambda s: f"en/industries/{s['en_slug']}.html"


def ul(items, cls="checks"):
    return f'<ul class="{cls}">' + "".join(f"<li>{escape(i)}</li>" for i in items) + "</ul>"


def page(sector, lang):
    t, s = C[lang], sector[lang]
    up, home, url_of = paths(lang)
    other = "en" if lang == "pt" else "pt"
    o_url_of = paths(other)[2]
    pt_url, en_url = f"{SITE}/setores/{sector['pt_slug']}.html", f"{SITE}/en/industries/{sector['en_slug']}.html"
    canonical = pt_url if lang == "pt" else en_url
    self_href, alt_href = up + url_of(sector), up + o_url_of(sector)
    pt_href, en_href = (self_href, alt_href) if lang == "pt" else (alt_href, self_href)
    sep = "&" if "?" in home else "?"
    quote = f"{home}{sep}setor={sector['pt_slug']}#orcamento"
    nav = "".join(f'<a href="{home}#{a}">{escape(n)}</a>' for a, n in zip(ANCHORS, t["nav"]))
    others = "".join(
        f'<a class="other" href="{up}{url_of(x)}"><span class="tag">{x["tag"]}</span>{escape(x[lang]["name"])}</a>'
        for x in SECTORS if x is not sector
    )
    highlight = f'<p class="callout">{escape(s["highlight"])}</p>' if s["highlight"] else ""
    breadcrumbs = json.dumps({
        "@context": "https://schema.org", "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": t["home"], "item": SITE + ("/" if lang == "pt" else "/?lang=en")},
            {"@type": "ListItem", "position": 2, "name": t["sectors"], "item": SITE + ("/#setores" if lang == "pt" else "/?lang=en#setores")},
            {"@type": "ListItem", "position": 3, "name": s["name"], "item": canonical},
        ],
    }, ensure_ascii=False)

    return f"""<!doctype html>
<html lang="{'pt-PT' if lang == 'pt' else 'en'}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{escape(s['title'])} | Cablotec</title>
  <meta name="description" content="{escape(s['desc'])}">
  <link rel="canonical" href="{canonical}">
  <link rel="alternate" hreflang="pt-PT" href="{pt_url}">
  <link rel="alternate" hreflang="en" href="{en_url}">
  <meta name="theme-color" content="#0d1b2a">
  <meta property="og:type" content="website">
  <meta property="og:title" content="{escape(s['title'])} | Cablotec">
  <meta property="og:description" content="{escape(s['desc'])}">
  <meta property="og:url" content="{canonical}">
  <link rel="icon" href="{up}assets/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Inter+Tight:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="{up}styles.css">
  <script type="application/ld+json">{breadcrumbs}</script>
</head>
<body data-page="sector" data-lang="{lang}">
  <a class="skip" href="#main">{escape(t['skip'])}</a>
  <header class="site-header" id="top">
    <div class="wrap header-inner">
      <a href="{home}" class="brand" aria-label="Cablotec">{LOGO}<span class="brand-word">CABLOTEC</span></a>
      <nav class="nav" id="nav" aria-label="Principal">{nav}</nav>
      <div class="header-actions">
        <div class="lang" role="group" aria-label="Idioma / Language">
          <a href="{pt_href}" data-set-lang="pt" aria-current="{'true' if lang == 'pt' else 'false'}">PT</a>
          <a href="{en_href}" data-set-lang="en" aria-current="{'true' if lang == 'en' else 'false'}">EN</a>
        </div>
        <a href="{quote}" class="btn btn-copper btn-sm">{escape(t['cta'])}</a>
        <button class="menu-toggle" type="button" aria-controls="nav" aria-expanded="false" aria-label="Menu"><span></span><span></span></button>
      </div>
    </div>
  </header>

  <main id="main">
    <section class="page-hero">
      <div class="wrap">
        <nav class="crumbs" aria-label="Breadcrumb"><a href="{home}">{escape(t['home'])}</a><span>/</span><a href="{home}#setores">{escape(t['sectors'])}</a><span>/</span><span aria-current="page">{escape(s['name'])}</span></nav>
        <span class="tag">{sector['tag']}</span>
        <h1>{escape(s['title'])}</h1>
        <p class="lead">{escape(s['lead'])}</p>
        <a href="{quote}" class="btn btn-copper">{escape(t['cta'])}</a>
      </div>
    </section>

    <section class="section">
      <div class="wrap two-col">
        <div><p class="kicker">01</p><h2>{escape(t['apps'])}</h2>{ul(s['apps'], 'bullets')}</div>
        <div><p class="kicker">02</p><h2>{escape(t['caps'])}</h2>{ul(s['caps'])}</div>
      </div>
    </section>

    <section class="section section-tint">
      <div class="wrap">
        <header class="section-head"><p class="kicker">03</p><h2>{escape(t['reqs'])}</h2><p>{escape(t['reqsNote'])}</p></header>
        <div class="req-grid">{''.join(f'<div class="req">{escape(r)}</div>' for r in s['reqs'])}</div>
        {highlight}
      </div>
    </section>

    <section class="section">
      <div class="wrap">
        <header class="section-head"><p class="kicker">04</p><h2>{escape(t['why'])}</h2></header>
        <div class="cards">
          <article class="card"><h3>{escape(t['why1t'])}</h3><p>{escape(t['why1d'])}</p></article>
          <article class="card"><h3>{escape(t['why2t'])}</h3><p>{escape(t['why2d'])}</p></article>
          <article class="card"><h3>{escape(t['why3t'])}</h3><p>{escape(t['why3d'])}</p></article>
        </div>
      </div>
    </section>

    <section class="cta-band">
      <div class="wrap cta-inner">
        <div><h2>{escape(t['ctaT'])}</h2><p>{escape(t['ctaD'])}</p></div>
        <a href="{quote}" class="btn btn-copper">{escape(t['cta'])}</a>
      </div>
    </section>

    <section class="section">
      <div class="wrap">
        <h2 class="h-small">{escape(t['others'])}</h2>
        <div class="others">{others}</div>
      </div>
    </section>
  </main>

  <footer class="site-footer" id="contactos">
    <div class="wrap footer-grid">
      <div>
        <a href="{home}" class="brand brand-light">{LOGO}<span class="brand-word">CABLOTEC</span></a>
        <p class="muted">Cablotec, Cablagens e Sistemas, Lda.</p>
      </div>
      <address><h4>{escape(t['address'])}</h4>Quinta do Levi, Zona Industrial da Abrunheira<br>Edifício 3, 2710-089 Sintra, Portugal</address>
      <div>
        <h4>{escape(t['contact'])}</h4>
        <a href="tel:+351214607890">+351 214 607 890</a><br>
        <a href="mailto:cablotec@cablotec.com">cablotec@cablotec.com</a><br>
        <a href="https://pt.linkedin.com/company/cabloteccom" target="_blank" rel="noopener">LinkedIn</a>
      </div>
      <div>
        <h4>{escape(t['legal'])}</h4>
        <a href="{up}privacidade.html">{escape(t['privacy'])}</a><br>
        <a href="https://www.livroreclamacoes.pt" target="_blank" rel="noopener">{escape(t['complaints'])}</a>
      </div>
    </div>
    <div class="wrap footer-bottom"><span>© <span id="year">2026</span> Cablotec</span><span>{escape(t['since'])}</span></div>
  </footer>
  <script src="{up}main.js" defer></script>
</body>
</html>
"""


def sitemap():
    def alt(pt, en):
        return (f'    <xhtml:link rel="alternate" hreflang="pt-PT" href="{pt}"/>\n'
                f'    <xhtml:link rel="alternate" hreflang="en" href="{en}"/>\n')
    pairs = [(f"{SITE}/", f"{SITE}/?lang=en")] + [
        (f"{SITE}/setores/{s['pt_slug']}.html", f"{SITE}/en/industries/{s['en_slug']}.html") for s in SECTORS
    ]
    out = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">']
    for pt, en in pairs:
        for loc in (pt, en):
            out.append(f"  <url>\n    <loc>{loc}</loc>\n{alt(pt, en)}  </url>")
    out.append(f"  <url><loc>{SITE}/privacidade.html</loc></url>")
    out.append("</urlset>\n")
    return "\n".join(out)


def main():
    for sector in SECTORS:
        for lang in ("pt", "en"):
            target = ROOT / paths(lang)[2](sector)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(page(sector, lang), encoding="utf-8")
            print("gerado", target.relative_to(ROOT))
    (ROOT / "sitemap.xml").write_text(sitemap(), encoding="utf-8")
    print("gerado sitemap.xml")


if __name__ == "__main__":
    main()
