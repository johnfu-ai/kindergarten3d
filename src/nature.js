// nature.js —— 树木 / 花草 / 围栏 / 校门 / 长椅 / 云朵 / 小鸟 / 蝴蝶
import * as THREE from 'three';
import { S } from './state.js';
import {
  C, GY, matOf, box, cyl, sph, shadow, shadowR, rand, pick, TAU, roundedRectShape,
} from './palette.js';
import { signTexture } from './textures.js';

const dummy = new THREE.Object3D();

// 树位置（避让各功能区）
const TREES = [
  [-34.5, -26], [-33.5, -8], [-34.5, 14], [-30, 24.5], [-20, 26.5], [-11, 26],
  [11, 26], [20, 26.5], [30, 24.5], [34.5, 18], [35, 4], [33.5, -14],
  [30, -25], [22.5, -26], [-2.3, -12.4], [2.3, -12.4], [-24, -12.5],
];
const BUSHES = [
  [-3.9, -14.5], [3.9, -14.5], [-17.5, -14.0], [17.5, -14.0],
  [8.8, 24.3], [-8.8, 24.3], [-2.3, 27.9], [2.3, 27.9], [-33, 6], [36.5, -4],
];
const FLOWER_PATCHES = [
  [-4.6, 27], [4.6, 27], [-12.5, -14.3], [12.5, -14.3],
  [-4.5, 14.5], [5, 12], [17, -7.5], [-26, 22.5], [31.5, 21], [9.5, -9],
];

export function buildNature() {
  const root = new THREE.Group();
  S.scene.add(root);

  buildTrees(root);
  buildFlowers(root);
  buildGrass(root);
  buildFence(root);
  buildGate(root);
  buildBenches(root);
  buildClouds(root);
  buildBirds(root);
  buildButterflies(root);
  return root;
}

// ================= 树木（实例化 + 摇摆） =================
function buildTrees(root) {
  const blobs = [];
  const trunks = [];
  for (const [x, z] of TREES) {
    const h = rand(4.6, 6.4);
    const tint = pick([C.leaf1, C.leaf2, C.leaf3]);
    trunks.push({ x, z, h: h * 0.52, r: rand(0.22, 0.3) });
    const n = randInt3();
    for (let k = 0; k < n; k++) {
      blobs.push({
        x: x + rand(-0.5, 0.5), y: h * 0.52 + h * 0.42 + k * 0.75 + rand(-0.2, 0.2), z: z + rand(-0.5, 0.5),
        s: rand(1.15, 1.6) - k * 0.18, col: tint, phase: rand(0, TAU),
      });
    }
  }
  for (const [x, z] of BUSHES) {
    blobs.push({ x, y: GY + 0.5, z, s: rand(0.65, 0.95), col: pick([C.leaf1, C.leaf3]), phase: rand(0, TAU) });
  }

  // 树干
  const trunkMesh = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.7, 1, 1, 8),
    matOf(C.trunk, { rough: 0.95, flat: true }), trunks.length);
  trunkMesh.castShadow = true; trunkMesh.receiveShadow = true;
  trunks.forEach((t, i) => {
    dummy.position.set(t.x, GY + t.h / 2, t.z);
    dummy.scale.set(t.r, t.h, t.r);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    trunkMesh.setMatrixAt(i, dummy.matrix);
  });
  root.add(trunkMesh);

  // 树冠（低多边形球 + 逐实例颜色）
  const blobMesh = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 1),
    new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), blobs.length);
  blobMesh.castShadow = true; blobMesh.receiveShadow = true;
  const col = new THREE.Color();
  blobs.forEach((b, i) => blobMesh.setColorAt(i, col.set(b.col)));
  root.add(blobMesh);

  S.ambient.push((dt, t) => {
    blobs.forEach((b, i) => {
      dummy.position.set(b.x, b.y, b.z);
      dummy.rotation.set(0, 0, Math.sin(t * 0.85 + b.phase) * 0.028);
      dummy.scale.setScalar(b.s);
      dummy.updateMatrix();
      blobMesh.setMatrixAt(i, dummy.matrix);
    });
    blobMesh.instanceMatrix.needsUpdate = true;
  });
}
function randInt3() { return 2 + Math.floor(rand(0, 1.99)); }

