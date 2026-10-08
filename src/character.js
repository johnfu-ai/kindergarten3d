// character.js —— 卡通人物工厂 + 程序化姿势动画系统
import * as THREE from 'three';
import { S } from './state.js';
import {
  matOf, rand, pick, dampAngle, lerp, clamp, TAU,
  SKINS, HAIRS, TOPS, PANTS, SHOES,
} from './palette.js';

// ---------- 姿势库（纯函数：返回目标姿态参数） ----------
// 约定：aLz/lLz 负值=左侧肢体向外，aRz/lRz 正值=右侧肢体向外；aX/lX 负值=向前摆
const BASE = () => ({
  bob: 0, lean: 0,
  lLx: 0, lRx: 0, lLz: -0.04, lRz: 0.04,
  aLx: 0, aRx: 0, aLz: -0.07, aRz: 0.07,
  hX: 0, hY: 0, hZ: 0,
});

const POSES = {
  idle(t, ph) {
    const p = BASE();
    p.bob = Math.sin(t * 1.7 + ph) * 0.012;
    p.aLx = Math.sin(t * 1.3 + ph) * 0.05;
    p.aRx = -Math.sin(t * 1.2 + ph) * 0.05;
    p.hY = Math.sin(t * 0.32 + ph * 3) * 0.32;
    p.hZ = Math.sin(t * 0.21 + ph) * 0.04;
    return p;
  },
  walk(t, ph, c) {
    const p = BASE();
    const s = Math.sin(c.walkPhase);
    p.lLx = s * 0.62; p.lRx = -s * 0.62;
    p.aLx = -s * 0.5; p.aRx = s * 0.5;
    p.bob = Math.abs(Math.cos(c.walkPhase)) * 0.035;
    p.lean = 0.07;
    p.hY = Math.sin(c.walkPhase * 0.5) * 0.06;
    return p;
  },
  run(t, ph, c) {
    const p = BASE();
    const s = Math.sin(c.walkPhase);
    p.lLx = s * 0.95; p.lRx = -s * 0.95;
    p.aLx = -s * 0.85; p.aRx = s * 0.85;
    p.aLz = -0.3; p.aRz = 0.3;
    p.bob = Math.abs(Math.cos(c.walkPhase)) * 0.06;
    p.lean = 0.2;
    return p;
  },
  jump(t, ph, c) {
    const p = BASE();
    const u = c.poseParam ?? 0;
    const arc = Math.sin(u * Math.PI);
    if (u < 0.18) { // 蹲
      p.bob = -0.12 * (u / 0.18);
      p.lLx = p.lRx = -0.55 * (u / 0.18);
      p.lean = 0.3 * (u / 0.18);
    } else {
      p.bob = arc * 0.5;
      p.lLx = p.lRx = -0.65 * arc;
      p.aLz = -(0.5 + arc * 1.1); p.aRz = 0.5 + arc * 1.1;
      p.hX = -0.15 * arc;
    }
    return p;
  },
  sit(t, ph) {
    const p = BASE();
    p.lLx = p.lRx = -1.42;
    p.aLx = 0.12; p.aRx = 0.12;
    p.lean = 0.05;
    p.hY = Math.sin(t * 0.4 + ph) * 0.2;
    return p;
  },
  sitTable(t, ph) {
    const p = BASE();
    p.lLx = p.lRx = -1.42;
    p.lean = 0.3;
    p.aLx = p.aRx = -1.05;
    p.hX = 0.18;
    return p;
  },
  draw(t, ph) {
    const p = POSES.sitTable(t, ph);
    p.aLx = -1.1 + Math.sin(t * 3.1 + ph) * 0.14;
    p.aRx = -1.1 - Math.sin(t * 2.7 + ph) * 0.14;
    p.hX = 0.3;
    p.hY = Math.sin(t * 0.5 + ph) * 0.1;
    return p;
  },
  raise(t, ph) {
    const p = POSES.sitTable(t, ph);
    p.aRx = -2.85;
    p.aRz = 0.18 - Math.sin(t * 6) * 0.05;
    p.aLx = -1.0;
    p.hX = -0.05;
    p.bob = Math.sin(t * 6.5) * 0.008;
    return p;
  },
  read(t, ph, c) {
    const p = BASE();
    p.lLx = p.lRx = -1.42;
    p.lLz = 0.62; p.lRz = -0.62;      // 盘腿（向内交叉）
    p.aLx = p.aRx = -1.15;
    p.aLz = 0.4; p.aRz = -0.4;        // 手臂向内捧书
    p.lean = 0.22;
    p.hX = 0.32;
    p.hY = Math.sin(t * 0.35 + ph) * 0.08;
    return p;
  },
  readFlip(t, ph) {
    const p = POSES.read(t, ph);
    p.aRx = -0.95 + Math.sin(t * 9) * 0.12;
    return p;
  },
  talk(t, ph) {
    const p = BASE();
    p.bob = Math.sin(t * 1.8 + ph) * 0.012;
    p.hX = Math.sin(t * 2.3 + ph) * 0.09;
    p.hY = Math.sin(t * 0.4 + ph) * 0.18;
    p.aLx = Math.sin(t * 2.6 + ph) * 0.22 - 0.1;
    p.aRx = Math.sin(t * 2.2 + ph * 2) * 0.2 - 0.1;
    p.aLz = -0.22; p.aRz = 0.22;
    return p;
  },
  wave(t, ph) {
    const p = BASE();
    p.bob = Math.sin(t * 2) * 0.014;
    p.aRz = 2.45 + Math.sin(t * 7.5) * 0.3;
    p.aRx = -0.15;
    p.hZ = -0.09;
    p.hY = 0.12;
    return p;
  },
  clap(t, ph) {
    const p = BASE();
    p.bob = Math.abs(Math.sin(t * 5)) * 0.02;
    p.aLx = p.aRx = -1.25;
    const c = 0.42 - Math.abs(Math.sin(t * 8 + ph)) * 0.34;
    p.aLz = c; p.aRz = -c;            // 双手向中间合拢
    p.hX = 0.08;
    return p;
  },
  swingSeated(t, ph, c) {
    const p = BASE();
    const th = c.poseParam ?? 0;
    p.lLx = p.lRx = -1.38 + Math.sin(th * 1.0) * 0.35;
    p.lLz = -0.1; p.lRz = 0.1;
    p.aLx = p.aRx = -1.85;
    p.aLz = -0.55; p.aRz = 0.55;
    p.lean = 0.1 + th * 0.45;
    p.hX = -0.1;
    p.bob = Math.sin(t * 2 + ph) * 0.008;
    return p;
  },
  slideSeated(t, ph) {
    const p = BASE();
    p.lLx = p.lRx = -1.5;
    p.aLx = p.aRx = -2.6;
    p.aLz = -0.5; p.aRz = 0.5;
    p.lean = -0.12;
    p.hX = -0.18;
    return p;
  },
  climb(t, ph, c) {
    const p = BASE();
    const s = Math.sin(c.walkPhase);
    p.aLx = -2.3 + s * 0.45; p.aRx = -2.3 - s * 0.45;
    p.aLz = -0.3; p.aRz = 0.3;
    p.lLx = -0.65 - s * 0.35; p.lRx = -0.65 + s * 0.35;
    p.lean = 0.18;
    return p;
  },
  kick(t, ph, c) {
    const p = BASE();
    const u = c.poseParam ?? 0;
    if (u < 0.35) {
      const w = u / 0.35;
      p.lRx = lerp(0, 1.05, w);
      p.lean = lerp(0.1, -0.18, w);
      p.aLx = -0.5 * w;
      p.aRz = 0.3 * w;
    } else {
      const w = (u - 0.35) / 0.65;
      const s = w * w * (3 - 2 * w);
      p.lRx = lerp(1.05, -1.65, s);
      p.lean = lerp(-0.18, 0.38, s);
      p.aLx = -0.7 * s;
      p.aLz = -0.35;
      p.lLx = -0.3 * s;
    }
    return p;
  },
  dig(t, ph) {
    const p = BASE();
    p.lLx = p.lRx = -1.85;
    p.lLz = -0.4; p.lRz = 0.4;
    p.bob = -0.14;
    p.lean = 0.4;
    p.aLx = -1.45 + Math.sin(t * 3.2 + ph) * 0.42;
    p.aRx = -1.45 - Math.sin(t * 3.2 + ph) * 0.42;
    p.aLz = -0.25; p.aRz = 0.25;
    p.hX = 0.42;
    return p;
  },
  sleep(t, ph) {
    const p = BASE();
    p.bob = Math.sin(t * 1.15 + ph) * 0.012;
    p.aLz = -0.1; p.aRz = 0.1;      // 手臂贴近身体，平躺轮廓
    p.aLx = 0.04; p.aRx = 0.04;
    p.hY = 0.1;
    return p;
  },
  teach(t, ph) {
    const p = BASE();
    p.bob = Math.sin(t * 1.6 + ph) * 0.014;
    p.hX = Math.sin(t * 2.1 + ph) * 0.1;
    p.aRx = -1.6 + Math.sin(t * 2.4 + ph) * 0.3;
    p.aRz = 0.35;
    p.aLx = Math.sin(t * 1.7) * 0.15;
    return p;
  },
};

