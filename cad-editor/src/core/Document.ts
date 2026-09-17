import { Emitter } from './events';
import type { DxfEntity, MasterModuleDef, ModuleDef, ReferenceMesh } from './types';

let idCounter = 0;
export function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`;
}

interface DocEvents {
  change: { reason: string };
  selectionChange: { selectedIds: string[] };
  [key: string]: unknown;
}

/**
 * The single source of truth for a drawing: modules, master blocks, and imported reference
 * geometry. The 2D and 3D views both read/write through this document and re-render on `change`.
 */
export class CadDocument {
  readonly events = new Emitter<DocEvents>();

  modules = new Map<string, ModuleDef>();
  masters = new Map<string, MasterModuleDef>();
  dxfEntities: DxfEntity[] = [];
  referenceMeshes: ReferenceMesh[] = [];

  selectedIds = new Set<string>();

  private notify(reason: string): void {
    this.events.emit('change', { reason });
  }

  // --- Modules -------------------------------------------------------

  addModule(partial: Omit<ModuleDef, 'id'> & { id?: string }): ModuleDef {
    const mod: ModuleDef = { id: partial.id ?? nextId('mod'), ...partial };
    this.modules.set(mod.id, mod);
    this.notify('addModule');
    return mod;
  }

  updateModule(id: string, patch: Partial<Omit<ModuleDef, 'id'>>): void {
    const mod = this.modules.get(id);
    if (!mod) return;
    Object.assign(mod, patch);

    // If this instance is linked to a master, keep sibling instances of the same master
    // in sync for dimension/color changes — "edit once, update everywhere".
    if (mod.masterId && (patch.width !== undefined || patch.depth !== undefined || patch.height !== undefined || patch.color !== undefined)) {
      const master = this.masters.get(mod.masterId);
      if (master) {
        if (patch.width !== undefined) master.width = patch.width;
        if (patch.depth !== undefined) master.depth = patch.depth;
        if (patch.height !== undefined) master.height = patch.height;
        if (patch.color !== undefined) master.color = patch.color;
        for (const sibling of this.modules.values()) {
          if (sibling.masterId === mod.masterId && sibling.id !== id) {
            if (patch.width !== undefined) sibling.width = patch.width;
            if (patch.depth !== undefined) sibling.depth = patch.depth;
            if (patch.height !== undefined) sibling.height = patch.height;
            if (patch.color !== undefined) sibling.color = patch.color;
          }
        }
      }
    }

    this.notify('updateModule');
  }

  removeModule(id: string): void {
    this.modules.delete(id);
    this.selectedIds.delete(id);
    this.notify('removeModule');
  }

  duplicateModule(id: string): ModuleDef | undefined {
    const src = this.modules.get(id);
    if (!src) return undefined;
    return this.addModule({
      ...src,
      id: undefined as unknown as string,
      name: `${src.name} (cópia)`,
      position: { x: src.position.x + src.width, y: src.position.y, z: src.position.z },
    });
  }

  // --- Master modules (reusable blocks) -------------------------------

  defineMaster(partial: Omit<MasterModuleDef, 'id'> & { id?: string }): MasterModuleDef {
    const master: MasterModuleDef = { id: partial.id ?? nextId('master'), ...partial };
    this.masters.set(master.id, master);
    this.notify('defineMaster');
    return master;
  }

  instantiateMaster(masterId: string, position = { x: 0, y: 0, z: 0 }): ModuleDef | undefined {
    const master = this.masters.get(masterId);
    if (!master) return undefined;
    return this.addModule({
      name: master.name,
      position,
      rotationZ: 0,
      width: master.width,
      depth: master.depth,
      height: master.height,
      color: master.color,
      masterId: master.id,
    });
  }

  // --- Selection -------------------------------------------------------

  setSelection(ids: string[]): void {
    this.selectedIds = new Set(ids);
    this.events.emit('selectionChange', { selectedIds: [...this.selectedIds] });
  }

  // --- Reference geometry (imported CAD data) ---------------------------

  setDxfEntities(entities: DxfEntity[]): void {
    this.dxfEntities = entities;
    this.notify('setDxfEntities');
  }

  addReferenceMesh(mesh: ReferenceMesh): void {
    this.referenceMeshes.push(mesh);
    this.notify('addReferenceMesh');
  }

  clear(): void {
    this.modules.clear();
    this.masters.clear();
    this.dxfEntities = [];
    this.referenceMeshes = [];
    this.selectedIds.clear();
    this.notify('clear');
  }

  toJSON(): string {
    return JSON.stringify(
      {
        modules: [...this.modules.values()],
        masters: [...this.masters.values()],
      },
      null,
      2,
    );
  }

  loadJSON(json: string): void {
    const data = JSON.parse(json) as { modules: ModuleDef[]; masters: MasterModuleDef[] };
    this.modules = new Map(data.modules.map((m) => [m.id, m]));
    this.masters = new Map(data.masters.map((m) => [m.id, m]));
    this.notify('loadJSON');
  }
}
