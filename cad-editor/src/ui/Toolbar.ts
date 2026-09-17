import type { CadDocument } from '../core/Document';
import type { Scene3D } from '../view3d/Scene3D';
import { importDxfIntoDocument, exportDocumentToDxf } from '../io/dxf';
import { importMeshFile, exportToStl, exportToObj, exportToGltf } from '../io/mesh';
import { importStepOrIgesFile } from '../io/step';
import { isDwgFile, UnsupportedDwgError } from '../io/dwg';

function download(filename: string, content: string | ArrayBuffer | object): void {
  const blob =
    content instanceof ArrayBuffer
      ? new Blob([content], { type: 'application/octet-stream' })
      : typeof content === 'string'
        ? new Blob([content], { type: 'text/plain' })
        : new Blob([JSON.stringify(content)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

let moduleCounter = 0;

export class Toolbar {
  constructor(container: HTMLElement, doc: CadDocument, scene3D: Scene3D, statusEl: HTMLElement) {
    const root = document.createElement('div');
    root.className = 'toolbar';

    const setStatus = (msg: string, isError = false): void => {
      statusEl.textContent = msg;
      statusEl.classList.toggle('error', isError);
    };

    // --- New module ---
    const newModuleBtn = document.createElement('button');
    newModuleBtn.textContent = '+ Novo módulo';
    newModuleBtn.addEventListener('click', () => {
      moduleCounter += 1;
      const mod = doc.addModule({
        name: `Módulo ${moduleCounter}`,
        position: { x: 0, y: 0, z: 0 },
        rotationZ: 0,
        width: 0.6,
        depth: 0.6,
        height: 0.75,
        color: '#5b8cff',
      });
      doc.setSelection([mod.id]);
    });
    root.appendChild(newModuleBtn);

    // --- Import ---
    const importInput = document.createElement('input');
    importInput.type = 'file';
    importInput.accept = '.dxf,.stl,.obj,.gltf,.glb,.step,.stp,.igs,.iges,.dwg';
    importInput.style.display = 'none';
    importInput.addEventListener('change', async () => {
      const file = importInput.files?.[0];
      importInput.value = '';
      if (!file) return;
      try {
        setStatus(`Importando ${file.name}...`);
        const lower = file.name.toLowerCase();
        if (isDwgFile(file.name)) {
          throw new UnsupportedDwgError();
        } else if (lower.endsWith('.dxf')) {
          importDxfIntoDocument(doc, await file.text());
        } else if (lower.endsWith('.step') || lower.endsWith('.stp') || lower.endsWith('.igs') || lower.endsWith('.iges')) {
          await importStepOrIgesFile(doc, file);
        } else {
          await importMeshFile(doc, file);
        }
        setStatus(`Importado: ${file.name}`);
      } catch (err) {
        setStatus((err as Error).message, true);
      }
    });
    root.appendChild(importInput);

    const importBtn = document.createElement('button');
    importBtn.textContent = 'Importar CAD...';
    importBtn.addEventListener('click', () => importInput.click());
    root.appendChild(importBtn);

    // --- Export menu ---
    const exportSelect = document.createElement('select');
    exportSelect.innerHTML = `
      <option value="dxf">Exportar → DXF (2D)</option>
      <option value="stl">Exportar → STL (3D)</option>
      <option value="obj">Exportar → OBJ (3D)</option>
      <option value="gltf">Exportar → glTF (3D)</option>
      <option value="json">Exportar → JSON (projeto)</option>
    `;
    root.appendChild(exportSelect);

    const exportBtn = document.createElement('button');
    exportBtn.textContent = 'Exportar';
    exportBtn.addEventListener('click', async () => {
      try {
        const format = exportSelect.value;
        if (format === 'dxf') download('desenho.dxf', exportDocumentToDxf(doc));
        else if (format === 'stl') download('modelo.stl', exportToStl(doc));
        else if (format === 'obj') download('modelo.obj', exportToObj(doc));
        else if (format === 'gltf') download('modelo.gltf', await exportToGltf(doc));
        else download('projeto.json', doc.toJSON());
        setStatus(`Exportado como ${format.toUpperCase()}`);
      } catch (err) {
        setStatus((err as Error).message, true);
      }
    });
    root.appendChild(exportBtn);

    // --- 3D transform mode ---
    const modeGroup = document.createElement('div');
    modeGroup.className = 'button-group';
    (['translate', 'rotate', 'scale'] as const).forEach((mode) => {
      const btn = document.createElement('button');
      btn.textContent = { translate: 'Mover', rotate: 'Girar', scale: 'Escalar' }[mode];
      btn.addEventListener('click', () => {
        scene3D.setMode(mode);
        [...modeGroup.children].forEach((c) => c.classList.remove('active'));
        btn.classList.add('active');
      });
      modeGroup.appendChild(btn);
    });
    (modeGroup.firstChild as HTMLElement)?.classList.add('active');
    root.appendChild(modeGroup);

    container.appendChild(root);
  }
}
