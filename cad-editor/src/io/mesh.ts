import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import type { CadDocument } from '../core/Document';
import { nextId } from '../core/Document';

export type MeshFormat = 'stl' | 'obj' | 'gltf' | 'glb';

function formatFromFilename(name: string): MeshFormat | undefined {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'stl') return 'stl';
  if (ext === 'obj') return 'obj';
  if (ext === 'gltf') return 'gltf';
  if (ext === 'glb') return 'glb';
  return undefined;
}

/** Imports an STL/OBJ/glTF/GLB file (as raw bytes+name) into the document as a reference mesh. */
export async function importMeshFile(doc: CadDocument, file: File): Promise<void> {
  const format = formatFromFilename(file.name);
  if (!format) throw new Error(`Formato não suportado: ${file.name}`);

  if (format === 'stl') {
    const buffer = await file.arrayBuffer();
    const geometry = new STLLoader().parse(buffer);
    geometry.computeVertexNormals();
    doc.addReferenceMesh({ id: nextId('ref'), name: file.name, sourceFormat: format, geometry });
    return;
  }

  if (format === 'obj') {
    const text = await file.text();
    const group = new OBJLoader().parse(text);
    mergeGroupAsReference(doc, group, file.name, format);
    return;
  }

  // gltf / glb
  const buffer = await file.arrayBuffer();
  const loader = new GLTFLoader();
  const gltf = await new Promise<{ scene: THREE.Group }>((resolve, reject) => {
    loader.parse(buffer, '', (result) => resolve(result), (err) => reject(err));
  });
  mergeGroupAsReference(doc, gltf.scene, file.name, format);
}

function mergeGroupAsReference(doc: CadDocument, group: THREE.Object3D, name: string, format: MeshFormat): void {
  let idx = 0;
  group.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const geometry = mesh.geometry.clone();
      geometry.applyMatrix4(mesh.matrixWorld);
      idx += 1;
      doc.addReferenceMesh({ id: nextId('ref'), name: `${name} #${idx}`, sourceFormat: format, geometry });
    }
  });
}

function buildExportGroup(doc: CadDocument): THREE.Group {
  const group = new THREE.Group();
  for (const m of doc.modules.values()) {
    const geometry = new THREE.BoxGeometry(m.width, m.height, m.depth);
    geometry.translate(m.width / 2, m.height / 2, m.depth / 2);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: m.color }));
    mesh.position.set(m.position.x, m.position.z, m.position.y);
    mesh.rotation.set(0, -m.rotationZ, 0);
    mesh.name = m.name;
    group.add(mesh);
  }
  for (const wall of doc.walls.values()) {
    const dx = wall.end[0] - wall.start[0];
    const dy = wall.end[1] - wall.start[1];
    const length = Math.max(0.01, Math.hypot(dx, dy));
    const geometry = new THREE.BoxGeometry(length, wall.height, wall.thickness);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: wall.color }));
    mesh.position.set((wall.start[0] + wall.end[0]) / 2, wall.height / 2, (wall.start[1] + wall.end[1]) / 2);
    mesh.rotation.set(0, -Math.atan2(dy, dx), 0);
    mesh.name = 'Parede';
    group.add(mesh);
  }
  return group;
}

export function exportToStl(doc: CadDocument): string {
  return new STLExporter().parse(buildExportGroup(doc));
}

export function exportToObj(doc: CadDocument): string {
  return new OBJExporter().parse(buildExportGroup(doc));
}

export async function exportToGltf(doc: CadDocument): Promise<ArrayBuffer | object> {
  const exporter = new GLTFExporter();
  return new Promise((resolve, reject) => {
    exporter.parse(buildExportGroup(doc), (result) => resolve(result), (err) => reject(err), { binary: false });
  });
}
