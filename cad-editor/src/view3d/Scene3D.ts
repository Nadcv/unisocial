import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import type { CadDocument } from '../core/Document';
import type { ModuleDef } from '../core/types';

/**
 * 3D editor built on three.js. Each ModuleDef is rendered as a box mesh kept in sync with the
 * document; dragging a mesh with TransformControls writes the new position/rotation/scale back
 * into the document so the 2D view updates too.
 */
export class Scene3D {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private orbit: OrbitControls;
  private transform: TransformControls;
  private doc: CadDocument;
  private meshes = new Map<string, THREE.Mesh>();
  private referenceGroup = new THREE.Group();
  private raycaster = new THREE.Raycaster();
  private container: HTMLElement;
  private resizeObserver: ResizeObserver;
  private frameHandle = 0;

  constructor(container: HTMLElement, doc: CadDocument) {
    this.container = container;
    this.doc = doc;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color(0x1e1e24);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x404050, 1.2));
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(5, 10, 7);
    this.scene.add(dir);
    this.scene.add(new THREE.GridHelper(40, 40, 0x454552, 0x2c2c34));
    this.scene.add(this.referenceGroup);

    this.camera = new THREE.PerspectiveCamera(55, 1, 0.05, 1000);
    this.camera.position.set(6, 6, 8);
    this.camera.lookAt(0, 0, 0);

    this.orbit = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbit.target.set(0, 0.5, 0);
    this.orbit.enableDamping = true;

    this.transform = new TransformControls(this.camera, this.renderer.domElement);
    this.transform.addEventListener('dragging-changed', (ev) => {
      this.orbit.enabled = !(ev as unknown as { value: boolean }).value;
    });
    this.transform.addEventListener('objectChange', () => this.writeBackTransform());
    this.scene.add(this.transform.getHelper());

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();

    this.renderer.domElement.addEventListener('click', this.onClick);

    doc.events.on('change', () => this.sync());
    doc.events.on('selectionChange', () => this.applySelection());
    this.sync();
    this.animate();
  }

  dispose(): void {
    cancelAnimationFrame(this.frameHandle);
    this.resizeObserver.disconnect();
    this.renderer.dispose();
  }

  setMode(mode: 'translate' | 'rotate' | 'scale'): void {
    this.transform.setMode(mode);
  }

  private resize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private onClick = (ev: MouseEvent): void => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((ev.clientX - rect.left) / rect.width) * 2 - 1,
      -((ev.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects([...this.meshes.values()]);
    if (hits.length > 0) {
      const mesh = hits[0].object as THREE.Mesh;
      const id = mesh.userData.moduleId as string;
      this.doc.setSelection([id]);
    } else if (!this.transform.dragging) {
      this.doc.setSelection([]);
    }
  };

  private writeBackTransform(): void {
    const obj = this.transform.object as THREE.Mesh | undefined;
    if (!obj) return;
    const id = obj.userData.moduleId as string;
    const mod = this.doc.modules.get(id);
    if (!mod) return;
    mod.position = { x: obj.position.x, y: obj.position.z, z: obj.position.y };
    mod.rotationZ = -obj.rotation.y;
    mod.width = Math.max(0.05, obj.scale.x * mod.width);
    mod.depth = Math.max(0.05, obj.scale.z * mod.depth);
    mod.height = Math.max(0.05, obj.scale.y * mod.height);
    obj.scale.set(1, 1, 1);
    this.rebuildGeometry(mod, obj);
    this.doc.events.emit('change', { reason: 'transform3d' });
  }

  private rebuildGeometry(mod: ModuleDef, mesh: THREE.Mesh): void {
    mesh.geometry.dispose();
    mesh.geometry = new THREE.BoxGeometry(mod.width, mod.height, mod.depth);
    mesh.geometry.translate(mod.width / 2, mod.height / 2, mod.depth / 2);
  }

  /** Rebuild/refresh module meshes to match the document (cheap: small scene sizes expected). */
  private sync(): void {
    const seen = new Set<string>();
    for (const mod of this.doc.modules.values()) {
      seen.add(mod.id);
      let mesh = this.meshes.get(mod.id);
      if (!mesh) {
        const geometry = new THREE.BoxGeometry(mod.width, mod.height, mod.depth);
        geometry.translate(mod.width / 2, mod.height / 2, mod.depth / 2);
        const material = new THREE.MeshStandardMaterial({ color: mod.color, metalness: 0.1, roughness: 0.7 });
        mesh = new THREE.Mesh(geometry, material);
        mesh.userData.moduleId = mod.id;
        this.scene.add(mesh);
        this.meshes.set(mod.id, mesh);
      } else {
        const g = mesh.geometry as THREE.BoxGeometry;
        const params = g.parameters;
        if (params.width !== mod.width || params.height !== mod.height || params.depth !== mod.depth) {
          this.rebuildGeometry(mod, mesh);
        }
        (mesh.material as THREE.MeshStandardMaterial).color.set(mod.color);
      }
      mesh.position.set(mod.position.x, mod.position.z, mod.position.y);
      mesh.rotation.set(0, -mod.rotationZ, 0);
      mesh.scale.set(1, 1, 1);
    }
    for (const [id, mesh] of this.meshes) {
      if (!seen.has(id)) {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        this.meshes.delete(id);
      }
    }
    this.syncReferenceMeshes();
  }

  private syncReferenceMeshes(): void {
    const existingIds = new Set([...this.referenceGroup.children].map((c) => c.userData.refId as string));
    for (const ref of this.doc.referenceMeshes) {
      if (existingIds.has(ref.id)) continue;
      const geometry = ref.geometry as THREE.BufferGeometry;
      const material = new THREE.MeshStandardMaterial({ color: 0x8899aa, metalness: 0.1, roughness: 0.8 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.refId = ref.id;
      this.referenceGroup.add(mesh);
    }
  }

  private applySelection(): void {
    const [id] = [...this.doc.selectedIds];
    const mesh = id ? this.meshes.get(id) : undefined;
    for (const [mid, m] of this.meshes) {
      (m.material as THREE.MeshStandardMaterial).emissive.set(mid === id ? 0x554400 : 0x000000);
    }
    if (mesh) this.transform.attach(mesh);
    else this.transform.detach();
  }

  private animate = (): void => {
    this.frameHandle = requestAnimationFrame(this.animate);
    this.orbit.update();
    this.renderer.render(this.scene, this.camera);
  };
}
