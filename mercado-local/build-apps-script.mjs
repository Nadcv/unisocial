// Gera os ficheiros para colar no Google Apps Script a partir do site:
//   apps-script/Index.html  (index.html com CSS e JS embutidos)
//   apps-script/Core.gs     (cópia de core.js)
//   apps-script/Dados.gs    (cópia de data.js)
// Uso: node build-apps-script.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const dir = new URL('.', import.meta.url);
const read = (f) => readFileSync(new URL(f, dir), 'utf8');
const inlineScript = (f) => {
  const js = read(f);
  if (/<\/script/i.test(js)) throw new Error(`${f} contém "</script", não pode ser embutido.`);
  return `<script>\n${js}</script>`;
};

let html = read('index.html');
const substituicoes = [
  ['<link rel="stylesheet" href="styles.css" />', () => `<style>\n${read('styles.css')}</style>`],
  ['<script src="data.js"></script>\n', () => ''], // no Apps Script os dados vêm da Sheet
  ['<script src="core.js"></script>', () => inlineScript('core.js')],
  ['<script src="app.js"></script>', () => inlineScript('app.js')]
];
for (const [de, para] of substituicoes) {
  if (!html.includes(de)) throw new Error(`Não encontrei ${de.trim()} em index.html`);
  html = html.replace(de, para);
}

const aviso = (f) => `// GERADO por build-apps-script.mjs a partir de ${f} — não editar aqui.\n`;
writeFileSync(new URL('apps-script/Index.html', dir), `<!-- GERADO por build-apps-script.mjs — não editar aqui. -->\n${html}`);
writeFileSync(new URL('apps-script/Core.gs', dir), aviso('core.js') + read('core.js'));
writeFileSync(new URL('apps-script/Dados.gs', dir), aviso('data.js') + read('data.js'));
console.log('apps-script/ atualizado.');
