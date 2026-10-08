// building.js —— 幼儿园主楼（2层 + 大玻璃窗 + 室内家具 + 楼顶装饰）
import * as THREE from 'three';
import { S } from './state.js';
import {
  C, GY, matOf, box, cyl, sph, shadow, shadowR, rand, pick, TAU,
} from './palette.js';
import { signTexture, blackboardTexture, muralTexture, clockTexture } from './textures.js';

// 楼体参数
const BX = 15, BZ0 = -28, BZ1 = -16;          // x ∈ [-15,15], z ∈ [-28,-16]
const F1 = GY, FH = 3.4;                       // 一层地面 / 层高
const F2 = F1 + FH;                            // 二层地面 6.0
const WT = 0.4;                                // 墙厚

const BAY_W = 3.5, PILLAR_W = 0.65, BAY_STEP = 4.15;
const BAY_X = i => (i - 3) * BAY_STEP;         // 7 个开间，门在正中

// 室内布置锚点（behaviors.js 使用）
export const INTERIOR = {
  tables: [{ x: -10.5, z: -19.4 }, { x: -6.3, z: -21.8 }],
  stoolOffsets: [[1.12, 0], [-1.12, 0], [0, 1.12], [0, -1.12]],
  cushions: [{ x: 4.8, z: -18.9, rot: 0.5 }, { x: 8.5, z: -19.1, rot: -0.4 }, { x: 13.0, z: -18.9, rot: 0.3 }],
  cots: [{ x: -11.6, z: -18.7 }, { x: -7.9, z: -18.9 }, { x: -4.4, z: -18.7 }, { x: -11.6, z: -22.6 }],
  teacherSpots: [{ x: -8.4, z: -19.6 }, { x: -10.8, z: -21.6 }, { x: -4.6, z: -19.3 }],
  board: { x: -13.85, z: -22.5 },
  actTable: { x: 8.5, z: -21.5 },
};

const glassMat = new THREE.MeshPhongMaterial({
  color: 0xcfeaff, transparent: true, opacity: 0.24, shininess: 90,
  depthWrite: false, side: THREE.DoubleSide,
});

function wallBox(g, w, h, d, x, y, z, mat, cast = true) {
  const m = box(w, h, d, mat);
  m.position.set(x, y, z);
  shadow(m, cast, true);
  g.add(m);
  return m;
}

/** 一扇大窗：玻璃 + 白框 + 中梃（面朝 +Z 摆放，可整体旋转） */
function makeWindow(w, h) {
  const g = new THREE.Group();
  const pane = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), glassMat);
  pane.castShadow = false; pane.receiveShadow = false;
  pane.renderOrder = 20;
  g.add(pane);
  const fm = matOf(C.white, { rough: 0.6 });
  const t = 0.1;
  const parts = [
    [w + t * 2, t, t, 0, h / 2 + t / 2], [w + t * 2, t, t, 0, -h / 2 - t / 2],
    [t, h + t * 2, t, -w / 2 - t / 2, 0], [t, h + t * 2, t, w / 2 + t / 2, 0],
    [t * 0.7, h, t * 0.8, 0, 0], [w, t * 0.7, t * 0.8, 0, 0],
  ];
  for (const [pw, ph, pd, px, py] of parts) {
    const m = box(pw, ph, pd, fm);
    m.position.set(px, py, 0);
    shadow(m, true, false);
    g.add(m);
  }
  return g;
}

