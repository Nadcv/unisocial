// Endpoint que recebe o formulário de orçamento (ex.: Formspree, Getform ou um
// script próprio). Vazio = o pedido abre no cliente de email do visitante.
const FORM_ENDPOINT = "";
const QUOTE_EMAIL = "cablotec@cablotec.com";

const EN = {
  "skip": "Skip to content",
  "nav.solutions": "Solutions", "nav.sectors": "Industries", "nav.process": "Process",
  "nav.quality": "Quality", "nav.company": "Company", "nav.contact": "Contact",
  "cta.quote": "Request a quote", "cta.quoteLong": "Request a technical quote", "cta.explore": "Explore solutions",
  "hero.eyebrow": "Sintra, Portugal · since 1992",
  "hero.title": "Wiring harnesses and interconnect systems, from design to series production.",
  "hero.lead": "We design and manufacture custom wiring harnesses, overmoulded assemblies, moulds and electrical cabinets for demanding industrial applications — with engineering, toolmaking and production under one roof.",
  "stats.founded": "Founded", "stats.iso": "Certified since 1999", "stats.sectors": "Industrial sectors", "stats.export": "Export markets",
  "sol.title": "A complete, in-house manufacturing chain.",
  "sol.lead": "From mould design to final harness testing, we control every step. Fewer suppliers in your chain, shorter lead times and a single point of responsibility for quality.",
  "sol.c1.t": "Custom wiring harnesses", "sol.c1.d": "Wiring harnesses and cable assemblies built to print, from prototype to series production, with crimping, soldering, labelling and mechanical protection.",
  "sol.c2.t": "Overmoulding & injection", "sol.c2.d": "Overmoulding of connectors and cables, and injection of technical parts in a range of polymers, for sealing, strain relief and ruggedness.",
  "sol.c3.t": "Moulds & tooling", "sol.c3.d": "In-house design and manufacture of injection moulds and cutting, bending and stamping tools, developed for each part.",
  "sol.c4.t": "Electrical cabinets", "sol.c4.d": "Assembly and wiring of low-voltage electrical cabinets for industrial and residential applications, using components from leading brands.",
  "sol.c5.t": "System integration", "sol.c5.d": "Integration of harnesses, mechanical and electronic components into the final product, or into sub-assemblies ready for your line.",
  "sol.c6.t": "Engineering & development", "sol.c6.d": "Design work alongside your engineering team: requirements analysis, material selection, cost optimisation and industrialisation.",
  "sec.title": "Where failure is not an option.",
  "sec.lead": "We work for manufacturers that demand reliability, traceability and strict compliance with specifications.",
  "sec.s1.t": "Railway", "sec.s1.d": "Harnesses for rolling stock and railway interiors, including R&D projects with European partners.",
  "sec.s2.t": "Defence", "sec.s2.d": "Assembly to MIL standards for communications, targeting systems and combat vehicles.",
  "sec.s3.t": "Medical", "sec.s3.d": "Harnesses and assemblies for medical equipment, with process control and full documentation.",
  "sec.s4.t": "Telecom & IT", "sec.s4.d": "Signal and data cables, connectorised assemblies and interconnect solutions for network equipment.",
  "sec.s5.t": "Industrial automation", "sec.s5.d": "Machine harnesses, electrical cabinets and overmoulded parts for harsh industrial environments.",
  "sec.s6.t": "Automotive", "sec.s6.d": "Design, engineering and manufacture of harnesses and overmoulded components for the automotive industry.",
  "proc.title": "From drawing to delivery, one partner.",
  "proc.p1.t": "Study", "proc.p1.d": "Review of drawing, specification and volumes.",
  "proc.p2.t": "Design", "proc.p2.d": "Product engineering and material selection.",
  "proc.p3.t": "Tooling", "proc.p3.d": "Moulds and tools made in-house.",
  "proc.p4.t": "Prototype", "proc.p4.d": "Samples for customer validation.",
  "proc.p5.t": "Production", "proc.p5.d": "Series manufacturing under process control.",
  "proc.p6.t": "Test & delivery", "proc.p6.d": "Electrical testing, final inspection and shipping.",
  "q.title": "Certified quality since 1999.",
  "q.lead": "Our quality management system has been certified to NP EN ISO 9001 since 1999 and is continuously improved to meet the expectations of the most demanding customers.",
  "q.l1": "Dedicated electrical test equipment", "q.l2": "In-process and final product inspection",
  "q.l3": "Assembly to international standards, including MIL", "q.l4": "Technical documentation and lot traceability",
  "q.since": "Certified since 1999", "q.download": "Certificates available on request.",
  "rd.kicker": "Innovation", "rd.title": "Research & development.",
  "rd.iris": "Co-funded project to develop innovative solutions for railway interiors, where Cablotec contributes its expertise in wiring harnesses and system integration.",
  "rd.sheet": "Project sheet (PDF, Portuguese)",
  "co.title": "More than three decades of Portuguese engineering.",
  "co.p1": "Founded in March 1992 in Sintra, Cablotec has grown from harness manufacturer into an engineering partner, with capabilities in moulds, injection, overmoulding, electrical cabinets and system integration.",
  "co.p2": "Today most of our production is exported to industrial customers in Europe and the United States.",
  "co.members": "Member of", "co.today": "Today",
  "co.t1": "Cablotec founded in Sintra.", "co.t2": "NP EN ISO 9001 certification.",
  "co.t3": "Expansion into moulds, injection and electrical cabinets.",
  "co.t4": "Exports to France, Germany, Switzerland, Spain, the UK and the USA.",
  "f.title": "Have a project? Talk to our engineers.",
  "f.lead": "Send us your drawing or specification. We reply with a technical review and a proposal, usually within a few working days.",
  "f.b1": "Prototypes and small batches", "f.b2": "Series production with scheduled deliveries", "f.b3": "Confidentiality guaranteed (NDA on request)",
  "f.name": "Name", "f.company": "Company", "f.phone": "Phone", "f.sector": "Industry", "f.other": "Other",
  "f.qty": "Estimated annual quantity", "f.msg": "Project description",
  "f.file": "Drawings or specification (PDF, DWG, STEP)",
  "f.consent": "I agree that my data may be used to reply to this request.",
  "f.send": "Send request",
  "ft.address": "Address", "ft.legal": "Legal", "ft.privacy": "Privacy policy", "ft.complaints": "Complaints Book",
  "ft.cert": "NP EN ISO 9001 · Since 1992"
};

