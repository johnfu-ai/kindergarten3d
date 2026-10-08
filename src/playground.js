// playground.js —— 滑梯 / 秋千 / 跷跷板 / 沙坑 / 风车
import * as THREE from 'three';
import { S } from './state.js';
import {
  C, GY, matOf, box, cyl, sph, shadow, shadowR, roundedRectShape, rand, TAU,
} from './palette.js';

// ---------- 供 behaviors.js 使用的锚点 ----------
export const SLIDE = { origin: new THREE.Vector3(14.5, GY, -1), curve: null, ladder: new THREE.Vector3(0, 0, -0.8), exit: new THREE.Vector3(0, 0, 4.1) };
export const SWING = { origin: new THREE.Vector3(25.5, GY, 0.5), seats: [] };
export const SEESAW = { origin: new THREE.Vector3(15, GY, 8), plank: null, seats: [new THREE.Vector3(-1.42, -0.38, 0), new THREE.Vector3(1.42, -0.38, 0)] };
export const SANDPIT = { origin: new THREE.Vector3(25, GY, 10.5), edges: [[-1.4, 2.0], [1.4, 2.0], [-1.4, -2.0], [1.4, -2.0], [0, 2.3]] };

export function buildPlayground() {
  const root = new THREE.Group();
  S.scene.add(root);

  buildSlide(root);
  buildSwings(root);
  buildSeesaw(root);
  buildSandpit(root);
  buildWindmill(root);
  return root;
}

// ================= 滑梯 =================
function ribbonGeo(curve, width, segs = 28) {
  const pos = [], uvs = [], idx = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const p = curve.getPointAt(u);
    const t = curve.getTangentAt(u);
    const side = new THREE.Vector3().crossVectors(up, t).normalize();
    pos.push(p.x - side.x * width / 2, p.y, p.z - side.z * width / 2);
    pos.push(p.x + side.x * width / 2, p.y, p.z + side.z * width / 2);
    uvs.push(0, u, 1, u);
    if (i > 0) {
      const a = (i - 1) * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function buildSlide(root) {
  const g = new THREE.Group();
  g.position.copy(SLIDE.origin);
  root.add(g);

  const yellow = matOf('#ffd166', { rough: 0.75 });
  const coral = matOf(C.accentCoral, { rough: 0.8 });
  const mint = matOf('#7fe0c3', { rough: 0.8 });
  const white = matOf(C.white, { rough: 0.7 });

  // 滑道曲线（局部坐标）
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 2.30, 0.15),
    new THREE.Vector3(0, 2.12, 0.85),
    new THREE.Vector3(0, 1.55, 1.80),
    new THREE.Vector3(0, 0.80, 2.75),
    new THREE.Vector3(0, 0.30, 3.55),
    new THREE.Vector3(0, 0.20, 3.95),
  ]);
  SLIDE.curve = curve;

  // 滑道床 + 侧栏
  const bed = new THREE.Mesh(ribbonGeo(curve, 1.06, 30),
    new THREE.MeshStandardMaterial({ color: '#ffd166', roughness: 0.75, side: THREE.DoubleSide }));
  bed.castShadow = true; bed.receiveShadow = true;
  g.add(bed);
  for (const sx of [-0.55, 0.55]) {
    const railPts = curve.points.map(p => new THREE.Vector3(p.x + sx, p.y + 0.14, p.z));
    const rail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(railPts), 24, 0.075, 8), coral);
    rail.castShadow = true;
    g.add(rail);
  }

  // 平台
  const plat = box(1.5, 0.14, 1.5, mint);
  plat.position.set(0, 2.33, -0.55);
  shadow(plat, true, false);
  g.add(plat);
  // 平台栏杆
  for (const rz of [-1.2, 0.1]) {
    const r = box(1.5, 0.08, 0.08, coral);
    r.position.set(0, 3.25, rz);
    g.add(r);
  }
  for (const rx of [-0.71, 0.71]) {
    const r = box(0.08, 0.08, 1.3, coral);
    r.position.set(rx, 3.25, -0.55);
    g.add(r);
    for (const rz of [-1.15, -0.55, 0.05]) {
      const p = cyl(0.045, 0.045, 0.85, white, 8);
      p.position.set(rx, 2.82, rz);
      g.add(p);
    }
  }
  // 平台 + 滑道支柱
  for (const [px, pz] of [[-0.65, -1.15], [0.65, -1.15], [-0.68, 1.3], [0.68, 1.3], [-0.6, 2.6], [0.6, 2.6]]) {
    const post = cyl(0.09, 0.11, 2.33, white, 10);
    post.position.set(px, 2.33 / 2, pz);
    shadow(post, true, false);
    g.add(post);
  }
  // 小屋顶
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.45, 0.85, 4), coral);
  roof.position.set(0, 3.85, -0.55);
  roof.rotation.y = Math.PI / 4;
  shadow(roof, true, false);
  g.add(roof);
  for (const [px, pz] of [[-0.6, -1.1], [0.6, -1.1], [-0.6, 0], [0.6, 0]]) {
    const p = cyl(0.05, 0.05, 0.6, white, 8);
    p.position.set(px, 3.5, pz);
    g.add(p);
  }

  // 爬梯（北侧，从地面爬上平台）
  for (const lx of [-0.42, 0.42]) {
    const rail = cyl(0.055, 0.055, 2.6, mint, 8);
    rail.position.set(lx, 1.22, -1.65);
    rail.rotation.x = 0.155;
    g.add(rail);
  }
  for (let k = 0; k < 7; k++) {
    const rung = cyl(0.05, 0.05, 0.84, white, 8);
    rung.rotation.z = Math.PI / 2;
    rung.position.set(0, 0.34 + k * 0.32, -1.82 + k * 0.062);
    g.add(rung);
  }
}