// ================= 花朵（实例化 + 摇摆） =================
function buildFlowers(root) {
  const items = [];
  const petalCols = ['#ff8a72', '#ffd166', '#ffa8c5', '#c3a6e8', '#ff9f68', '#ffffff', '#7cc6e8'];
  for (const [px, pz] of FLOWER_PATCHES) {
    const n = 9 + Math.floor(rand(0, 5));
    for (let k = 0; k < n; k++) {
      const a = rand(0, TAU), r = rand(0.2, 1.6);
      items.push({ x: px + Math.cos(a) * r, z: pz + Math.sin(a) * r, h: rand(0.42, 0.62), col: pick(petalCols), phase: rand(0, TAU) });
    }
  }
  const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.022, 0.03, 1, 5), matOf('#5fa852'), items.length);
  const heads = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.09, 0),
    new THREE.MeshStandardMaterial({ roughness: 0.8, flatShading: true }), items.length);
  const c = new THREE.Color();
  items.forEach((f, i) => heads.setColorAt(i, c.set(f.col)));
  root.add(stems); root.add(heads);
  S.ambient.push((dt, t) => {
    items.forEach((f, i) => {
      const sway = Math.sin(t * 1.6 + f.phase) * 0.05;
      dummy.rotation.set(0, 0, sway);
      dummy.scale.set(1, f.h, 1);
      dummy.position.set(f.x, GY + f.h / 2, f.z);
      dummy.updateMatrix();
      stems.setMatrixAt(i, dummy.matrix);
      dummy.position.set(f.x + sway * f.h * 0.5, GY + f.h + 0.04, f.z);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      heads.setMatrixAt(i, dummy.matrix);
    });
    stems.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;
  });
}