const META = {
  pt: { title: document.title, desc: document.querySelector('meta[name="description"]').content },
  en: {
    title: "Cablotec | Custom Wiring Harnesses, Overmoulding & Electrical Systems",
    desc: "Since 1992, Cablotec designs and manufactures custom wiring harnesses, overmoulded assemblies, moulds and electrical cabinets for railway, defence, medical, telecom and automation. ISO 9001 certified since 1999."
  }
};

const MSG = {
  pt: { required: "Preencha os campos obrigatórios e aceite a política de dados.", sending: "A enviar…", ok: "Obrigado! Recebemos o seu pedido e entraremos em contacto brevemente.", err: "Não foi possível enviar. Escreva-nos para " + QUOTE_EMAIL + ".", mail: "Abrimos o seu email com o pedido preenchido. Anexe os desenhos antes de enviar.", qty: "ex.: 5 000" },
  en: { required: "Please fill in the required fields and accept the data policy.", sending: "Sending…", ok: "Thank you! We have received your request and will be in touch shortly.", err: "Sending failed. Please email us at " + QUOTE_EMAIL + ".", mail: "Your email client has opened with the request filled in. Attach your drawings before sending.", qty: "e.g. 5,000" }
};

const nodes = [...document.querySelectorAll("[data-i18n]")];
const PT = Object.fromEntries(nodes.map(n => [n.dataset.i18n, n.textContent]));
let lang = "pt";

function setLang(next) {
  lang = next === "en" ? "en" : "pt";
  const dict = lang === "en" ? EN : PT;
  nodes.forEach(n => { const v = dict[n.dataset.i18n]; if (v) n.textContent = v; });
  document.documentElement.lang = lang === "en" ? "en" : "pt-PT";
  document.title = META[lang].title;
  document.querySelector('meta[name="description"]').content = META[lang].desc;
  document.querySelector('input[name="quantidade"]').placeholder = MSG[lang].qty;
  document.querySelectorAll("[data-lang]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  try { localStorage.setItem("cablotec-lang", lang); } catch {}
}

document.querySelectorAll("[data-lang]").forEach(b => b.addEventListener("click", () => setLang(b.dataset.lang)));

const urlLang = new URLSearchParams(location.search).get("lang");
let saved = null;
try { saved = localStorage.getItem("cablotec-lang"); } catch {}
const initial = urlLang || saved || (navigator.language?.toLowerCase().startsWith("pt") ? "pt" : "en");
if (initial === "en") setLang("en");

// Mobile menu
const toggle = document.querySelector(".menu-toggle");
const nav = document.getElementById("nav");
toggle.addEventListener("click", () => {
  const open = toggle.getAttribute("aria-expanded") !== "true";
  toggle.setAttribute("aria-expanded", String(open));
  nav.classList.toggle("open", open);
});
nav.addEventListener("click", e => {
  if (e.target.closest("a")) { toggle.setAttribute("aria-expanded", "false"); nav.classList.remove("open"); }
});

// Reveal on scroll
if ("IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }), { rootMargin: "0px 0px -8% 0px" });
  document.querySelectorAll(".section-head, .card, .sector, .process li, .project, .cert, .timeline, .form").forEach(el => {
    el.classList.add("reveal"); io.observe(el);
  });
}

// Quote form
const form = document.getElementById("quote-form");
const status = form.querySelector(".form-status");

form.addEventListener("submit", async e => {
  e.preventDefault();
  const m = MSG[lang];
  let valid = true;
  form.querySelectorAll("[required]").forEach(f => {
    const ok = f.type === "checkbox" ? f.checked : f.checkValidity() && f.value.trim() !== "";
    f.setAttribute("aria-invalid", String(!ok));
    if (!ok) valid = false;
  });
  if (!valid) { status.className = "form-status err"; status.textContent = m.required; return; }

  const data = new FormData(form);

  if (!FORM_ENDPOINT) {
    const body = ["nome", "empresa", "email", "telefone", "setor", "quantidade", "mensagem"]
      .map(k => `${k}: ${data.get(k) || ""}`).join("\n");
    const subject = `Pedido de orçamento — ${data.get("empresa")}`;
    location.href = `mailto:${QUOTE_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    status.className = "form-status ok"; status.textContent = m.mail;
    return;
  }

  status.className = "form-status"; status.textContent = m.sending;
  try {
    const res = await fetch(FORM_ENDPOINT, { method: "POST", body: data, headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(res.status);
    form.reset();
    status.className = "form-status ok"; status.textContent = m.ok;
  } catch {
    status.className = "form-status err"; status.textContent = m.err;
  }
});

document.getElementById("year").textContent = new Date().getFullYear();
