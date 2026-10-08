// camera-manager.js —— 轨道相机控制 + 区域聚焦 + 跟随 + 自动漫游
import * as THREE from 'three';
import { S } from './state.js';
import { clamp, damp, dampAngle, TAU } from './palette.js';

export const AREAS = {
  panorama: { label: '全景 Panorama',    target: [0, 1.4, 4.5],   radius: 55, theta: 0.55, phi: 0.90 },
  sports:   { label: '操场 Sports Field', target: [-19, 0.6, 8], radius: 24, theta: 0.95, phi: 0.92 },
  play:     { label: '游乐区 Playground', target: [19.5, 0.8, 5],radius: 23, theta: 0.30, phi: 0.92 },
  classroom:{ label: '教室 Classroom',    target: [-8.5, 3.4, -19.5],radius: 12, theta: 0.35, phi: 1.26 },
  reading:  { label: '阅读区 Reading',    target: [8.5, 2.9, -19.5],radius: 9.8, theta: 0.80, phi: 1.29 },
  nap:      { label: '午休区 Nap Room',   target: [-8, 7.1, -20.5],radius: 17, theta: 0.38, phi: 1.16 },
};

const V3 = THREE.Vector3;

export class CamCtl {
  constructor(camera, dom) {
    this.cam = camera;
    this.dom = dom;

    // 当前状态
    this.target = new V3(0, 1.2, -3);
    this.theta = 0.55; this.phi = 0.98; this.radius = 47;
    // 期望状态（阻尼趋近）
    this.dTarget = this.target.clone();
    this.dTheta = this.theta; this.dPhi = this.phi; this.dRadius = this.radius;

    this.minR = 7; this.maxR = 92;
    this.minPhi = 0.30; this.maxPhi = 1.30;
    this.lambda = 2.4;          // 常规聚焦柔滑度
    this.userLambda = 10;       // 用户操作响应速度

    this.follow = null;         // { obj, track }
    this.area = 'panorama';
    this.tour = null;           // Tour 实例
    this.enabled = true;
    this.lastUserInput = -99;

    this._tmp = new V3();
    this._bindInput();
  }