// ================= 草丛（实例化） =================
function buildGrass(root) {
  const items = [];
  let guard = 0;
  while (items.length < 230 && guard++ < 1600) {
    const x = rand(-36, 36), z = rand(-29, 29);
    if (inKeepOut(x, z)) continue;
    items.push({ x, z, s: rand(0.7, 1.35), rot: rand(0, TAU) });
  }
  const mesh = new THREE.InstancedMesh(new THREE.ConeGeometry(0.14, 0.4, 5),
    new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true }), items.length);
  const c = new THREE.Color();
  items.forEach((g, i) => mesh.setColorAt(i, c.set(pick(['#7cbf52', '#8fce62', '#96d86a']))));
  mesh.castShadow = false; mesh.receiveShadow = true;
  items.forEach((g, i) => {
    dummy.position.set(g.x, GY + 0.2 * g.s, g.z);
    dummy.rotation.set(0, g.rot, 0);
    dummy.scale.setScalar(g.s);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  root.add(mesh);
}

function inKeepOut(x, z) {
  // 主路 / 支路
  if (Math.abs(x) < 2.4 && z > -14.5 && z < 29.5) return true;
  if (z > 4.6 && z < 7.4 && x > -14.5 && x < -0.5) return true;
  if (z > 2.6 && z < 5.4 && x > 1.5 && x < 13) return true;
  // 楼房
  if (x > -16 && x < 16 && z > -29.5 && z < -15) return true;
  // 跑道椭圆（外接矩形粗判 + 椭圆细判）
  const ex = (x + 20) / 12.6, ez = (z - 8) / 10.4;
  if (ex * ex + ez * ez < 1) return true;
  // 游乐区地垫
  if (x > 8.6 && x < 31.4 && z > -6 && z < 14) return true;
  // 沙坑
  if (x > 22 && x < 28 && z > 8 && z < 13) return true;
  // 校门
  if (Math.abs(x) < 5.5 && z > 25.5) return true;
  // 风车
  if (Math.hypot(x - 26.5, z + 12) < 2.6) return true;
  return false;
}

// ================= 白栅栏 =================
function buildFence(root) {
  const picketM = matOf(C.fenceWhite, { rough: 0.85 });
  const FX = 36.2, FZ = 29.2;   // 栅栏线
  const pts = [];
  // 南侧（留门洞 |x|<3.4）
  for (let x = -FX; x <= FX; x += 0.62) {
    if (Math.abs(x) < 3.6) continue;
    pts.push([x, FZ]);
  }
  for (let z = FZ; z >= -FZ; z -= 0.62) { pts.push([FX, z]); pts.push([-FX, z]); }
  for (let x = -FX; x <= FX; x += 0.62) pts.push([x, -FZ]);

  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.13, 1.1, 0.07), picketM, pts.length);
  mesh.castShadow = true; mesh.receiveShadow = true;
  pts.forEach(([x, z], i) => {
    dummy.position.set(x, GY + 0.55, z);
    dummy.rotation.set(0, Math.abs(x) > 35 ? Math.PI / 2 : 0, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  root.add(mesh);
  // 横栏（东西北整段，南侧留门洞分两段）
  const railM = picketM;
  const addRailX = (len, x, z, y) => {
    const r = box(len, 0.09, 0.1, railM);
    r.position.set(x, y, z);
    shadow(r, true, false);
    root.add(r);
  };
  const addRailZ = (len, x, z, y) => {
    const r = box(0.1, 0.09, len, railM);
    r.position.set(x, y, z);
    shadow(r, true, false);
    root.add(r);
  };
  for (const y of [GY + 0.38, GY + 0.86]) {
    addRailX(FX * 2, 0, -FZ, y);                                  // 北
    addRailX(FX - 3.6, -(FX + 3.6) / 2, FZ, y);                   // 南左段
    addRailX(FX - 3.6, (FX + 3.6) / 2, FZ, y);                    // 南右段
    addRailZ(FZ * 2, FX, 0, y);                                   // 东
    addRailZ(FZ * 2, -FX, 0, y);                                  // 西
  }
}

// ================= 校门 =================
function buildGate(root) {
  const g = new THREE.Group();
  g.position.set(0, GY, 29.2);
  root.add(g);

  const pillarM = matOf('#f2785b', { rough: 0.85 });
  for (const px of [-3.4, 3.4]) {
    const p = box(0.9, 3.1, 0.9, pillarM);
    p.position.set(px, 1.55, 0);
    shadow(p, true, false);
    g.add(p);
    const cap = box(1.1, 0.28, 1.1, matOf(C.white));
    cap.position.set(px, 3.2, 0);
    g.add(cap);
    const ball = sph(0.24, matOf('#ffd166', { rough: 0.5 }), 12, 10);
    ball.position.set(px, 3.5, 0);
    shadow(ball, true, false);
    g.add(ball);
  }
  // 门楣 + 双语招牌
  const beam = box(8.2, 1.05, 0.55, matOf('#fff6e6'));
  beam.position.y = 3.85;
  shadow(beam, true, false);
  g.add(beam);
  const beamCap = box(8.5, 0.16, 0.65, matOf('#4ecdc4'));
  beamCap.position.y = 4.45;
  g.add(beamCap);
  const signTex = signTexture('阳光幼儿园', 'SUNSHINE KINDERGARTEN', {
    w: 1024, h: 200, cnSize: 92, enSize: 38, border: '#ff8a72', bg: '#fffdf6',
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 1.48),
    new THREE.MeshBasicMaterial({ map: signTex, transparent: true }));
  sign.position.set(0, 3.85, 0.33);
  g.add(sign);
  const sign2 = sign.clone();
  sign2.rotation.y = Math.PI;
  sign2.position.z = -0.33;
  g.add(sign2);

  // 打开的小铁门（装饰）
  const gateM = matOf('#4ecdc4', { rough: 0.6, metal: 0.2 });
  for (const side of [-1, 1]) {
    const leaf = new THREE.Group();
    leaf.position.set(side * 3.0, 0, 0.4);
    leaf.rotation.y = side * -1.15;
    g.add(leaf);
    const frameV = cyl(0.05, 0.05, 1.5, gateM, 8);
    frameV.position.set(side * 1.1, 0.75, 0);
    leaf.add(frameV);
    for (let k = 0; k < 4; k++) {
      const bar = cyl(0.03, 0.03, 1.3, gateM, 6);
      bar.position.set(side * (0.25 + k * 0.28), 0.68, 0);
      leaf.add(bar);
    }
    const barH = cyl(0.035, 0.035, 2.3, gateM, 6);
    barH.rotation.z = Math.PI / 2;
    barH.position.set(side * 0.62, 1.15, 0);
    leaf.add(barH);
    const barH2 = barH.clone(); barH2.position.y = 0.3;
    leaf.add(barH2);
  }

  // 彩旗串（两柱之间）
  const buntG = new THREE.Group();
  g.add(buntG);
  const line = cyl(0.015, 0.015, 6.4, matOf('#8a97a5', { metal: 0.3 }), 6);
  line.rotation.z = Math.PI / 2;
  line.position.y = 3.35;
  buntG.add(line);
  const flagCols = ['#ff8a72', '#ffd166', '#4ecdc4', '#7cc6e8', '#ffa8c5'];
  const flagGeo = new THREE.BufferGeometry();
  flagGeo.setAttribute('position', new THREE.Float32BufferAttribute([
    -0.16, 0, 0, 0.16, 0, 0, 0, -0.42, 0], 3));
  flagGeo.computeVertexNormals();
  const flags = new THREE.InstancedMesh(flagGeo,
    new THREE.MeshStandardMaterial({ roughness: 0.85, side: THREE.DoubleSide }), 12);
  for (let k = 0; k < 12; k++) {
    const fx = -2.85 + k * 0.52;
    const sag = Math.cos((fx / 3.1) * Math.PI / 2) * 0.22;
    dummy.position.set(fx, 3.33 - sag, 0);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    flags.setMatrixAt(k, dummy.matrix);
    flags.setColorAt(k, c3(flagCols[k % 5]));
  }
  buntG.add(flags);
  S.ambient.push((dt, t) => { buntG.rotation.x = Math.sin(t * 1.1) * 0.02; });
}
const _c = new THREE.Color();
function c3(hex) { return _c.set(hex).clone(); }

// ================= 长椅 =================
const BENCHES = [[-3.3, 13.5, Math.PI / 2], [3.3, 19.5, -Math.PI / 2], [-13.6, 6.5, Math.PI / 2], [20.3, 10.5, Math.PI / 2]];
function buildBenches(root) {
  const woodM = matOf(C.wood, { rough: 0.85 });
  const legM = matOf('#4ecdc4', { rough: 0.7 });
  for (const [x, z, ry] of BENCHES) {
    const g = new THREE.Group();
    g.position.set(x, GY, z);
    g.rotation.y = ry;
    root.add(g);
    const seat = box(1.8, 0.09, 0.5, woodM);
    seat.position.y = 0.5;
    shadow(seat, true, true);
    g.add(seat);
    const back = box(1.8, 0.5, 0.08, woodM);
    back.position.set(0, 0.82, -0.24);
    back.rotation.x = -0.15;
    shadow(back, true, false);
    g.add(back);
    for (const lx of [-0.75, 0.75]) {
      const l = box(0.09, 0.5, 0.42, legM);
      l.position.set(lx, 0.25, 0);
      g.add(l);
    }
    for (const lx of [-0.75, 0.75]) {
      const a = box(0.08, 0.08, 0.5, legM);
      a.position.set(lx, 0.72, -0.1);
      g.add(a);
    }
  }
}

// ================= 云朵 =================
const CLOUDS = [];
function buildClouds(root) {
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true });
  for (let i = 0; i < 12; i++) {
    const g = new THREE.Group();
    const n = 3 + Math.floor(rand(0, 2));
    for (let k = 0; k < n; k++) {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(k * rand(0.8, 1.3) - n * 0.55, rand(-0.15, 0.25), rand(-0.4, 0.4));
      m.scale.set(rand(0.8, 1.5), rand(0.5, 0.8), rand(0.8, 1.2));
      g.add(m);
    }
    // 集中在主视角可见的天区（相机在南侧向北看）
    g.position.set(rand(-58, 58), rand(17, 27), rand(-44, 14));
    g.userData.speed = rand(0.35, 0.8);
    root.add(g);
    CLOUDS.push(g);
  }
  S.ambient.push((dt, t) => {
    for (const c of CLOUDS) {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 72) c.position.x = -72;
    }
  });
}

