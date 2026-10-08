// ground.js —— 微缩景观基座 / 草坪 / 小径 / 塑胶地垫
import * as THREE from 'three';
import { S } from './state.js';
import {
  C, GY, matOf, roundedRectShape, shadowR, rand,
} from './palette.js';

function flatRounded(w, d, r, mat, y, x = 0, z = 0) {
  const g = new THREE.ShapeGeometry(roundedRectShape(w, d, r), 12);
  const m = new THREE.Mesh(g, mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  shadowR(m);
  return m;
}

export function buildGround() {
  const scene = S.scene;
  const g = new THREE.Group();
  scene.add(g);

  // ---- 蛋糕式基座：草面 + 土侧 ----
  const platform = new THREE.Mesh(
    new THREE.ExtrudeGeometry(roundedRectShape(76, 62, 9), {
      depth: GY, bevelEnabled: true, bevelThickness: 0.18, bevelSize: 0.18, bevelSegments: 2,
    }),
    [matOf(C.grass, { rough: 0.95 }), matOf(C.dirt, { rough: 0.95 })],
  );
  platform.rotation.x = -Math.PI / 2;
  // 挤出体 z∈[-0.18, 2.78]（含倒角），旋转后 y 同区间 → 顶面对齐 GY
  platform.position.y = GY - (GY + 0.18);
  platform.receiveShadow = true;
  g.add(platform);

  // 基座下层土台（略大略矮，层次感）
  const under = new THREE.Mesh(
    new THREE.ExtrudeGeometry(roundedRectShape(79, 65, 10), {
      depth: 1.1, bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.3, bevelSegments: 2,
    }),
    matOf(C.dirtDark, { rough: 0.98 }),
  );
  under.rotation.x = -Math.PI / 2;
  under.position.y = -0.9;
  g.add(under);

  const add = (m) => g.add(m);

  // ---- 中央草坪圈（浅一档的草色）----
  const courtGeo = new THREE.CircleGeometry(8.6, 40);
  const court = new THREE.Mesh(courtGeo, matOf(C.grassDark));
  court.rotation.x = -Math.PI / 2;
  court.position.set(1, GY + 0.02, 8);
  shadowR(court);
  add(court);

  // ---- 塑胶地垫：游乐区（东侧） ----
  const padWhite = flatRounded(21.6, 19.6, 6.4, matOf(C.white), GY + 0.028, 20, 4);
  const padTeal = flatRounded(20.8, 18.8, 6, matOf(C.rubberTeal, { rough: 0.92 }), GY + 0.045, 20, 4);
  add(padWhite); add(padTeal);
  // 彩色圆点装饰
  const dots = [[14.2, -2.2, C.rubberYellow], [26.2, 10.4, C.rubberBlue], [13.8, 10.6, C.accentPink]];
  for (const [dx, dz, col] of dots) {
    const c = new THREE.Mesh(new THREE.CircleGeometry(1.25, 26), matOf(col, { rough: 0.92 }));
    c.rotation.x = -Math.PI / 2;
    c.position.set(dx, GY + 0.055, dz);
    shadowR(c);
    add(c);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.35, 1.5, 26), matOf(C.white));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(dx, GY + 0.056, dz);
    shadowR(ring);
    add(ring);
  }

  // ---- 小径（分层：草0 < 圆坪.02 < 地垫.028 < 跑道.05 < 车道线.066 < 支路.07/.088 < 主路.09/.108 < 彩虹砖.125）----
  const pathMat = matOf(C.path, { rough: 0.9 });
  const edgeMat = matOf(C.pathEdge, { rough: 0.9 });
  // 主路：校门 → 教学楼大门
  add(flatRounded(3.6, 46, 1.8, edgeMat, GY + 0.09, 0, 7));
  add(flatRounded(3.1, 46, 1.55, pathMat, GY + 0.108, 0, 7));
  // 西支路 → 操场（止于跑道东缘，避免与跑道共面重叠）
  add(flatRounded(7.2, 2.6, 1.3, edgeMat, GY + 0.07, -4.8, 6));
  add(flatRounded(6.7, 2.2, 1.1, pathMat, GY + 0.088, -4.85, 6));
  // 东支路 → 游乐区
  add(flatRounded(10, 2.6, 1.3, edgeMat, GY + 0.07, 7.2, 4));
  add(flatRounded(9.5, 2.2, 1.1, pathMat, GY + 0.088, 7.2, 4));
  // 门口小广场（叠在主路之上）
  add(flatRounded(7, 3.6, 1.8, edgeMat, GY + 0.095, 0, -13.9));
  add(flatRounded(6.4, 3.1, 1.55, pathMat, GY + 0.113, 0, -13.9));

  // 起点装饰：门口彩虹步道砖
  const brickCols = [C.accentCoral, C.rubberYellow, C.rubberTeal, C.rubberBlue, C.accentPink, C.accentMint];
  for (let i = 0; i < 6; i++) {
    const b = flatRounded(2.2, 1.05, 0.5, matOf(brickCols[i], { rough: 0.9 }), GY + 0.125, 0, 23.2 + i * 1.15);
    add(b);
  }

  return g;
}
