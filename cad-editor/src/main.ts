import './style.css';
import { CadDocument } from './core/Document';
import { Canvas2D } from './view2d/Canvas2D';
import { Scene3D } from './view3d/Scene3D';
import { Toolbar } from './ui/Toolbar';
import { ModuleList } from './ui/ModuleList';
import { PropertiesPanel } from './ui/PropertiesPanel';

const app = document.getElementById('app')!;

const header = document.createElement('header');
header.className = 'app-header';
const title = document.createElement('h1');
title.textContent = 'CAD Modular';
header.appendChild(title);
const toolbarHost = document.createElement('div');
toolbarHost.style.flex = '1';
header.appendChild(toolbarHost);
app.appendChild(header);

const layout = document.createElement('main');
layout.className = 'layout';
app.appendChild(layout);

const leftPanelHost = document.createElement('div');
layout.appendChild(leftPanelHost);

const pane2d = document.createElement('div');
pane2d.className = 'view-pane';
pane2d.innerHTML = '<span class="pane-label">2D — planta baixa</span>';
layout.appendChild(pane2d);

const pane3d = document.createElement('div');
pane3d.className = 'view-pane';
pane3d.innerHTML = '<span class="pane-label">3D</span>';
layout.appendChild(pane3d);

const rightPanelHost = document.createElement('div');
layout.appendChild(rightPanelHost);

const footer = document.createElement('footer');
footer.className = 'status-bar';
footer.textContent = 'Pronto.';
app.appendChild(footer);

const doc = new CadDocument();

new Canvas2D(pane2d, doc);
const scene3D = new Scene3D(pane3d, doc);
new ModuleList(leftPanelHost, doc);
new PropertiesPanel(rightPanelHost, doc);
new Toolbar(toolbarHost, doc, scene3D, footer);

// Seed a small example so the app isn't empty on first load.
const master = doc.defineMaster({ name: 'Armário base 60', width: 0.6, depth: 0.6, height: 0.75, color: '#5b8cff' });
doc.instantiateMaster(master.id, { x: 0, y: 0, z: 0 });
doc.instantiateMaster(master.id, { x: 0.6, y: 0, z: 0 });
doc.addModule({
  name: 'Bancada',
  position: { x: 0, y: 0.6, z: 0.75 },
  rotationZ: 0,
  width: 1.2,
  depth: 0.05,
  height: 0.05,
  color: '#c9a35b',
});
