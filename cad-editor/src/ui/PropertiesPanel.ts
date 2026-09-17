import type { CadDocument } from '../core/Document';

/** Right-hand panel: shows and edits the numeric fields of the currently selected module(s). */
export class PropertiesPanel {
  private root: HTMLElement;
  private doc: CadDocument;

  constructor(container: HTMLElement, doc: CadDocument) {
    this.doc = doc;
    this.root = document.createElement('div');
    this.root.className = 'panel properties-panel';
    container.appendChild(this.root);

    doc.events.on('selectionChange', () => this.render());
    doc.events.on('change', () => this.render());
    this.render();
  }

  private field(label: string, value: number, step: number, onChange: (v: number) => void): HTMLElement {
    const row = document.createElement('label');
    row.className = 'field-row';
    const span = document.createElement('span');
    span.textContent = label;
    const input = document.createElement('input');
    input.type = 'number';
    input.step = String(step);
    input.value = value.toFixed(3);
    input.addEventListener('change', () => onChange(parseFloat(input.value) || 0));
    row.append(span, input);
    return row;
  }

  private render(): void {
    this.root.innerHTML = '';
    const title = document.createElement('h3');
    title.textContent = 'Propriedades';
    this.root.appendChild(title);

    const ids = [...this.doc.selectedIds];
    if (ids.length !== 1) {
      const hint = document.createElement('p');
      hint.className = 'hint';
      hint.textContent = ids.length === 0 ? 'Nenhum módulo selecionado.' : `${ids.length} módulos selecionados.`;
      this.root.appendChild(hint);
      return;
    }

    const mod = this.doc.modules.get(ids[0]);
    if (!mod) return;

    const nameRow = document.createElement('label');
    nameRow.className = 'field-row';
    const nameSpan = document.createElement('span');
    nameSpan.textContent = 'Nome';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = mod.name;
    nameInput.addEventListener('change', () => this.doc.updateModule(mod.id, { name: nameInput.value }));
    nameRow.append(nameSpan, nameInput);
    this.root.appendChild(nameRow);

    this.root.appendChild(this.field('Largura (X, m)', mod.width, 0.01, (v) => this.doc.updateModule(mod.id, { width: Math.max(0.01, v) })));
    this.root.appendChild(this.field('Profundidade (Y, m)', mod.depth, 0.01, (v) => this.doc.updateModule(mod.id, { depth: Math.max(0.01, v) })));
    this.root.appendChild(this.field('Altura (Z, m)', mod.height, 0.01, (v) => this.doc.updateModule(mod.id, { height: Math.max(0.01, v) })));
    this.root.appendChild(this.field('Posição X (m)', mod.position.x, 0.01, (v) => this.doc.updateModule(mod.id, { position: { ...mod.position, x: v } })));
    this.root.appendChild(this.field('Posição Y (m)', mod.position.y, 0.01, (v) => this.doc.updateModule(mod.id, { position: { ...mod.position, y: v } })));
    this.root.appendChild(this.field('Posição Z (m)', mod.position.z, 0.01, (v) => this.doc.updateModule(mod.id, { position: { ...mod.position, z: v } })));
    this.root.appendChild(
      this.field('Rotação (graus)', (mod.rotationZ * 180) / Math.PI, 1, (v) => this.doc.updateModule(mod.id, { rotationZ: (v * Math.PI) / 180 })),
    );

    const colorRow = document.createElement('label');
    colorRow.className = 'field-row';
    const colorSpan = document.createElement('span');
    colorSpan.textContent = 'Cor';
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = mod.color;
    colorInput.addEventListener('input', () => this.doc.updateModule(mod.id, { color: colorInput.value }));
    colorRow.append(colorSpan, colorInput);
    this.root.appendChild(colorRow);

    if (mod.masterId) {
      const masterHint = document.createElement('p');
      masterHint.className = 'hint';
      masterHint.textContent = 'Vinculado a um módulo mestre — dimensões/cor sincronizam com todas as instâncias.';
      this.root.appendChild(masterHint);
    }

    const actions = document.createElement('div');
    actions.className = 'panel-actions';

    const dupBtn = document.createElement('button');
    dupBtn.textContent = 'Duplicar';
    dupBtn.addEventListener('click', () => {
      const copy = this.doc.duplicateModule(mod.id);
      if (copy) this.doc.setSelection([copy.id]);
    });

    const makeMasterBtn = document.createElement('button');
    makeMasterBtn.textContent = 'Tornar reutilizável';
    makeMasterBtn.title = 'Cria um módulo mestre a partir deste, para inserir várias cópias sincronizadas';
    makeMasterBtn.addEventListener('click', () => {
      const master = this.doc.defineMaster({ name: mod.name, width: mod.width, depth: mod.depth, height: mod.height, color: mod.color });
      this.doc.updateModule(mod.id, { masterId: master.id });
    });

    const delBtn = document.createElement('button');
    delBtn.textContent = 'Excluir';
    delBtn.className = 'danger';
    delBtn.addEventListener('click', () => this.doc.removeModule(mod.id));

    actions.append(dupBtn, makeMasterBtn, delBtn);
    this.root.appendChild(actions);
  }
}
