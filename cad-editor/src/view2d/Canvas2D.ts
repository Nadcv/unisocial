import type { CadDocument } from '../core/Document';
import type { ModuleDef } from '../core/types';

const HANDLE_SIZE = 8;

type DragMode = { kind: 'move'; startX: number; startY: number; origins: Map<string, { x: number; y: number }> }
  | { kind: 'resize'; id: string; startX: number; startY: number; origin: { width: number; depth: number } }
  | { kind: 'pan'; startX: number; startY: number; originOffset: { x: number; y: number } }
  | null;

/**
 * Top-down (plan) 2D editor. World units are meters; screen units are pixels.
 * Renders imported DXF reference geometry plus editable module rectangles.
 */
export class Canvas2D {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private doc: CadDocument;
  private scale = 60; // px per meter
  private offset = { x: 0, y: 0 }; // world origin position on screen, in px
  private drag: DragMode = null;
  private resizeObserver: ResizeObserver;

  constructor(container: HTMLElement, doc: CadDocument) {
    this.doc = doc;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'view-canvas';
    container.appendChild(this.canvas);
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D context unavailable');
    this.ctx = ctx;

    this.offset = { x: container.clientWidth / 2, y: container.clientHeight / 2 };

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();

    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });

    doc.events.on('change', () => this.render());
    doc.events.on('selectionChange', () => this.render());
  }

  dispose(): void {
    this.resizeObserver.disconnect();
  }

  private resize(): void {
    const parent = this.canvas.parentElement!;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = parent.clientWidth * dpr;
    this.canvas.height = parent.clientHeight * dpr;
    this.canvas.style.width = `${parent.clientWidth}px`;
    this.canvas.style.height = `${parent.clientHeight}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.render();
  }

  private worldToScreen(wx: number, wy: number): [number, number] {
    return [this.offset.x + wx * this.scale, this.offset.y - wy * this.scale];
  }

  private screenToWorld(sx: number, sy: number): [number, number] {
    return [(sx - this.offset.x) / this.scale, -(sy - this.offset.y) / this.scale];
  }

  private eventToCanvasXY(ev: MouseEvent): [number, number] {
    const rect = this.canvas.getBoundingClientRect();
    return [ev.clientX - rect.left, ev.clientY - rect.top];
  }

  private moduleAt(wx: number, wy: number): ModuleDef | undefined {
    const list = [...this.doc.modules.values()];
    for (let i = list.length - 1; i >= 0; i--) {
      const m = list[i];
      const local = this.toLocal(m, wx, wy);
      if (local.x >= 0 && local.x <= m.width && local.y >= 0 && local.y <= m.depth) return m;
    }
    return undefined;
  }

  private toLocal(m: ModuleDef, wx: number, wy: number): { x: number; y: number } {
    const dx = wx - m.position.x;
    const dy = wy - m.position.y;
    const cos = Math.cos(-m.rotationZ);
    const sin = Math.sin(-m.rotationZ);
    return { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
  }

  private resizeHandleScreen(m: ModuleDef): [number, number] {
    const cos = Math.cos(m.rotationZ);
    const sin = Math.sin(m.rotationZ);
    const wx = m.position.x + m.width * cos - m.depth * sin;
    const wy = m.position.y + m.width * sin + m.depth * cos;
    return this.worldToScreen(wx, wy);
  }

  private onMouseDown = (ev: MouseEvent): void => {
    const [sx, sy] = this.eventToCanvasXY(ev);
    const [wx, wy] = this.screenToWorld(sx, sy);

    if (ev.button === 1 || ev.shiftKey) {
      this.drag = { kind: 'pan', startX: sx, startY: sy, originOffset: { ...this.offset } };
      return;
    }

    // Check resize handle on the (single) selected module first.
    if (this.doc.selectedIds.size === 1) {
      const id = [...this.doc.selectedIds][0];
      const m = this.doc.modules.get(id);
      if (m) {
        const [hx, hy] = this.resizeHandleScreen(m);
        if (Math.hypot(hx - sx, hy - sy) <= HANDLE_SIZE) {
          this.drag = { kind: 'resize', id, startX: wx, startY: wy, origin: { width: m.width, depth: m.depth } };
          return;
        }
      }
    }

    const hit = this.moduleAt(wx, wy);
    if (hit) {
      if (!this.doc.selectedIds.has(hit.id)) {
        this.doc.setSelection(ev.ctrlKey || ev.metaKey ? [...this.doc.selectedIds, hit.id] : [hit.id]);
      }
      const origins = new Map<string, { x: number; y: number }>();
      for (const id of this.doc.selectedIds) {
        const mod = this.doc.modules.get(id);
        if (mod) origins.set(id, { x: mod.position.x, y: mod.position.y });
      }
      this.drag = { kind: 'move', startX: wx, startY: wy, origins };
    } else {
      this.doc.setSelection([]);
    }
  };

  private onMouseMove = (ev: MouseEvent): void => {
    if (!this.drag) return;
    const [sx, sy] = this.eventToCanvasXY(ev);

    if (this.drag.kind === 'pan') {
      this.offset = { x: this.drag.originOffset.x + (sx - this.drag.startX), y: this.drag.originOffset.y + (sy - this.drag.startY) };
      this.render();
      return;
    }

    const [wx, wy] = this.screenToWorld(sx, sy);

    if (this.drag.kind === 'move') {
      const dx = wx - this.drag.startX;
      const dy = wy - this.drag.startY;
      for (const [id, origin] of this.drag.origins) {
        const mod = this.doc.modules.get(id);
        if (mod) mod.position = { ...mod.position, x: origin.x + dx, y: origin.y + dy };
      }
      this.doc.events.emit('change', { reason: 'drag-move' });
      return;
    }

    if (this.drag.kind === 'resize') {
      const mod = this.doc.modules.get(this.drag.id);
      if (mod) {
        const local = this.toLocal(mod, wx, wy);
        mod.width = Math.max(0.05, local.x);
        mod.depth = Math.max(0.05, local.y);
      }
      this.doc.events.emit('change', { reason: 'drag-resize' });
    }
  };

  private onMouseUp = (): void => {
    this.drag = null;
  };

  private onWheel = (ev: WheelEvent): void => {
    ev.preventDefault();
    const [sx, sy] = this.eventToCanvasXY(ev);
    const [wxBefore, wyBefore] = this.screenToWorld(sx, sy);
    const factor = ev.deltaY < 0 ? 1.1 : 1 / 1.1;
    this.scale = Math.min(800, Math.max(5, this.scale * factor));
    const [wxAfter, wyAfter] = this.screenToWorld(sx, sy);
    this.offset.x += (wxAfter - wxBefore) * this.scale;
    this.offset.y -= (wyAfter - wyBefore) * this.scale;
    this.render();
  };

  render(): void {
    const ctx = this.ctx;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#1e1e24';
    ctx.fillRect(0, 0, w, h);

    this.drawGrid(w, h);
    this.drawDxfEntities();
    for (const mod of this.doc.modules.values()) this.drawModule(mod);
  }

  private drawGrid(w: number, h: number): void {
    const ctx = this.ctx;
    const step = this.scale >= 40 ? 1 : this.scale >= 15 ? 5 : 10;
    ctx.strokeStyle = '#2c2c34';
    ctx.lineWidth = 1;
    const worldLeft = this.screenToWorld(0, 0)[0];
    const worldRight = this.screenToWorld(w, 0)[0];
    const worldTop = this.screenToWorld(0, 0)[1];
    const worldBottom = this.screenToWorld(0, h)[1];

    ctx.beginPath();
    for (let x = Math.floor(worldLeft / step) * step; x <= worldRight; x += step) {
      const [sx] = this.worldToScreen(x, 0);
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, h);
    }
    for (let y = Math.floor(worldBottom / step) * step; y <= worldTop; y += step) {
      const [, sy] = this.worldToScreen(0, y);
      ctx.moveTo(0, sy);
      ctx.lineTo(w, sy);
    }
    ctx.stroke();

    // Axes
    ctx.strokeStyle = '#454552';
    ctx.lineWidth = 1.5;
    const [ox, oy] = this.worldToScreen(0, 0);
    ctx.beginPath();
    ctx.moveTo(0, oy);
    ctx.lineTo(w, oy);
    ctx.moveTo(ox, 0);
    ctx.lineTo(ox, h);
    ctx.stroke();
  }

  private drawDxfEntities(): void {
    const ctx = this.ctx;
    ctx.strokeStyle = '#5b8cff';
    ctx.lineWidth = 1;
    for (const e of this.doc.dxfEntities) {
      ctx.beginPath();
      if (e.kind === 'line') {
        const [x1, y1] = this.worldToScreen(...e.from);
        const [x2, y2] = this.worldToScreen(...e.to);
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      } else if (e.kind === 'polyline') {
        e.points.forEach((p, i) => {
          const [x, y] = this.worldToScreen(...p);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        if (e.closed) ctx.closePath();
      } else if (e.kind === 'circle') {
        const [cx, cy] = this.worldToScreen(...e.center);
        ctx.arc(cx, cy, e.radius * this.scale, 0, Math.PI * 2);
      } else if (e.kind === 'arc') {
        const [cx, cy] = this.worldToScreen(...e.center);
        ctx.arc(cx, cy, e.radius * this.scale, -e.endAngle, -e.startAngle);
      }
      ctx.stroke();
    }
  }

  private drawModule(m: ModuleDef): void {
    const ctx = this.ctx;
    const [x, y] = this.worldToScreen(m.position.x, m.position.y);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-m.rotationZ);

    const pw = m.width * this.scale;
    const pd = m.depth * this.scale;
    const selected = this.doc.selectedIds.has(m.id);

    ctx.fillStyle = m.color + '55';
    ctx.fillRect(0, -pd, pw, pd);
    ctx.strokeStyle = selected ? '#ffd25b' : m.color;
    ctx.lineWidth = selected ? 2.5 : 1.5;
    ctx.strokeRect(0, -pd, pw, pd);

    ctx.fillStyle = '#e8e8f0';
    ctx.font = '12px sans-serif';
    ctx.fillText(m.name, 4, -pd + 14);

    if (selected) {
      ctx.fillStyle = '#ffd25b';
      ctx.beginPath();
      ctx.arc(pw, 0, HANDLE_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