// ---------- 人物工厂 ----------
const geoCache = new Map();
function capsuleGeo(r, len) {
  const k = `${r}_${len}`;
  if (!geoCache.has(k)) geoCache.set(k, new THREE.CapsuleGeometry(r, len, 4, 10));
  return geoCache.get(k);
}
function sphereGeo(r) {
  const k = `s${r}`;
  if (!geoCache.has(k)) geoCache.set(k, new THREE.SphereGeometry(r, 14, 12));
  return geoCache.get(k);
}

export function createPerson(opt = {}) {
  const isTeacher = !!opt.teacher;
  const scale = isTeacher ? 1.24 : rand(0.94, 1.05);

  const skin = opt.skin || pick(SKINS);
  const hairC = opt.hair || pick(HAIRS);
  const topC = opt.top || pick(TOPS);
  const botC = opt.bottom || pick(PANTS);
  const shoeC = opt.shoe || pick(SHOES);

  const skinM = matOf(skin, { rough: 0.7 });
  const hairM = matOf(hairC, { rough: 0.9 });
  const topM = matOf(topC, { rough: 0.85 });
  const botM = matOf(botC, { rough: 0.85 });
  const shoeM = matOf(shoeC, { rough: 0.8 });

  const root = new THREE.Group();
  root.scale.setScalar(scale);

  const cs = (m) => { m.castShadow = true; return m; };

  // ---- 腿 ----
  const hipY = 0.5;
  const legGeo = capsuleGeo(0.085, 0.33);
  const legL = new THREE.Group(); legL.position.set(-0.11, hipY, 0);
  const legR = new THREE.Group(); legR.position.set(0.11, hipY, 0);
  for (const [leg, side] of [[legL, -1], [legR, 1]]) {
    const legMesh = cs(new THREE.Mesh(legGeo, opt.dress ? skinM : botM));
    legMesh.position.y = -0.25;
    leg.add(legMesh);
    const shoe = cs(new THREE.Mesh(sphereGeo(0.1), shoeM));
    shoe.scale.set(1, 0.72, 1.35);
    shoe.position.set(0, -0.45, 0.05);
    leg.add(shoe);
    root.add(leg);
  }

  // ---- 躯干 ----
  const torso = new THREE.Group();
  torso.position.y = hipY;
  root.add(torso);
  const body = cs(new THREE.Mesh(capsuleGeo(isTeacher ? 0.21 : 0.225, 0.3), topM));
  body.position.y = 0.375;
  torso.add(body);
  if (opt.dress || opt.skirt) {
    const skirt = cs(new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.43, 0.42, 14), opt.skirt ? botM : topM));
    skirt.position.y = 0.18;
    torso.add(skirt);
  }
  if (opt.backpack) {
    const bp = cs(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.32, 0.13), matOf(opt.backpack, { rough: 0.8 })));
    bp.position.set(0, 0.42, -0.29);
    torso.add(bp);
  }

  // ---- 手臂 ----
  const armGeo = capsuleGeo(0.07, 0.28);
  const armL = new THREE.Group(); armL.position.set(-0.31, 0.66, 0);
  const armR = new THREE.Group(); armR.position.set(0.31, 0.66, 0);
  for (const arm of [armL, armR]) {
    const armMesh = cs(new THREE.Mesh(armGeo, topM));
    armMesh.position.y = -0.21;
    arm.add(armMesh);
    const hand = new THREE.Mesh(sphereGeo(0.075), skinM);
    hand.position.y = -0.42;
    arm.add(hand);
    torso.add(arm);
  }

  // ---- 头 ----
  const head = new THREE.Group();
  head.position.y = 0.8;
  torso.add(head);
  const headR = isTeacher ? 0.24 : 0.26;
  const headMesh = cs(new THREE.Mesh(sphereGeo(headR), skinM));
  headMesh.position.y = 0.13;
  head.add(headMesh);

  // 发型
  const hairStyle = opt.hairStyle || pick(['crop', 'bob', 'pigtails', 'crop', 'bob', 'cap']);
  const hairTop = cs(new THREE.Mesh(sphereGeo(headR * 1.06), hairM));
  hairTop.scale.set(1.02, 0.74, 1.02);
  hairTop.position.set(0, 0.24, -0.02);
  head.add(hairTop);
  if (hairStyle === 'bob' || hairStyle === 'pigtails') {
    const back = cs(new THREE.Mesh(sphereGeo(headR * 1.05), hairM));
    back.scale.set(1.04, 0.9, 1.0);
    back.position.set(0, 0.12, -0.06);
    head.add(back);
  }
  if (hairStyle === 'pigtails') {
    for (const sx of [-1, 1]) {
      const tail = cs(new THREE.Mesh(sphereGeo(0.095), hairM));
      tail.position.set(sx * 0.27, 0.16, -0.06);
      head.add(tail);
    }
  }
  if (hairStyle === 'bun') {
    const bun = cs(new THREE.Mesh(sphereGeo(0.11), hairM));
    bun.position.set(0, 0.34, -0.14);
    head.add(bun);
  }
  if (hairStyle === 'cap') {
    const cap = cs(new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.02, headR * 1.06, 0.14, 14), matOf(pick(TOPS), { rough: 0.8 })));
    cap.position.set(0, 0.3, 0);
    head.add(cap);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.85, headR * 0.85, 0.04, 14, 1, false, 0, Math.PI), matOf('#ffffff', { rough: 0.8 }));
    brim.position.set(0, 0.24, 0.14);
    head.add(brim);
  }
  if (opt.glasses) {
    const gm = matOf('#4a3b52', { rough: 0.5 });
    for (const sx of [-1, 1]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 6, 14), gm);
      ring.position.set(sx * 0.095, 0.15, 0.225);
      head.add(ring);
    }
  }

  // ---- 面部细节（LOD 隐藏组） ----
  const face = new THREE.Group();
  head.add(face);
  const eyeM = matOf('#3a2f3a', { rough: 0.4 });
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(sphereGeo(0.04), eyeM);
    eye.position.set(sx * 0.095, 0.16, 0.215);
    face.add(eye);
  }
  for (const sx of [-1, 1]) {
    const cheek = new THREE.Mesh(sphereGeo(0.032), matOf('#ffb3a0', { rough: 0.9 }));
    cheek.position.set(sx * 0.165, 0.06, 0.19);
    face.add(cheek);
  }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.013, 6, 12, Math.PI), matOf('#c96a5a', { rough: 0.8 }));
  smile.position.set(0, 0.055, 0.225);
  smile.rotation.z = Math.PI;
  face.add(smile);

  // ---- 拾取盒 ----
  const hitH = isTeacher ? 2.2 : 1.8;
  const hitbox = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, hitH, 8),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hitbox.position.y = hitH / 2;
  root.add(hitbox);

  const person = {
    root, hitbox,
    rig: { legL, legR, torso, armL, armR, head, face, body },
    action: 'idle', poseParam: null,
    poseCur: BASE(), poseFrom: BASE(), blend: 1,
    walkPhase: rand(0, TAU), phase: rand(0, TAU),
    heading: 0, baseY: 0, yMode: 'ground', parentedY: 0,
    speedMul: rand(0.9, 1.12),
    data: {
      name: opt.name || '', nameEn: opt.nameEn || '',
      role: isTeacher ? 'teacher' : 'child',
      teacher: isTeacher, indoor: !!opt.indoor,
      activity: '待机', activityEn: 'Idle',
      color: topC,
    },
  };
  hitbox.userData.person = person;
  return person;
}