export function buildBuilding() {
  const scene = S.scene;
  const root = new THREE.Group();
  scene.add(root);
  const wallM = matOf(C.wall, { rough: 0.92 });
  const wallIn = matOf(C.wallShade, { rough: 0.95 });

  const SILL1 = 0.95, WIN1_TOP = 3.05;              // 一层窗带
  const SILL2 = F2 + 0.85, WIN2_TOP = F2 + 3.0;     // 二层窗带
  const FLOOR_TOP = F2 + FH;                        // 9.6? F2+FH = 6.0+3.4=9.4

  // ---------- 南立面（主立面，z = -16） ----------
  const face = new THREE.Group();
  face.position.z = BZ1;
  root.add(face);

  for (let i = 0; i <= 7; i++) {
    // 柱子（含两端边柱）+ 窗间墙
    const px = i === 0 ? BAY_X(0) - BAY_STEP / 2 : (i === 7 ? BAY_X(6) + BAY_STEP / 2 : BAY_X(i - 1) + BAY_W / 2 + PILLAR_W / 2);
    if (i > 0 && i < 7) {
      wallBox(face, PILLAR_W, FH * 2 + 0.4, WT, px, F1 + FH + 0.2, 0, wallM);
    } else {
      wallBox(face, PILLAR_W + 0.5, FH * 2 + 0.4, WT, px, F1 + FH + 0.2, 0, wallM);
    }
  }
  for (let i = 0; i < 7; i++) {
    const bx = BAY_X(i);
    const bayW = BAY_W;
    // --- 一层 ---
    if (i === 3) {
      // 大门开间（门洞高 3.0）
      wallBox(face, bayW, FH * 2 - 3.0, WT, bx, F1 + (3.0 + FH * 2) / 2, 0, wallM);
    } else {
      wallBox(face, bayW, SILL1, WT, bx, F1 + SILL1 / 2, 0, wallM);                 // 窗下墙
      wallBox(face, bayW, FH - WIN1_TOP, WT, bx, F1 + (WIN1_TOP + FH) / 2, 0, wallM); // 窗上墙
      const win = makeWindow(bayW - 0.25, WIN1_TOP - SILL1);
      win.position.set(bx, F1 + (SILL1 + WIN1_TOP) / 2, 0);
      face.add(win);
    }
    // --- 二层 ---
    wallBox(face, bayW, SILL2 - F2, WT, bx, F2 + (SILL2 - F2) / 2, 0, wallM);
    wallBox(face, bayW, F2 + FH - WIN2_TOP, WT, bx, (WIN2_TOP + F2 + FH) / 2, 0, wallM);
    const win2 = makeWindow(bayW - 0.25, WIN2_TOP - SILL2 - 0.15);
    win2.position.set(bx, (SILL2 + WIN2_TOP - 0.15) / 2, 0);   // SILL2/WIN2_TOP 已是绝对高度，不再加 F2
    face.add(win2);
  }

  // 彩虹层间装饰带（5 色细条纵向排列）
  const rbCols = ['#ff8a72', '#ffc94d', '#a8e6cf', '#8fd3ff', '#c3a6e8'];
  rbCols.forEach((col, k) => {
    const s = box(30.0, 0.062, 0.08, matOf(col, { rough: 0.8 }));
    s.position.set(0, F2 - 0.15 + (k - 2) * 0.062, 0.23);
    face.add(s);
  });

  // 基座裙边 + 角柱
  wallBox(face, 30.6, 0.55, WT + 0.25, 0, F1 + 0.275, 0.05, matOf(C.rubberTeal, { rough: 0.9 }));
  for (const cx of [-15.1, 15.1]) {
    wallBox(face, 0.7, FH * 2 + 0.8, WT + 0.3, cx, F1 + FH + 0.3, 0, matOf(C.roof, { rough: 0.85 }));
  }

  // ---------- 大门 ----------
  const doorG = new THREE.Group();
  doorG.position.set(0, 0, BZ1 + 0.05);
  root.add(doorG);
  const doorM = matOf(C.accentCoral, { rough: 0.7 });
  for (const dx of [-0.62, 0.62]) {
    const d = box(1.14, 3.0, 0.14, doorM);
    d.position.set(dx, F1 + 1.5, 0.1);
    shadow(d, true, false);
    doorG.add(d);
    const porthole = cyl(0.16, 0.16, 0.16, matOf('#fff6e6'), 16);
    porthole.rotation.x = Math.PI / 2;
    porthole.position.set(dx, F1 + 2.25, 0.1);
    doorG.add(porthole);
    const knob = sph(0.055, matOf('#ffd166', { metal: 0.3, rough: 0.4 }));
    knob.position.set(dx + (dx > 0 ? -0.4 : 0.4), F1 + 1.45, 0.2);
    doorG.add(knob);
  }
  // 门口台阶
  wallBox(doorG, 3.6, 0.18, 1.0, 0, F1, 0.62, matOf(C.pathEdge));
  // 雨棚（条纹，向南挑出）
  const awning = box(4.6, 0.14, 2.0, matOf(C.white));
  awning.position.set(0, F1 + 3.42, 0.8);
  awning.rotation.x = -0.12;
  shadow(awning, true, false);
  doorG.add(awning);
  for (let k = 0; k < 6; k++) {
    const st = box(0.72, 0.05, 2.02, matOf(k % 2 ? C.white : C.accentCoral, { rough: 0.8 }));
    st.position.set(-1.9 + k * 0.76, 0.08, 0);
    awning.add(st);
  }
  // 雨棚前柱
  for (const rx of [-2.05, 2.05]) {
    const rod = cyl(0.06, 0.06, 3.4, matOf(C.metal, { rough: 0.4, metal: 0.5 }), 8);
    rod.position.set(rx, F1 + 1.7, 1.55);
    doorG.add(rod);
  }
  // 欢迎牌
  const welcomeTex = signTexture('欢迎', 'WELCOME', { w: 512, h: 160, cnSize: 84, enSize: 34, border: '#4ecdc4' });
  const welcome = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.82),
    new THREE.MeshBasicMaterial({ map: welcomeTex, transparent: true }));
  welcome.position.set(0, F1 + 2.85, 0.35);
  doorG.add(welcome);

  // ---------- 东西山墙 ----------
  for (const side of [-1, 1]) {
    const g = new THREE.Group();
    g.position.set(side * BX, 0, (BZ0 + BZ1) / 2);
    g.rotation.y = side * Math.PI / 2;
    root.add(g);
    wallBox(g, 12, FH * 2 + 0.4, WT, 0, F1 + FH + 0.2, 0, wallM);
    // 每层 3 扇窗
    for (let f = 0; f < 2; f++) {
      const base = f === 0 ? F1 : F2;
      const sill = f === 0 ? SILL1 : SILL2 - F2;
      const top = f === 0 ? WIN1_TOP : WIN2_TOP - F2;
      for (const wz of [-3.6, 0, 3.6]) {
        wallBox(g, 2.4, sill, WT, wz, base + sill / 2, 0, wallM);
        wallBox(g, 2.4, FH - top, WT, wz, base + (top + FH) / 2, 0, wallM);
        const win = makeWindow(2.15, top - sill);
        win.position.set(wz, base + (sill + top) / 2, 0);
        g.add(win);
      }
    }
  }

  // ---------- 北墙（壁画装饰） ----------
  const north = new THREE.Group();
  north.position.z = BZ0;
  north.rotation.y = Math.PI;
  root.add(north);
  wallBox(north, 30, FH * 2 + 0.4, WT, 0, F1 + FH + 0.2, 0, wallM);
  const mural = new THREE.Mesh(new THREE.PlaneGeometry(26, 4.6),
    new THREE.MeshStandardMaterial({ map: muralTexture(), roughness: 0.9 }));
  mural.position.set(0, F1 + 1.9, WT / 2 + 0.06);
  north.add(mural);

  // ---------- 楼板 / 屋顶 ----------
  wallBox(root, 30.4, 0.32, 12.4, 0, F2 - 0.16, (BZ0 + BZ1) / 2, wallIn, false);   // 二层楼板
  wallBox(root, 30.8, 0.35, 12.8, 0, F2 + FH + 0.15, (BZ0 + BZ1) / 2, matOf(C.roofDark), false); // 屋面板
  // 女儿墙
  const parapetM = matOf(C.roof, { rough: 0.85 });
  wallBox(root, 30.9, 0.75, 0.35, 0, F2 + FH + 0.68, BZ1 - 0.02, parapetM);
  wallBox(root, 30.9, 0.75, 0.35, 0, F2 + FH + 0.68, BZ0 + 0.02, parapetM);
  wallBox(root, 0.35, 0.75, 12.4, -BX + 0.02, F2 + FH + 0.68, (BZ0 + BZ1) / 2, parapetM);
  wallBox(root, 0.35, 0.75, 12.4, BX - 0.02, F2 + FH + 0.68, (BZ0 + BZ1) / 2, parapetM);

  // 楼顶招牌（中英双语）——底部与女儿墙顶齐平，立在墙沿上方
  const SIGN_Y = F2 + FH + 3.0;
  const signTex = signTexture('阳光幼儿园', 'SUNSHINE KINDERGARTEN', {
    w: 1024, h: 240, cnSize: 100, enSize: 42, border: '#7c6ce0', bg: '#fffdf6',
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(13.5, 3.17),
    new THREE.MeshBasicMaterial({ map: signTex, transparent: true }));
  sign.position.set(0, SIGN_Y, BZ1 + 0.53);   // 与背板南面留出间隙，避免 z-fighting 闪烁
  root.add(sign);
  const signBack = box(13.7, 3.37, 0.16, matOf(C.white));
  signBack.position.set(0, SIGN_Y, BZ1 + 0.42);
  shadow(signBack, true, false);
  root.add(signBack);
  // 招牌支柱（在招牌两端外侧，从屋面立到招牌）
  for (const px of [-7.15, 7.15]) {
    wallBox(root, 0.24, 2.15, 0.24, px, F2 + FH + 1.05, BZ1 + 0.3, matOf(C.roof, { rough: 0.85 }));
  }

  // ---------- 楼顶：时钟塔 ----------
  const tower = new THREE.Group();
  tower.position.set(2.6, F2 + FH + 0.32, -21.5);
  root.add(tower);
  wallBox(tower, 2.6, 4.1, 2.6, 0, 2.05, 0, matOf(C.wall));
  const cap = new THREE.Mesh(new THREE.ConeGeometry(2.15, 1.5, 4), matOf(C.roof));
  cap.position.y = 4.85; cap.rotation.y = Math.PI / 4;
  shadow(cap, true, false);
  tower.add(cap);
  const clockFace = new THREE.Mesh(new THREE.CircleGeometry(1.05, 32),
    new THREE.MeshBasicMaterial({ map: clockTexture() }));
  clockFace.position.set(0, 2.4, 1.36);
  tower.add(clockFace);
  // 指针（动画）
  const handM = matOf('#4a3b52');
  const hourHand = box(0.1, 0.55, 0.03, handM);
  hourHand.position.set(0, 2.4, 1.4);
  const minHand = box(0.07, 0.82, 0.03, handM);
  minHand.position.set(0, 2.4, 1.43);
  tower.add(hourHand); tower.add(minHand);
  S.ambient.push((dt, t) => {
    minHand.rotation.z = -t * 1.2;
    hourHand.rotation.z = -t * 0.1;
  });

  // 楼顶小穹顶 + 绿植箱
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.1, 18, 12, 0, TAU, 0, Math.PI / 2),
    matOf(C.rubberTeal));
  dome.position.set(-8.5, F2 + FH + 0.32, -22);
  shadow(dome, true, false);
  root.add(dome);
  for (const px of [-13.5, -4.5, 4.5, 13.5]) {
    // 花箱安放在女儿墙顶上
    const planter = box(1.7, 0.55, 0.8, matOf(C.wood));
    planter.position.set(px, F2 + FH + 1.18, BZ1 - 0.02);
    shadow(planter, true, false);
    root.add(planter);
    for (let k = 0; k < 4; k++) {
      const flower = sph(0.14, matOf(pick(['#ff8a72', '#ffd166', '#ffa8c5', '#c3a6e8'])), 8, 6);
      flower.position.set(px - 0.6 + k * 0.4, F2 + FH + 1.58, BZ1 - 0.02);
      root.add(flower);
      const leaf = sph(0.12, matOf(C.leaf2), 8, 6);
      leaf.position.set(px - 0.6 + k * 0.4 + 0.1, F2 + FH + 1.5, BZ1 - 0.09);
      root.add(leaf);
    }
  }

  // ---------- 室内 ----------
  buildInterior(root);

  return root;
}

