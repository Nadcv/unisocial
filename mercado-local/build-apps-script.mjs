// Gera os 2 ficheiros para colar no Google Apps Script:
//   apps-script/Code.gs     (data.js + core.js + servidor.gs)
//   apps-script/Index.html  (index.html com CSS e JS embutidos)
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

writeFileSync(new URL('apps-script/Index.html', dir), `<!-- GERADO por build-apps-script.mjs — não editar aqui. -->\n${html}`);
// No Apps Script todos os ficheiros .gs partilham o mesmo âmbito global, por isso
// juntá-los num só ficheiro é equivalente e poupa passos a quem publica.
const partes = ['data.js', 'core.js', 'servidor.gs'].map((f) => `// ===== ${f} =====\n${read(f).trim()}\n`);
writeFileSync(new URL('apps-script/Code.gs', dir),
  '// GERADO por build-apps-script.mjs a partir de data.js, core.js e servidor.gs — não editar aqui.\n\n' + partes.join('\n'));
console.log('apps-script/ atualizado.');