// ================= 秋千 =================
function buildSwings(root) {
  const g = new THREE.Group();
  g.position.copy(SWING.origin);
  root.add(g);

  const frameM = matOf('#4ecdc4', { roughness: 0.75 });
  const woodM = matOf(C.wood, { rough: 0.85 });
  const chainM = matOf('#8a97a5', { rough: 0.5, metal: 0.4 });

  const BAR_Y = 2.75, HALF = 2.6;
  // A 字支架×2 + 顶梁（沿 x 轴，秋千朝 z 向摆）
  for (const bz of [-1.3, 1.3]) {
    for (const dx of [-1, 1]) {
      const leg = cyl(0.09, 0.11, 3.4, frameM, 10);
      leg.position.set(dx * HALF * 0.72, BAR_Y / 2 - 0.1, bz * 0.62);
      leg.rotation.x = bz * -0.42;
      leg.rotation.z = dx * -0.18;
      shadow(leg, true, false);
      g.add(leg);
    }
  }
  const bar = cyl(0.09, 0.09, HALF * 2 + 1.6, frameM, 10);
  bar.rotation.z = Math.PI / 2;
  bar.position.y = BAR_Y;
  shadow(bar, true, false);
  g.add(bar);
  // 顶梁彩旗小顶
  const cap = box(HALF * 2 + 1.6, 0.12, 0.4, matOf(C.accentCoral));
  cap.position.y = BAR_Y + 0.14;
  g.add(cap);

  // 3 个座位
  for (let i = 0; i < 3; i++) {
    const sx = (i - 1) * 1.55;
    const pivot = new THREE.Group();
    pivot.position.set(sx, BAR_Y, 0);
    g.add(pivot);
    for (const cx of [-0.3, 0.3]) {
      const chain = cyl(0.028, 0.028, 1.85, chainM, 6);
      chain.position.set(cx, -0.92, 0);
      pivot.add(chain);
    }
    const seat = box(0.78, 0.09, 0.34, woodM);
    seat.position.set(0, -1.85, 0);
    shadow(seat, true, false);
    pivot.add(seat);

    SWING.seats.push({ pivot, phase: rand(0, TAU), amp: 0.5 + i * 0.02, occupied: false });
  }

  // 秋千自主摆动（空座也轻摆）
  S.ambient.push((dt, t) => {
    for (const s of SWING.seats) {
      const amp = s.occupied ? s.amp : 0.1;
      const w = s.occupied ? 1.35 : 0.7;
      s.pivot.rotation.x = amp * Math.sin(t * w + s.phase);
    }
  });
}