function buildInterior(root) {
  const inWall = matOf('#fdf3e3', { rough: 0.96 });
  // 室内隔墙：教室/门厅/阅读室（南侧留 1.6 宽门洞）
  for (const dx of [-2.55, 2.55]) {
    const h1 = FH - 0.2;
    const w1 = box(0.22, h1, 2.6, inWall);
    w1.position.set(dx, F1 + h1 / 2, -17.3);
    shadow(w1, false, false);
    root.add(w1);
    const w2 = box(0.22, h1, 8.4, inWall);
    w2.position.set(dx, F1 + h1 / 2, -23.6);
    shadow(w2, false, false);
    root.add(w2);
    // 二层隔墙
    const h2 = FH - 0.2;
    const w3 = box(0.22, h2, 10.8, inWall);
    w3.position.set(dx, F2 + h2 / 2, (BZ0 + BZ1) / 2);
    shadow(w3, false, false);
    root.add(w3);
  }
  // 室内北墙贴面
  const northIn = box(29.5, FH * 2 - 0.4, 0.12, inWall);
  northIn.position.set(0, F1 + FH, BZ0 + 0.32);
  shadow(northIn, false, false);
  root.add(northIn);

  // 房间地面颜色
  const floors = [
    { x: -8.45, z: -22, w: 11.6, d: 11.2, y: F1 + 0.03, c: C.classFloor },
    { x: 0, z: -22, w: 4.7, d: 11.2, y: F1 + 0.03, c: C.path },
    { x: 8.45, z: -22, w: 11.6, d: 11.2, y: F1 + 0.03, c: C.readFloor },
    { x: -8.45, z: -22, w: 11.6, d: 11.2, y: F2 + 0.03, c: C.napFloor },
    { x: 0, z: -22, w: 4.7, d: 11.2, y: F2 + 0.03, c: C.napFloor },
    { x: 8.45, z: -22, w: 11.6, d: 11.2, y: F2 + 0.03, c: C.readFloor },
  ];
  for (const f of floors) {
    const m = box(f.w, 0.08, f.d, matOf(f.c, { rough: 0.95 }));
    m.position.set(f.x, f.y, f.z);
    shadow(m, false, true);
    root.add(m);
  }

  // ----- 教室：课桌 / 凳子 / 黑板 / 矮柜 / 地毯 -----
  const woodM = matOf(C.wood, { rough: 0.8 });
  const woodD = matOf(C.woodDark, { rough: 0.8 });
  for (const t of INTERIOR.tables) {
    const g = new THREE.Group();
    g.position.set(t.x, F1, t.z);
    root.add(g);
    const top = cyl(1.05, 1.05, 0.09, woodM, 20);
    top.position.y = 0.98;
    shadow(top, true, false);
    g.add(top);
    const leg = cyl(0.09, 0.13, 0.95, woodD, 10);
    leg.position.y = 0.48;
    g.add(leg);
    const base = cyl(0.4, 0.45, 0.06, woodD, 14);
    base.position.y = 0.03;
    g.add(base);
    // 桌上小画纸
    const paper = box(0.55, 0.02, 0.4, matOf('#ffffff'));
    paper.position.set(rand(-0.3, 0.3), 1.03, rand(-0.3, 0.3));
    g.add(paper);
    // 凳子×4
    for (const [ox, oz] of INTERIOR.stoolOffsets) {
      const st = new THREE.Group();
      st.position.set(ox * 1.18, 0, oz * 1.18);
      g.add(st);
      const seat = cyl(0.3, 0.3, 0.09, matOf(pick(['#ffd166', '#4ecdc4', '#ff8a72', '#7cc6e8']), { rough: 0.85 }), 14);
      seat.position.y = 0.5;
      shadow(seat, true, false);
      st.add(seat);
      for (const lx of [-0.18, 0.18]) for (const lz of [-0.18, 0.18]) {
        const l = cyl(0.035, 0.035, 0.5, woodD, 6);
        l.position.set(lx, 0.25, lz);
        st.add(l);
      }
    }
  }
  // 黑板（西墙内侧）+ 北墙大黑板（正对南窗，教室机位直接可见）
  const bb = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.0),
    new THREE.MeshStandardMaterial({ map: blackboardTexture(), roughness: 0.92 }));
  bb.position.set(INTERIOR.board.x, F1 + 2.0, INTERIOR.board.z);
  bb.rotation.y = Math.PI / 2;
  root.add(bb);
  const bbFrame = box(0.12, 2.3, 4.7, woodD);
  bbFrame.position.set(INTERIOR.board.x - 0.06, F1 + 2.0, INTERIOR.board.z);
  root.add(bbFrame);
  const bbLedge = box(0.3, 0.07, 4.7, woodM);
  bbLedge.position.set(INTERIOR.board.x + 0.12, F1 + 0.95, INTERIOR.board.z);
  root.add(bbLedge);
  const bb2 = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 2.1),
    new THREE.MeshStandardMaterial({ map: blackboardTexture(), roughness: 0.92 }));
  bb2.position.set(-8.4, F1 + 2.15, BZ0 + 0.45);
  root.add(bb2);
  const bb2Frame = box(5.95, 2.4, 0.14, woodD);
  bb2Frame.position.set(-8.4, F1 + 2.15, BZ0 + 0.38);
  root.add(bb2Frame);
  const bb2Ledge = box(5.95, 0.08, 0.32, woodM);
  bb2Ledge.position.set(-8.4, F1 + 1.02, BZ0 + 0.62);
  root.add(bb2Ledge);

  // 教室矮柜 + 玩具
  const shelf = box(3.6, 1.5, 0.55, matOf(C.accentMint, { rough: 0.85 }));
  shelf.position.set(-8.5, F1 + 0.75, BZ0 + 0.75);
  shadow(shelf, false, false);
  root.add(shelf);
  for (let k = 0; k < 7; k++) {
    const toy = box(0.32, 0.32, 0.3, matOf(pick(['#ff8a72', '#ffd166', '#4ecdc4', '#c3a6e8', '#ff9f68']), { rough: 0.8 }));
    toy.position.set(-9.9 + k * 0.47, F1 + (k % 2 ? 1.05 : 0.6), BZ0 + 0.75);
    root.add(toy);
  }
  // 地毯
  const rug = new THREE.Mesh(new THREE.CircleGeometry(2.6, 30), matOf('#ffd9a8', { rough: 0.98 }));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(-8.5, F1 + 0.075, -20.5);
  root.add(rug);

  // ----- 阅读区：书架 / 坐垫 / 小桌 -----
  // 房间中后部的朝南独立矮书架（彩色书正对窗户与镜头，一眼可见）
  {
    const csh = new THREE.Group();
    csh.position.set(10.5, F1, -22.8);
    root.add(csh);
    const body = box(3.0, 1.7, 0.55, matOf('#f0e0c8', { rough: 0.85 }));
    shadow(body, false, false);
    csh.add(body);
    for (let k = 0; k < 2; k++) {
      const hole = box(2.7, 0.55, 0.3, matOf('#dcccb0', { rough: 0.9 }));
      hole.position.set(0, 0.42 + k * 0.68, 0.14);
      csh.add(hole);
      let bx0 = -1.25;
      while (bx0 < 1.25) {
        const bw = rand(0.14, 0.24);
        const book = box(bw, rand(0.4, 0.52), 0.26, matOf(pick(['#ff8a72', '#ffd166', '#4ecdc4', '#7cc6e8', '#ffa8c5', '#c3a6e8', '#6dd5a8']), { rough: 0.9 }));
        book.position.set(bx0 + bw / 2, 0.42 + k * 0.68, 0.24);
        csh.add(book);
        bx0 += bw + rand(0.02, 0.1);
      }
    }
  }
  const shelfG = new THREE.Group();
  shelfG.position.set(8.5, F1, BZ0 + 0.85);
  root.add(shelfG);
  const shelfBody = box(5.2, 2.5, 0.6, matOf('#f0e0c8', { rough: 0.85 }));
  shadow(shelfBody, false, false);
  shelfG.add(shelfBody);
  for (let k = 0; k < 3; k++) {
    const hole = box(4.8, 0.62, 0.3, matOf('#dcccB0'.toLowerCase(), { rough: 0.9 }));
    hole.position.set(0, 0.55 + k * 0.75, 0.18);
    shelfG.add(hole);
    // 彩色书
    let bx0 = -2.2;
    while (bx0 < 2.2) {
      const bw = rand(0.14, 0.24);
      const book = box(bw, rand(0.4, 0.55), 0.26, matOf(pick(['#ff8a72', '#ffd166', '#4ecdc4', '#7cc6e8', '#ffa8c5', '#c3a6e8', '#6dd5a8']), { rough: 0.9 }));
      book.position.set(bx0 + bw / 2, 0.55 + k * 0.75, 0.22);
      shelfG.add(book);
      bx0 += bw + rand(0.02, 0.1);
    }
  }
  for (const cu of INTERIOR.cushions) {
    const c = cyl(0.52, 0.58, 0.16, matOf(pick(['#ff8a72', '#4ecdc4', '#ffd166', '#c3a6e8']), { rough: 0.95 }), 18);
    c.position.set(cu.x, F1 + 0.08, cu.z);
    shadow(c, false, false);
    root.add(c);
  }
  const lowTable = cyl(0.8, 0.8, 0.42, matOf(C.wood), 18);
  lowTable.position.set(6.3, F1 + 0.21, -22.8);
  shadow(lowTable, true, false);
  root.add(lowTable);
  for (let k = 0; k < 3; k++) {
    const bk = box(0.34, 0.05, 0.26, matOf(pick(['#ff8a72', '#4ecdc4', '#ffd166']), { rough: 0.9 }));
    bk.position.set(6.0 + k * 0.3, F1 + 0.46, -22.8 + rand(-0.2, 0.2));
    bk.rotation.y = rand(-0.4, 0.4);
    root.add(bk);
  }

  // ----- 午休区（二层）：小床 -----
  for (const ct of INTERIOR.cots) {
    const g = new THREE.Group();
    g.position.set(ct.x, F2, ct.z);
    root.add(g);
    const frame = box(1.1, 0.22, 2.3, matOf(C.wood));
    shadow(frame, true, false);
    frame.position.y = 0.32;
    g.add(frame);
    for (const lx of [-0.45, 0.45]) for (const lz of [-1.0, 1.0]) {
      const l = cyl(0.05, 0.05, 0.32, matOf(C.woodDark), 8);
      l.position.set(lx, 0.16, lz);
      g.add(l);
    }
    const matt = box(1.0, 0.14, 2.15, matOf('#fdfdf4', { rough: 0.95 }));
    matt.position.y = 0.5;
    g.add(matt);
    const pillow = box(0.7, 0.12, 0.42, matOf('#ffd9e8', { rough: 0.95 }));
    pillow.position.set(0, 0.62, -0.78);
    g.add(pillow);
    const blanket = box(1.02, 0.1, 1.25, matOf(pick(['#8fd3ff', '#a8e6cf', '#ffb3a7', '#c3a6e8']), { rough: 0.95 }));
    blanket.position.set(0, 0.6, 0.42);
    g.add(blanket);
  }

  // ----- 活动室（二层）：积木桌 + 柜子 -----
  const actTable = box(2.0, 0.1, 1.4, matOf(C.wood));
  actTable.position.set(INTERIOR.actTable.x, F2 + 0.72, INTERIOR.actTable.z);
  shadow(actTable, true, false);
  root.add(actTable);
  for (const lx of [-0.8, 0.8]) for (const lz of [-0.5, 0.5]) {
    const l = cyl(0.06, 0.06, 0.72, matOf(C.woodDark), 8);
    l.position.set(INTERIOR.actTable.x + lx, F2 + 0.36, INTERIOR.actTable.z + lz);
    root.add(l);
  }
  for (let k = 0; k < 8; k++) {
    const bk = box(0.3, 0.3, 0.3, matOf(pick(['#ff8a72', '#ffd166', '#4ecdc4', '#7cc6e8', '#ffa8c5']), { rough: 0.85 }));
    bk.position.set(INTERIOR.actTable.x + rand(-0.7, 0.7), F2 + 0.92 + (k > 4 ? 0.3 : 0), INTERIOR.actTable.z + rand(-0.45, 0.45));
    bk.rotation.y = rand(0, 1.5);
    root.add(bk);
  }
  const toyShelf2 = box(3.2, 1.6, 0.55, matOf(C.accentPink, { rough: 0.88 }));
  toyShelf2.position.set(8.5, F2 + 0.8, BZ0 + 0.75);
  root.add(toyShelf2);

  // ----- 门厅：地垫 / 盆栽 / 挂画 -----
  const mat2 = box(2.4, 0.05, 1.4, matOf(C.rubberTeal, { rough: 0.95 }));
  mat2.position.set(0, F1 + 0.06, BZ1 + 1.0);
  root.add(mat2);
  for (const px of [-1.9, 1.9]) {
    const pot = cyl(0.32, 0.24, 0.5, matOf(C.accentCoral, { rough: 0.85 }), 14);
    pot.position.set(px, F1 + 0.25, BZ1 + 1.1);
    root.add(pot);
    const plant = sph(0.42, matOf(C.leaf2), 10, 8);
    plant.position.set(px, F1 + 0.85, BZ1 + 1.1);
    shadow(plant, false, false);
    root.add(plant);
  }

  // ----- 室内灯（点光源 + 发光顶灯盘） -----
  const lampRooms = [
    { x: -8.45, z: -22, y: F1 + 2.9 }, { x: 8.45, z: -22, y: F1 + 2.9 },
    { x: -8.45, z: -22, y: F2 + 2.9 }, { x: 8.45, z: -22, y: F2 + 2.9 },
  ];
  for (const r of lampRooms) {
    const pl = new THREE.PointLight(0xfff0d8, 22, 15, 2);
    pl.position.set(r.x, r.y, r.z);
    root.add(pl);
    const disc = cyl(0.55, 0.55, 0.06, new THREE.MeshBasicMaterial({ color: 0xfff6e0 }), 18);
    disc.position.set(r.x, r.y + 0.32, r.z);
    root.add(disc);
  }

  return root;
}