// ================= 小鸟（间歇飞过） =================
function buildBirds(root) {
  const flock = new THREE.Group();
  flock.visible = false;
  root.add(flock);
  const bodyM = matOf('#5b6770', { rough: 0.9 });
  const beakM = matOf('#ff9f68');
  const birds = [];
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Group();
    b.position.set(i * 1.4 - 1.4, Math.abs(i - 1) * 0.7, i % 2 ? 0.8 : -0.8);
    flock.add(b);
    const body = sph(0.16, bodyM, 10, 8);
    body.scale.set(1.5, 1, 1);
    b.add(body);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 6), beakM);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.02, 0.24);
    b.add(beak);
    const wingGeo = new THREE.BufferGeometry();
    wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.12, 0, 0, 0.14, 0.42, 0.05, 0], 3));
    wingGeo.computeVertexNormals();
    const wl = new THREE.Mesh(wingGeo, new THREE.MeshStandardMaterial({ color: '#7d8a94', roughness: 0.9, side: THREE.DoubleSide }));
    const wr = wl.clone();
    wl.scale.x = -1;
    b.add(wl); b.add(wr);
    birds.push({ b, wl, wr, phase: rand(0, TAU) });
  }
  const state = { wait: rand(4, 9), t: 0, dur: 0, from: new THREE.Vector3(), to: new THREE.Vector3() };
  S.ambient.push((dt, t) => {
    for (const bd of birds) {
      const f = Math.sin(t * 9 + bd.phase) * 0.55;
      bd.wl.rotation.x = f; bd.wr.rotation.x = -f;
    }
    if (!flock.visible) {
      state.wait -= dt;
      if (state.wait <= 0) {
        flock.visible = true;
        state.dur = rand(11, 15);
        state.t = 0;
        const ltr = rand() > 0.5;
        state.from.set(ltr ? -70 : 70, rand(15, 21), rand(-30, 25));
        state.to.set(ltr ? 70 : -70, rand(15, 21), rand(-30, 25));
      }
    } else {
      state.t += dt;
      const u = state.t / state.dur;
      if (u >= 1) { flock.visible = false; state.wait = rand(9, 22); return; }
      flock.position.lerpVectors(state.from, state.to, u);
      flock.position.y += Math.sin(u * Math.PI * 3) * 0.8;
      const dir = state.to.clone().sub(state.from);
      flock.rotation.y = Math.atan2(dir.x, dir.z);
    }
  });
}