/** 把小朋友挂到秋千上（behaviors 调用） */
export function mountSwingKid(seatIdx, person) {
  const s = SWING.seats[seatIdx];
  s.occupied = true;
  person.root.parent = null;
  s.pivot.add(person.root);
  person.root.position.set(0, -2.3, 0.06);   // 臀部落在座板上
  person.root.rotation.set(0, 0, 0);
  person.yMode = 'parented';
  person.parentedY = -2.3;
  return s;
}

// ================= 跷跷板 =================
function buildSeesaw(root) {
  const g = new THREE.Group();
  g.position.copy(SEESAW.origin);
  root.add(g);

  const frameM = matOf('#ff9f68', { rough: 0.8 });
  // 三角支座
  for (const dz of [-0.55, 0.55]) {
    const tri = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.15, 3), frameM);
    tri.position.set(0, 0.42, dz);
    tri.rotation.z = Math.PI / 2;
    tri.scale.set(1, 1, 0.55);
    shadow(tri, true, false);
    g.add(tri);
  }
  const axle = cyl(0.07, 0.07, 1.3, matOf('#8a97a5', { metal: 0.4, rough: 0.5 }), 10);
  axle.rotation.x = Math.PI / 2;
  axle.position.y = 0.78;
  g.add(axle);

  const plank = new THREE.Group();
  plank.position.y = 0.8;
  g.add(plank);
  SEESAW.plank = plank;
  const board = box(4.6, 0.12, 0.5, matOf(C.wood, { rough: 0.85 }));
  shadow(board, true, false);
  plank.add(board);
  for (const ex of [-1.45, 1.45]) {
    const seatPad = box(0.6, 0.06, 0.5, matOf(ex < 0 ? C.rubberTeal : C.accentPink, { rough: 0.9 }));
    seatPad.position.set(ex, 0.09, 0);
    plank.add(seatPad);
    const handle = new THREE.Group();
    handle.position.set(ex + (ex < 0 ? 0.45 : -0.45), 0, 0);
    plank.add(handle);
    const h1 = cyl(0.04, 0.04, 0.5, matOf('#ff9f68'), 8);
    h1.position.y = 0.25;
    handle.add(h1);
    const h2 = cyl(0.045, 0.045, 0.3, matOf('#ff9f68'), 8);
    h2.rotation.x = Math.PI / 2;
    h2.position.set(0, 0.48, 0.14);
    handle.add(h2);
  }
  // 跷跷板自主起伏
  S.ambient.push((dt, t) => {
    plank.rotation.z = 0.235 * Math.sin(t * 1.35 + 0.6);
  });
}

/** 把小朋友挂到跷跷板上 */
export function mountSeesawKid(seatIdx, person) {
  const p = SEESAW.seats[seatIdx];
  SEESAW.plank.add(person.root);
  person.root.position.set(p.x, p.y, 0.1);
  person.root.rotation.set(0, seatIdx === 0 ? Math.PI / 2 : -Math.PI / 2, 0);
  person.yMode = 'parented';
  person.parentedY = p.y;
}