export function setAction(p, name, param = null) {
  if (p.action !== name) {
    p.poseFrom = { ...p.poseCur };
    p.blend = 0;
    p.action = name;
  }
  p.poseParam = param;
}

/** 世界场景挂载（从秋千/跷跷板等父节点脱离时用） */
export function detachToWorld(p, scene) {
  p.root.removeFromParent();
  scene.add(p.root);
  p.yMode = 'ground';
  p.root.rotation.set(0, p.heading, 0);
}

/** 每帧更新姿势并应用到骨骼 */
export function updatePerson(p, dt, t, camDist) {
  const fn = POSES[p.action] || POSES.idle;
  const target = fn(t, p.phase, p);
  if (p.blend < 1) {
    p.blend = Math.min(1, p.blend + dt * 4);
    const k = p.blend * p.blend * (3 - 2 * p.blend);
    for (const key in target) {
      p.poseCur[key] = lerp(p.poseFrom[key] ?? 0, target[key], k);
    }
  } else {
    for (const key in target) p.poseCur[key] = target[key];
  }
  const q = p.poseCur, r = p.rig;
  r.legL.rotation.x = q.lLx; r.legL.rotation.z = q.lLz;
  r.legR.rotation.x = q.lRx; r.legR.rotation.z = q.lRz;
  r.armL.rotation.x = q.aLx; r.armL.rotation.z = q.aLz;
  r.armR.rotation.x = q.aRx; r.armR.rotation.z = q.aRz;
  r.torso.rotation.x = q.lean;
  r.head.rotation.set(q.hX, q.hY, q.hZ);
  // 位置模式
  if (p.yMode === 'ground') p.root.position.y = p.baseY + q.bob;
  else if (p.yMode === 'parented') p.root.position.y = p.parentedY + q.bob * 0.5;
  // LOD：远处隐藏面部细节
  if ((p._lodT = (p._lodT || 0) + dt) > 0.25) {
    p._lodT = 0;
    r.face.visible = camDist < 42;
  }
}

/** 朝目标行走；返回是否到达 */
export function walkTo(p, x, z, speed, dt, run = false) {
  const dx = x - p.root.position.x, dz = z - p.root.position.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.1) return true;
  const th = Math.atan2(dx, dz);
  p.heading = dampAngle(p.heading, th, 8, dt);
  p.root.rotation.y = p.heading;
  const step = Math.min(dist, speed * p.speedMul * dt);
  p.root.position.x += Math.sin(p.heading) * step;
  p.root.position.z += Math.cos(p.heading) * step;
  p.walkPhase += step * (run ? 3.4 : 4.6);
  setAction(p, run ? 'run' : 'walk');
  return false;
}

/** 原地转向 */
export function faceTo(p, x, z, dt, rate = 6) {
  const th = Math.atan2(x - p.root.position.x, z - p.root.position.z);
  p.heading = dampAngle(p.heading, th, rate, dt);
  p.root.rotation.y = p.heading;
}
