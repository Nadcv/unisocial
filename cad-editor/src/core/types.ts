// Shared geometric/document types used by both the 2D and 3D views.

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** A parametric, reusable block — the "modulação" concept (e.g. a cabinet, drawer, panel). */
export interface ModuleDef {
  id: string;
  name: string;
  /** Position of the module's origin (bottom-front-left corner) in world units (meters). */
  position: Vec3;
  /** Rotation around the vertical (Z/up) axis, in radians. */
  rotationZ: number;
  /** Footprint/height in world units (meters). */
  width: number;
  depth: number;
  height: number;
  color: string;
  /** Id of the MasterModule this instance was placed from, if any. Enables "edit once, update all". */
  masterId?: string;
  locked?: boolean;
}

/** A reusable module template (like an AutoCAD block definition). Instances reference it by masterId. */
export interface MasterModuleDef {
  id: string;
  name: string;
  width: number;
  depth: number;
  height: number;
  color: string;
}

/** A flattened reference entity imported from DXF, drawn read-only in the 2D view. */
export type DxfEntity =
  | { kind: 'line'; from: [number, number]; to: [number, number] }
  | { kind: 'polyline'; points: [number, number][]; closed: boolean }
  | { kind: 'circle'; center: [number, number]; radius: number }
  | { kind: 'arc'; center: [number, number]; radius: number; startAngle: number; endAngle: number };

/** A reference mesh imported from STL/OBJ/glTF/STEP/IGES, shown read-only alongside modules in 3D. */
export interface ReferenceMesh {
  id: string;
  name: string;
  sourceFormat: string;
  /** three.js BufferGeometry, kept as `unknown` here to avoid a hard dependency on three in the core model. */
  geometry: unknown;
}
