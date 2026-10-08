// sports.js —— 塑胶环形跑道 + 小足球场 + 球门 + 足球
import * as THREE from 'three';
import { S } from './state.js';
import { C, GY, matOf, box, cyl, shadow, shadowR } from './palette.js';
import { ballTexture } from './textures.js';

const CX = -20, CZ = 8;               // 运动区中心
const OX = 11.8, OZ = 9.6;            // 跑道外椭圆
const IX = 9.2, IZ = 7.2;             // 跑道内椭圆
const FX = CX - 7.0, FX2 = CX + 7.0;  // 球门 x 位置
const FIELD_BOUND = { x0: CX - 6.6, x1: CX + 6.6, z0: CZ - 5.6, z1: CZ + 5.6 };

/** 椭圆环 Shape */
function ellipseRing(ox, oz, ix, iz) {
  const s = new THREE.Shape();
  s.absellipse(0, 0, ox, oz, 0, Math.PI * 2, false, 0);
  const hole = new THREE.Path();
  hole.absellipse(0, 0, ix, iz, 0, Math.PI * 2, true, 0);
  s.holes.push(hole);
  return s;
}

function flatShape(shape, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.ShapeGeometry(shape, 48), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  shadowR(m);
  return m;
}

export const SPORTS = { ballHome: new THREE.Vector3(-19.2, GY + 0.42, 8.2), bound: FIELD_BOUND };

export function buildSports() {
  const g = new THREE.Group();
  S.scene.add(g);

  // 跑道（红色塑胶）
  g.add(flatShape(ellipseRing(OX, OZ, IX, IZ), matOf(C.rubberRed, { rough: 0.92 }), CX, GY + 0.05, CZ));
  // 内外白线（与跑道面拉开高度差，避免深度闪烁）
  g.add(flatShape(ellipseRing(OX - 0.18, OZ - 0.16, OX - 0.28, OZ - 0.25), matOf(C.white), CX, GY + 0.068, CZ));
  g.add(flatShape(ellipseRing(IX + 0.1, IZ + 0.09, IX, IZ), matOf(C.white), CX, GY + 0.068, CZ));
  // 中间分道线
  const mx = (OX + IX) / 2, mz = (OZ + IZ) / 2;
  g.add(flatShape(ellipseRing(mx, mz, mx - 0.05, mz - 0.05), matOf(C.white), CX, GY + 0.066, CZ));

  // 场内草坪
  const fieldGeo = new THREE.ShapeGeometry(new THREE.Shape().absellipse(0, 0, IX - 0.35, IZ - 0.35, 0, Math.PI * 2), 48);
  const fieldLawn = new THREE.Mesh(fieldGeo, matOf(C.fieldGreen, { rough: 0.95 }));
  fieldLawn.rotation.x = -Math.PI / 2;
  fieldLawn.position.set(CX, GY + 0.055, CZ);
  shadowR(fieldLawn);
  g.add(fieldLawn);

  // 足球场（白线：中线 / 中圈 / 禁区）
  const lineM = matOf(C.fieldLine);
  const line = (w, d, x, z) => {
    const m = box(w, 0.03, d, lineM);
    m.position.set(x, GY + 0.082, z);
    shadowR(m);
    g.add(m);
  };
  line(0.12, 10.8, CX, CZ);                                    // 中线
  const circ = new THREE.Mesh(new THREE.RingGeometry(1.7, 1.82, 40), lineM);
  circ.rotation.x = -Math.PI / 2;
  circ.position.set(CX, GY + 0.082, CZ);
  shadowR(circ);
  g.add(circ);
  for (const gx of [FX + 0.7, FX2 - 0.7]) {                    // 禁区
    const inw = gx < CX ? 1 : -1;
    line(1.6, 5.6, gx + inw * 0.8, CZ - 2.8);
    line(1.6, 5.6, gx + inw * 0.8, CZ + 2.8);
    line(1.6, 0.12, gx + inw * 0.8, CZ);
    line(0.12, 5.6, gx, CZ);
  }

  // 球门×2（东西向）
  const postM = matOf(C.white, { rough: 0.5 });
  const goal = (x, flip) => {
    const gg = new THREE.Group();
    gg.position.set(x, GY, CZ);
    g.add(gg);
    for (const pz of [-1.7, 1.7]) {
      const post = cyl(0.07, 0.07, 1.35, postM, 10);
      post.position.set(0, 0.68, pz);
      shadow(post, true, false);
      gg.add(post);
    }
    const bar = cyl(0.07, 0.07, 3.55, postM, 10);
    bar.rotation.x = Math.PI / 2;
    bar.position.set(0, 1.35, 0);
    shadow(bar, true, false);
    gg.add(bar);
    // 简易网
    const net = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.3),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, side: THREE.DoubleSide }));
    net.position.set(flip * 0.55, 0.66, 0);
    net.rotation.y = Math.PI / 2;
    gg.add(net);
    const net2 = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.3),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, side: THREE.DoubleSide }));
    net2.position.set(flip * 0.55, 0.66, -1.7 + 0);
    net2.rotation.y = 0;
    gg.add(net2);
    const net3 = net2.clone(); net3.position.z = 1.7;
    gg.add(net3);
  };
  goal(FX, -1);
  goal(FX2, 1);

  // 角旗
  for (const [fx, fz] of [[FIELD_BOUND.x0, FIELD_BOUND.z0], [FIELD_BOUND.x1, FIELD_BOUND.z0],
                          [FIELD_BOUND.x0, FIELD_BOUND.z1], [FIELD_BOUND.x1, FIELD_BOUND.z1]]) {
    const pole = cyl(0.035, 0.035, 1.0, postM, 6);
    pole.position.set(fx, GY + 0.5, fz);
    g.add(pole);
    const flag = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.5, 4), matOf(C.accentCoral, { flat: true }));
    flag.rotation.z = -Math.PI / 2;
    flag.position.set(fx + 0.22, GY + 0.88, fz);
    g.add(flag);
  }

  // 足球（贴图 + 物理）
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 16),
    new THREE.MeshStandardMaterial({ map: ballTexture(), roughness: 0.6 }));
  ball.position.copy(SPORTS.ballHome);
  ball.castShadow = true;
  g.add(ball);
  S.ball = { mesh: ball, vel: new THREE.Vector3() };

  return g;
}