// ================= 蝴蝶 =================
function buildButterflies(root) {
  const spots = [[-4.6, 27], [12.5, -14.3], [8.8, 13.5]];
  const wingCols = ['#ffa8c5', '#7cc6e8'];
  for (let i = 0; i < 2; i++) {
    const b = new THREE.Group();
    root.add(b);
    const [sx, sz] = spots[i];
    const wingGeo = new THREE.BufferGeometry();
    wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.22, 0.1, -0.08, 0.2, -0.02, 0.14], 3));
    wingGeo.computeVertexNormals();
    const wm = new THREE.MeshStandardMaterial({ color: wingCols[i], roughness: 0.7, side: THREE.DoubleSide, flatShading: true });
    const wl = new THREE.Mesh(wingGeo, wm);
    const wr = wl.clone();
    wr.scale.x = -1;
    b.add(wl); b.add(wr);
    const bodyM = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.12, 3, 6), matOf('#4a3b52'));
    bodyM.rotation.x = Math.PI / 2;
    b.add(bodyM);
    const ph = rand(0, TAU);
    S.ambient.push((dt, t) => {
      const tt = t * 0.5 + ph;
      b.position.set(
        sx + Math.sin(tt * 1.7) * 2.2 + Math.sin(tt * 0.6) * 0.8,
        GY + 1.1 + Math.sin(tt * 2.3) * 0.45,
        sz + Math.cos(tt * 1.3) * 1.8 + Math.cos(tt * 0.8) * 0.6,
      );
      b.rotation.y = Math.atan2(Math.cos(tt * 1.7) * 1.7, -Math.sin(tt * 1.3) * 1.3);
      const f = Math.sin(t * 14 + ph) * 0.9;
      wl.rotation.x = f; wr.rotation.x = -f;
    });
  }
}