// ================= 沙坑 =================
function buildSandpit(root) {
  const g = new THREE.Group();
  g.position.copy(SANDPIT.origin);
  root.add(g);

  // 沙面
  const sandGeo = new THREE.ShapeGeometry(roundedRectShape(4.4, 3.4, 0.9), 10);
  const sand = new THREE.Mesh(sandGeo, matOf(C.sand, { rough: 0.98 }));
  sand.rotation.x = -Math.PI / 2;
  sand.position.y = 0.09;
  shadowR(sand);
  g.add(sand);
  // 白色围边
  const edgeM = matOf(C.white, { rough: 0.85 });
  const edge = (w, d, x, z) => {
    const m = box(w, 0.24, d, edgeM);
    m.position.set(x, 0.12, z);
    shadow(m, true, true);
    g.add(m);
  };
  edge(4.8, 0.35, 0, -1.72); edge(4.8, 0.35, 0, 1.72);
  edge(0.35, 3.1, -2.22, 0); edge(0.35, 3.1, 2.22, 0);
  // 玩具：小桶 / 铲子 / 沙堆 / 模子
  const bucket = cyl(0.24, 0.18, 0.34, matOf(C.rubberBlue, { rough: 0.8 }), 12);
  bucket.position.set(-0.7, 0.26, 0.6);
  shadow(bucket, true, false);
  g.add(bucket);
  const shovel = cyl(0.035, 0.035, 0.8, matOf(C.accentCoral), 8);
  shovel.rotation.z = 1.2;
  shovel.position.set(0.9, 0.14, -0.7);
  g.add(shovel);
  const pile = sph(0.42, matOf(C.sand, { rough: 1 }), 12, 8);
  pile.scale.y = 0.5;
  pile.position.set(0.6, 0.14, 0.8);
  shadow(pile, true, false);
  g.add(pile);
  for (const [mx, mz, col] of [[-1.2, -0.7, '#ffd166'], [1.4, 0.4, '#ffa8c5']]) {
    const mold = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.3, 8), matOf(col, { rough: 0.85 }));
    mold.position.set(mx, 0.24, mz);
    shadow(mold, true, false);
    g.add(mold);
  }
}

// ================= 风车 =================
function buildWindmill(root) {
  const g = new THREE.Group();
  g.position.set(26.5, GY, -12);
  g.rotation.y = 0.45;   // 面向西南（镜头方向）
  root.add(g);

  const body = cyl(1.15, 0.72, 3.4, matOf('#fff6e6', { rough: 0.9 }), 12);
  body.position.y = 1.7;
  shadow(body, true, false);
  g.add(body);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.9, 12), matOf(C.roof, { rough: 0.85 }));
  cap.position.y = 3.85;
  shadow(cap, true, false);
  g.add(cap);
  // 门 + 窗
  const door = box(0.55, 0.9, 0.1, matOf(C.woodDark));
  door.position.set(0, 0.45, 0.85);
  door.rotation.x = -0.16;
  g.add(door);
  const win = new THREE.Mesh(new THREE.CircleGeometry(0.26, 16), matOf('#cfeaff', { rough: 0.3 }));
  win.position.set(0, 2.4, 0.98);
  g.add(win);
  // 平台
  const deck = cyl(1.5, 1.6, 0.18, matOf(C.wood), 14);
  deck.position.y = 0.1;
  g.add(deck);

  // 风叶
  const blades = new THREE.Group();
  blades.position.set(0, 3.1, 1.05);
  g.add(blades);
  const hub = sph(0.16, matOf(C.woodDark), 10, 8);
  blades.add(hub);
  const bladeCols = ['#ff8a72', '#ffd166', '#4ecdc4', '#c3a6e8'];
  for (let k = 0; k < 4; k++) {
    const arm = new THREE.Group();
    arm.rotation.z = k * Math.PI / 2;
    blades.add(arm);
    const rod = box(0.09, 1.75, 0.05, matOf(C.woodDark));
    rod.position.y = 0.85;
    arm.add(rod);
    const sail = box(0.5, 1.3, 0.04, matOf(bladeCols[k], { rough: 0.85 }));
    sail.position.set(0.28, 1.0, 0);
    arm.add(sail);
  }
  S.ambient.push((dt) => { blades.rotation.z += dt * 0.75; });
}