  _bindInput() {
    const el = this.dom;
    this.pointers = new Map();
    this.dragInfo = { moved: 0, downX: 0, downY: 0, downT: 0 };

    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, btn: e.button });
      this.dragInfo.moved = 0;
      this.dragInfo.downX = e.clientX; this.dragInfo.downY = e.clientY;
      this.dragInfo.downT = performance.now();
      el.classList.add('dragging');
    });

    el.addEventListener('pointermove', (e) => {
      const p = this.pointers.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      this.dragInfo.moved += Math.abs(dx) + Math.abs(dy);

      if (this.pointers.size === 1) {
        if (p.btn === 2 || e.shiftKey) this._pan(dx, dy);
        else this._rotate(dx, dy);
      } else if (this.pointers.size === 2) {
        const pts = [...this.pointers.values()];
        const other = pts.find(q => q !== p);
        if (other) {
          const d0 = Math.hypot(p.x - other.x, p.y - other.y);
          const d1 = Math.hypot((p.x - dx) - other.x, (p.y - dy) - other.y);
          this._zoom((d1 - d0) * 0.02);
          this._pan(dx * 0.5, dy * 0.5);
        }
      }
    });

    const up = (e) => {
      this.pointers.delete(e.pointerId);
      if (this.pointers.size === 0) el.classList.remove('dragging');
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      this._zoom(e.deltaY * 0.0016);
    }, { passive: false });
  }

  _rotate(dx, dy) {
    this.userActed();
    this.dTheta -= dx * 0.0052;
    this.dPhi = clamp(this.dPhi - dy * 0.0038, this.minPhi, this.maxPhi);
    this.theta = this.dTheta; this.phi = this.dPhi; // 旋转操作即时反馈
  }

  _pan(dx, dy) {
    this.userActed();
    const k = this.radius * 0.0012;
    const sinT = Math.sin(this.theta), cosT = Math.cos(this.theta);
    this.dTarget.x -= (dx * cosT) * k;
    this.dTarget.z -= (-dx * sinT) * k;
    this.dTarget.y = clamp(this.dTarget.y + dy * k, 0, 14);
    // 限制在园区范围内
    this.dTarget.x = clamp(this.dTarget.x, -40, 40);
    this.dTarget.z = clamp(this.dTarget.z, -34, 34);
    this.target.lerp(this.dTarget, 0.35);
  }

  _zoom(d) {
    this.userActed();
    d = clamp(d, -0.3, 0.3);   // 限制单次缩放幅度，避免飞过头
    this.dRadius = clamp(this.dRadius * (1 + d), this.minR, this.maxR);
  }

  userActed() {
    this.lastUserInput = S.time;
    if (S.tour) {
      S.tour = null;
      S.flags.tour = false;
      window.dispatchEvent(new CustomEvent('tour-off'));
    }
  }

  focus(areaName, opts = {}) {
    const a = AREAS[areaName];
    if (!a) return;
    this.area = areaName;
    this.follow = null;
    this.dTarget.set(...a.target);
    this.dRadius = a.radius;
    // theta 走最短弧
    let d = (a.theta - this.dTheta) % TAU;
    if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU;
    this.dTheta += d;
    this.dPhi = a.phi;
    this.lambda = opts.snappy ? 3.4 : 2.4;
  }

  followPerson(person) {
    this.follow = { obj: person.root, track: !person.data.indoor };
    person.root.getWorldPosition(this.dTarget);
    this.dRadius = person.data.indoor ? 8.5 : 5.2;
    this.dPhi = 1.08;
    this.area = null;
    this.lambda = 2.2;
  }

  update(dt) {
    const L = this.lambda;
    if (this.follow && this.follow.track) {
      this.follow.obj.getWorldPosition(this.dTarget);
    }
    this.target.x = damp(this.target.x, this.dTarget.x, L, dt);
    this.target.y = damp(this.target.y, this.dTarget.y, L, dt);
    this.target.z = damp(this.target.z, this.dTarget.z, L, dt);
    this.theta = dampAngle(this.theta, this.dTheta, Math.max(L, 3), dt);
    this.phi = damp(this.phi, this.dPhi, Math.max(L, 3), dt);
    this.radius = damp(this.radius, this.dRadius, 4.2, dt);

    const sp = Math.sin(this.phi), cp = Math.cos(this.phi);
    this.cam.position.set(
      this.target.x + this.radius * sp * Math.sin(this.theta),
      this.target.y + this.radius * cp,
      this.target.z + this.radius * sp * Math.cos(this.theta),
    );
    // 防止钻入地面
    if (this.cam.position.y < 2.2) this.cam.position.y = 2.2;
    this.cam.lookAt(this.target);
  }

  /** 开场：从高空远处滑入 */
  intro() {
    this.theta = 1.65; this.phi = 0.52; this.radius = 110;
    this.target.set(0, 8, -10);
    this.dTarget.set(...AREAS.panorama.target);
    this.dTheta = AREAS.panorama.theta;
    this.dPhi = AREAS.panorama.phi;
    this.dRadius = AREAS.panorama.radius;
    this.lambda = 1.6;
  }
}

/** 自动漫游：全景 → 操场 → 游乐区 → 教室 → 阅读区 循环 */
export class Tour {
  constructor(camCtl) {
    this.cam = camCtl;
    this.stops = ['panorama', 'sports', 'play', 'classroom', 'reading'];
    this.dwell = [5.5, 6, 6, 5.5, 5];   // 每站停留（含过渡）
    this.i = -1;
    this.t = 0;
    this.next();
  }
  next() {
    this.i = (this.i + 1) % this.stops.length;
    this.t = 0;
    this.cam.focus(this.stops[this.i], { snappy: false });
    window.dispatchEvent(new CustomEvent('tour-stop', { detail: { area: this.stops[this.i] } }));
  }
  update(dt) {
    this.t += dt;
    if (this.t >= this.dwell[this.i]) this.next();
  }
}
