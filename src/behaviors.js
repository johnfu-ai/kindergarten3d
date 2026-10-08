// behaviors.js —— 人物行为状态机（荡秋千/滑梯/踢球/沙坑/追逐/聊天/散步/上课/阅读/午睡…）
import * as THREE from 'three';
import { S } from './state.js';
import { GY, rand, pick, TAU, lerp, clamp, easeInOut } from './palette.js';
import { createPerson, setAction, walkTo, faceTo } from './character.js';
import { matOf as matOfRef, pick as pickRef } from './palette.js';
import { SLIDE, SWING, SEESAW, SANDPIT, mountSwingKid, mountSeesawKid } from './playground.js';
import { INTERIOR } from './building.js';
import { SPORTS } from './sports.js';
import { zTexture } from './textures.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

const NAMES = [
  ['豆豆', 'Doudou'], ['小雨', 'Xiaoyu'], ['乐乐', 'Lele'], ['妞妞', 'Niuniu'],
  ['天天', 'Tiantian'], ['果果', 'Guoguo'], ['朵朵', 'Duoduo'], ['阳阳', 'Yangyang'],
  ['布丁', 'Pudding'], ['汤圆', 'Tangyuan'], ['可可', 'Coco'], ['甜甜', 'Sweetie'],
  ['淘淘', 'Taotao'], ['球球', 'Qiuqiu'], ['米米', 'Mimi'], ['嘟嘟', 'Dudu'],
  ['依依', 'Yiyi'], ['糖糖', 'Sugar'], ['花花', 'Huahua'], ['泡泡', 'Bubble'],
  ['妙妙', 'Miaomiao'], ['闹闹', 'Naonao'], ['元元', 'Yuanyuan'], ['星星', 'Xingxing'],
  ['彩虹', 'Rainbow'],
];
let nameIdx = 0;
function nextName() { return NAMES[nameIdx++ % NAMES.length]; }

function mk(opt) {
  const nm = nextName();
  const p = createPerson({ ...opt, name: opt.name || nm[0], nameEn: opt.nameEn || nm[1] });
  p.baseY = GY;
  S.scene.add(p.root);
  S.people.push(p);
  return p;
}
function label(p, cn, en) { p.data.activity = cn; p.data.activityEn = en; }

// ==================== 秋千 ×2 ====================
function spawnSwings() {
  for (let i = 0; i < 2; i++) {
    const p = mk({ dress: rand() > 0.5 });
    mountSwingKid(i === 0 ? 0 : 2, p);   // 两端座位，中间留给空座
    label(p, '荡秋千', 'Swinging');
    S.actors.push((dt, t) => {
      setAction(p, 'swingSeated', SWING.seats[i === 0 ? 0 : 2].pivot.rotation.x);
    });
  }
}

// ==================== 滑梯 ×2 ====================
function wpWalker(pts) {
  return { pts, i: 0, done: false };
}
function wpUpdate(wk, p, dt, speed) {
  if (wk.i >= wk.pts.length) { wk.done = true; return true; }
  const [x, z] = wk.pts[wk.i];
  if (walkTo(p, x, z, speed, dt)) wk.i++;
  return wk.i >= wk.pts.length;
}

function spawnSlide() {
  const O = SLIDE.origin;
  const backPath = [
    [O.x + 0.3, O.z + 4.5], [O.x + 1.7, O.z + 3.8], [O.x + 1.75, O.z + 0.6],
    [O.x + 1.75, O.z - 1.2], [O.x + 0.95, O.z - 0.95], [O.x + 0, O.z - 0.85],
  ];
  const kids = [];
  for (let k = 0; k < 2; k++) {
    const p = mk({ backpack: pick(['#ff8a72', '#4ecdc4', '#ffd166']) });
    label(p, '滑滑梯', 'On the slide');
    kids.push({ p, st: k === 0 ? 'top' : 'back', t: 0, u: 0, wk: wpWalker(backPath.slice(k === 0 ? 0 : 2)) });
    if (k === 0) {
      p.root.position.set(O.x, O.y + 2.33, O.z + 0.1);
      p.heading = 0; p.root.rotation.y = 0;
    } else {
      p.root.position.set(O.x + 1.75, GY, O.z + 2.8);
    }
  }
  const other = (k) => kids[1 - kids.indexOf(k)];
  S.actors.push((dt, t) => {
    for (const k of kids) {
      const p = k.p;
      if (k.st === 'walk') {
        // 走向爬梯（若有人正在爬/在顶则排队等候）
        const o = other(k);
        const busy = o.st === 'climb' || o.st === 'top';
        const target = busy ? [O.x + 1.0, O.z - 1.1] : [O.x, O.z - 1.5];
        if (walkTo(p, target[0], target[1], 1.5, dt)) {
          if (!busy) { k.st = 'climb'; k.t = 0; }
          else setAction(p, 'idle');
        }
      } else if (k.st === 'climb') {
        k.t += dt / 2.3;
        p.yMode = 'free';
        p.root.position.set(O.x, lerp(GY, O.y + 2.42, Math.min(1, k.t)), O.z - 1.55);
        p.heading = Math.PI; p.root.rotation.y = Math.PI;
        p.walkPhase += dt * 6.5;
        setAction(p, 'climb');
        if (k.t >= 1) { k.st = 'top'; k.t = 0; }
      } else if (k.st === 'top') {
        p.yMode = 'free';
        // 从梯顶走上平台，再坐到滑道口
        const u = Math.min(1, k.t / 0.5);
        p.root.position.set(O.x, lerp(O.y + 2.42, O.y + 2.33, u), lerp(O.z - 1.5, O.z + 0.1, u));
        p.heading = 0; p.root.rotation.y = 0;
        setAction(p, u < 1 ? 'walk' : 'sit');
        if (u < 1) p.walkPhase += dt * 6;
        k.t += dt;
        if (k.t > 1.15) { k.st = 'slide'; k.u = 0; }
      } else if (k.st === 'slide') {
        k.u += dt * (0.3 + k.u * 0.85);
        const uu = Math.min(1, k.u);
        const pos = SLIDE.curve.getPointAt(easeInOut(Math.min(1, uu)));
        const tan = SLIDE.curve.getTangentAt(Math.min(0.999, uu));
        p.yMode = 'free';
        p.root.position.set(O.x + pos.x, O.y + pos.y - 0.16, O.z + pos.z);
        p.heading = Math.atan2(tan.x, tan.z);
        p.root.rotation.y = p.heading;
        setAction(p, 'slideSeated');
        if (k.u >= 1.05) {
          k.st = 'back';
          k.wk = wpWalker(backPath);
        }
      } else if (k.st === 'back') {
        p.yMode = 'ground';
        p.baseY = GY;
        if (wpUpdate(k.wk, p, dt, 1.6)) {
          k.st = 'walk';
        }
      }
    }
  });
}

// ==================== 踢足球 ×3 ====================
function spawnBall() {
  const anchors = [[-16.5, 5.8], [-22.5, 11.0], [-23.5, 4.2]];
  const kids = anchors.map(([x, z], i) => {
    const p = mk({});
    p.root.position.set(x, GY, z);
    label(p, '踢足球', 'Playing football');
    return { p, anchor: [x, z], st: 'support', t: rand(0, 2), kickT: 0, wander: null };
  });
  const mgr = { kicker: -1, wait: 1.5 };
  const ball = S.ball;
  const bound = SPORTS.bound;

  S.actors.push((dt, t) => {
    // ---- 球物理 ----
    const v = ball.vel;
    if (v.lengthSq() > 0.001) {
      const move = v.clone().multiplyScalar(dt);
      ball.mesh.position.add(move);
      // 边界反弹
      if (ball.mesh.position.x < bound.x0 + 0.45) { ball.mesh.position.x = bound.x0 + 0.45; v.x = Math.abs(v.x) * 0.55; v.z *= 0.85; }
      if (ball.mesh.position.x > bound.x1 - 0.45) { ball.mesh.position.x = bound.x1 - 0.45; v.x = -Math.abs(v.x) * 0.55; v.z *= 0.85; }
      if (ball.mesh.position.z < bound.z0 + 0.45) { ball.mesh.position.z = bound.z0 + 0.45; v.z = Math.abs(v.z) * 0.55; v.x *= 0.85; }
      if (ball.mesh.position.z > bound.z1 - 0.45) { ball.mesh.position.z = bound.z1 - 0.45; v.z = -Math.abs(v.z) * 0.55; v.x *= 0.85; }
      v.multiplyScalar(Math.exp(-2.0 * dt));
      // 滚动
      const speed = v.length();
      if (speed > 0.02) {
        const axis = V3(0, 1, 0).cross(v.clone().normalize()).normalize();
        ball.mesh.rotateOnWorldAxis(axis, -speed * dt / 0.42);
      }
    } else if (mgr.kicker < 0) {
      mgr.wait -= dt;
      if (mgr.wait <= 0) {
        // 挑最近的空闲小朋友去踢
        let best = -1, bd = 1e9;
        kids.forEach((k, i) => {
          if (k.st !== 'support') return;
          const d = Math.hypot(k.p.root.position.x - ball.mesh.position.x, k.p.root.position.z - ball.mesh.position.z);
          if (d < bd) { bd = d; best = i; }
        });
        if (best >= 0) { mgr.kicker = best; kids[best].st = 'toBall'; }
        mgr.wait = 1.2;
      }
    }

    // ---- 小朋友 ----
    kids.forEach((k, i) => {
      const p = k.p;
      if (k.st === 'support') {
        k.t -= dt;
        if (k.t <= 0) {
          k.t = rand(1.6, 3.2);
          k.wander = [k.anchor[0] + rand(-1.4, 1.4), k.anchor[1] + rand(-1.4, 1.4)];
        }
        if (k.wander) {
          if (walkTo(p, k.wander[0], k.wander[1], 1.3, dt)) k.wander = null;
        } else setAction(p, 'idle');
      } else if (k.st === 'toBall') {
        const bx = ball.mesh.position.x, bz = ball.mesh.position.z;
        const dx = bx - p.root.position.x, dz = bz - p.root.position.z;
        const d = Math.hypot(dx, dz);
        if (d > 1.35) {
          // 跑向球（略偏后方向，便于助跑）
          const tx = bx - (dx / d) * 1.0, tz = bz - (dz / d) * 1.0;
          walkTo(p, tx, tz, 3.2, dt, true);
        } else {
          k.st = 'kick'; k.kickT = 0;
          p.heading = Math.atan2(dx, dz);
          p.root.rotation.y = p.heading;
        }
      } else if (k.st === 'kick') {
        k.kickT += dt / 0.55;
        setAction(p, 'kick', Math.min(1, k.kickT));
        if (k.kickT >= 0.5 && !k.kicked) {
          k.kicked = true;
          // 朝随机同伴方向踢
          const mate = kids[(i + 1 + Math.floor(rand(0, 2))) % 3];
          const dir = V3(mate.anchor[0] + rand(-2, 2) - ball.mesh.position.x, 0,
                         mate.anchor[1] + rand(-2, 2) - ball.mesh.position.z).normalize();
          ball.vel.copy(dir.multiplyScalar(rand(6.5, 9.5)));
        }
        if (k.kickT >= 1.15) {
          k.st = 'support'; k.kicked = false; k.t = rand(1, 2);
          mgr.kicker = -1; mgr.wait = rand(0.8, 1.6);
        }
      }
    });
  });
}

// ==================== 沙坑 ×2 ====================
function spawnSand() {
  const O = SANDPIT.origin;
  const spots = [[O.x - 1.0, O.z + 2.35], [O.x + 1.2, O.z + 2.3]];
  spots.forEach(([x, z], i) => {
    const p = mk({ dress: i === 0 });
    p.root.position.set(x, GY, z);
    p.heading = Math.PI + (i === 0 ? -0.25 : 0.2);
    p.root.rotation.y = p.heading;
    label(p, '玩沙子', 'Sand play');
    const st = { mode: 'dig', t: rand(4, 8) };
    S.actors.push((dt, t) => {
      if (st.mode === 'dig') {
        setAction(p, 'dig');
        st.t -= dt;
        if (st.t <= 0) { st.mode = 'stretch'; st.t = 1.6; }
      } else {
        setAction(p, 'idle');
        st.t -= dt;
        if (st.t <= 0) { st.mode = 'dig'; st.t = rand(5, 9); }
      }
    });
  });
}

// ==================== 跷跷板 ×2 ====================
function spawnSeesaw() {
  for (let i = 0; i < 2; i++) {
    const p = mk({});
    mountSeesawKid(i, p);
    label(p, '玩跷跷板', 'On the seesaw');
    S.actors.push((dt, t) => { setAction(p, 'sit'); });
  }
}

// ==================== 追逐 ×2 ====================
function spawnChase() {
  const CXc = 1.5, CZc = 9, RX = 7.4, RZ = 6.2;
  for (let i = 0; i < 2; i++) {
    const p = mk({});
    const st = { a: i * Math.PI + rand(0, 1), mode: 'run', t: rand(4, 7), ju: 0 };
    label(p, '玩追逐游戏', 'Playing chase');
    S.actors.push((dt, t) => {
      if (st.mode === 'run') {
        const sp = 1.05 + 0.12 * i + Math.sin(t * 0.7 + i * 2) * 0.1;
        st.a += dt * sp;
        const x = CXc + Math.sin(st.a) * RX, z = CZc + Math.cos(st.a) * RZ;
        // 朝切线方向
        const hx = Math.cos(st.a) * RX, hz = -Math.sin(st.a) * RZ;
        p.root.position.set(x, GY, z);
        p.heading = Math.atan2(hx, hz);
        p.root.rotation.y = p.heading;
        p.walkPhase += dt * 8.5;
        setAction(p, 'run');
        st.t -= dt;
        if (st.t <= 0) { st.mode = 'jump'; st.ju = 0; st.jn = 2; }
      } else {
        p.walkPhase = 0;
        setAction(p, 'jump', st.ju);
        st.ju += dt / 0.95;
        if (st.ju >= 1) {
          st.ju = 0; st.jn--;
          if (st.jn <= 0) { st.mode = 'run'; st.t = rand(4, 8); }
        }
      }
    });
  }
}

// ==================== 草坪聊天 ×2 ====================
function spawnChat() {
  const spots = [[3.6, -5.2], [5.4, -3.6]];
  spots.forEach(([x, z], i) => {
    const p = mk({ dress: i === 0 });
    p.root.position.set(x, GY, z);
    label(p, '和小伙伴聊天', 'Chatting');
    const o = spots[1 - i];
    const st = { mode: 'talk', t: rand(3, 7), ju: 0, jn: 0 };
    S.actors.push((dt, t) => {
      faceTo(p, o[0], o[1], dt, 4);
      if (st.mode === 'talk') {
        setAction(p, 'talk');
        st.t -= dt;
        if (st.t <= 0) {
          const r = rand();
          if (r < 0.4) { st.mode = 'jump'; st.ju = 0; st.jn = 2; }
          else if (r < 0.7) { st.mode = 'wave'; st.t = 2.2; }
          else { st.mode = 'clap'; st.t = 2.4; }
        }
      } else if (st.mode === 'jump') {
        setAction(p, 'jump', st.ju);
        st.ju += dt / 0.95;
        if (st.ju >= 1) { st.ju = 0; if (--st.jn <= 0) { st.mode = 'talk'; st.t = rand(3.5, 8); } }
      } else if (st.mode === 'wave') {
        setAction(p, 'wave');
        st.t -= dt;
        if (st.t <= 0) { st.mode = 'talk'; st.t = rand(3.5, 8); }
      } else {
        setAction(p, 'clap');
        st.t -= dt;
        if (st.t <= 0) { st.mode = 'talk'; st.t = rand(3.5, 8); }
      }
    });
  });
}

// ==================== 师生散步（1老师 + 2小孩） ====================
function spawnWalkGroup() {
  // 环园步道：沿操场东缘与游乐区西缘绕行一圈（避开跑道/球门/设施）
  const curve = new THREE.CatmullRomCurve3([
    V3(-4, 0, 25.5), V3(-7.5, 0, 17), V3(-7.5, 0, 4), V3(-5, 0, -4),
    V3(1, 0, -8), V3(9, 0, -9.5), V3(7.8, 0, -2), V3(7.8, 0, 8),
    V3(9, 0, 16), V3(3, 0, 22),
  ], true, 'catmullrom', 0.35);
  const len = curve.getLength();
  const speed = 1.35;

  const teacher = mk({
    teacher: true, name: '王老师', nameEn: 'Ms. Wang',
    hairStyle: 'bun', hair: '#4a3628', top: '#7cc6e8', bottom: '#f0e6d8', skirt: true,
  });
  label(teacher, '带小朋友散步', 'Walking with kids');
  const tw = { u: 0.0, waveT: 6 };
  const _p = V3(0, 0, 0), _p2 = V3(0, 0, 0);

  const kids = [0.045, 0.085].map((off, i) => {
    const p = mk({ backpack: pick(['#ffd166', '#ffa8c5', '#7cc6e8']) });
    label(p, '跟着老师散步', 'Walking with teacher');
    return { p, off };
  });

  S.actors.push((dt, t) => {
    tw.u = (tw.u + (speed * dt) / len) % 1;
    // 老师
    curve.getPointAt(tw.u, _p);
    const tan = curve.getTangentAt(tw.u);
    teacher.root.position.set(_p.x, GY, _p.z);
    teacher.heading = Math.atan2(tan.x, tan.z);
    teacher.root.rotation.y = teacher.heading;
    teacher.walkPhase += dt * 7;
    // 门口挥手
    tw.waveT -= dt;
    if (tw.waveT <= 0 && _p.z > 20) {
      setAction(teacher, 'wave');
      if (tw.waveT < -2.2) tw.waveT = rand(14, 20);
    } else {
      setAction(teacher, 'walk');
    }
    // 小孩跟随（沿路径延后）
    for (const k of kids) {
      const uu = (tw.u - k.off + 1) % 1;
      curve.getPointAt(uu, _p2);
      const tan2 = curve.getTangentAt(uu);
      k.p.root.position.set(_p2.x + Math.sin(t * 0.5 + k.off * 40) * 0.25, GY, _p2.z);
      k.p.heading = Math.atan2(tan2.x, tan2.z);
      k.p.root.rotation.y = k.p.heading;
      k.p.walkPhase += dt * 7.4;
      setAction(k.p, 'walk');
    }
  });
}

// ==================== 教室（4小孩 + 1老师） ====================
function spawnClassroom() {
  const seatPlan = [
    { t: 0, o: [1.18, 0], act: 'draw', lbl: '认真画画', lblEn: 'Drawing' },
    { t: 0, o: [-1.18, 0], act: 'draw', lbl: '认真画画', lblEn: 'Drawing' },
    { t: 1, o: [0, 1.18], act: 'draw', lbl: '认真画画', lblEn: 'Drawing' },
    { t: 1, o: [0, -1.18], act: 'raise', lbl: '举手回答问题', lblEn: 'Raising hand' },
  ];
  const F1 = GY;
  for (const s of seatPlan) {
    const tb = INTERIOR.tables[s.t];
    const p = mk({ indoor: true });
    p.root.position.set(tb.x + s.o[0], F1 + 0.05, tb.z + s.o[1]);
    p.heading = Math.atan2(-s.o[0], -s.o[1]);
    p.root.rotation.y = p.heading;
    p.baseY = F1 + 0.05;   // 坐在凳子上（臀部=凳面高）
    label(p, s.lbl, s.lblEn);
    if (s.act === 'draw') {
      S.actors.push((dt, t) => setAction(p, 'draw'));
    } else {
      const st = { mode: 'draw', t: rand(6, 11) };
      S.actors.push((dt, t) => {
        st.t -= dt;
        if (st.t <= 0) {
          st.mode = st.mode === 'draw' ? 'raise' : 'draw';
          st.t = st.mode === 'raise' ? rand(3.5, 5.5) : rand(7, 12);
          label(p, st.mode === 'raise' ? '举手回答问题' : '认真画画',
            st.mode === 'raise' ? 'Raising hand' : 'Drawing');
        }
        setAction(p, st.mode === 'raise' ? 'raise' : 'draw');
      });
    }
  }
  // 老师
  const teacher = mk({
    teacher: true, indoor: true, name: '李老师', nameEn: 'Mr. Li',
    hairStyle: 'crop', hair: '#2e2a28', top: '#ffd166', bottom: '#5b7fb5', glasses: true,
  });
  label(teacher, '给小朋友上课', 'Teaching');
  const spots = INTERIOR.teacherSpots;
  const ts = { i: 0, mode: 'teach', t: 5 };
  S.actors.push((dt, t) => {
    if (ts.mode === 'teach') {
      setAction(teacher, 'teach');
      faceTo(teacher, INTERIOR.tables[ts.i % 2].x, INTERIOR.tables[ts.i % 2].z, dt, 3);
      ts.t -= dt;
      if (ts.t <= 0) { ts.mode = 'move'; }
    } else {
      const ni = (ts.i + 1) % spots.length;
      if (walkTo(teacher, spots[ni].x, spots[ni].z, 1.1, dt)) {
        ts.i = ni; ts.mode = 'teach'; ts.t = rand(5, 8);
      }
    }
  });
}

// ==================== 阅读角 ×2 ====================
function spawnReading() {
  const seats = [INTERIOR.cushions[0], INTERIOR.cushions[2]];
  for (const cu of seats) {
    const p = mk({ indoor: true, dress: rand() > 0.5 });
    p.root.position.set(cu.x, GY - 0.26, cu.z);
    p.heading = 0.55 + cu.rot;   // 面向南偏东（朝向窗户与镜头，露出脸和书本）
    p.root.rotation.y = p.heading;
    p.baseY = GY - 0.26;   // 坐在坐垫上
    label(p, '安静地看书', 'Reading');
    // 手中的小书本（可见道具）
    const book = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.09, 0.42),
      matOfRef(pick(['#ff8a72', '#4ecdc4', '#ffd166', '#c3a6e8']), { rough: 0.85 }));
    book.position.set(0, 0.4, 0.5);
    book.rotation.x = 0.55;
    p.rig.torso.add(book);
    const st = { flip: false, t: rand(4, 9) };
    S.actors.push((dt, t) => {
      st.t -= dt;
      if (st.t <= 0) { st.flip = !st.flip; st.t = st.flip ? rand(0.9, 1.4) : rand(4, 9); }
      setAction(p, st.flip ? 'readFlip' : 'read');
    });
  }
}

// ==================== 午睡 ×2（二层） ====================
function spawnNap() {
  const F2 = GY + 3.4;
  const zTex = zTexture();
  for (let i = 0; i < 2; i++) {
    const ct = INTERIOR.cots[i === 0 ? 0 : 2];   // 使用靠窗且不同窗格的两张床，避免互相遮挡
    const p = mk({ indoor: true, dress: i === 0 });
    p.root.position.set(ct.x, F2 + 0.62, ct.z + 0.12);
    p.root.rotation.x = -Math.PI / 2;
    p.root.rotation.y = 0;
    p.baseY = F2 + 0.62;   // 躺在小床上
    label(p, '甜甜地午睡', 'Napping');
    S.actors.push((dt, t) => setAction(p, 'sleep'));

    // Zzz 精灵
    for (let k = 0; k < 2; k++) {
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: zTex, transparent: true, opacity: 0.9, depthWrite: false }));
      spr.scale.setScalar(0.42);
      spr.position.set(ct.x + 0.35 + k * 0.18, F2 + 1.6, ct.z - 0.85);
      S.scene.add(spr);
      const ph = rand(0, TAU);
      S.actors.push((dt, t) => {
        const u = ((t + ph) % 3) / 3;
        spr.position.y = F2 + 1.5 + u * 1.0;
        spr.material.opacity = 0.85 * (1 - u);
        spr.scale.setScalar(0.3 + u * 0.28);
      });
    }
  }
}

// ==================== 校门口迎接老师 ====================
function spawnGateTeacher() {
  const teacher = mk({
    teacher: true, name: '张老师', nameEn: 'Ms. Zhang',
    hairStyle: 'bob', hair: '#6b4a2f', top: '#ffa8c5', bottom: '#c3a6e8', skirt: true,
  });
  teacher.root.position.set(1.6, GY, 27);
  label(teacher, '欢迎小朋友', 'Welcoming kids');
  const spots = [[1.6, 27], [-2.0, 26.6], [2.4, 25.8]];
  const st = { i: 0, mode: 'wave', t: 3 };
  S.actors.push((dt, t) => {
    if (st.mode === 'wave') {
      setAction(teacher, 'wave');
      faceTo(teacher, 0, 34, dt, 4);
      st.t -= dt;
      if (st.t <= 0) { st.mode = 'go'; }
    } else {
      const ni = (st.i + 1) % spots.length;
      if (walkTo(teacher, spots[ni][0], spots[ni][1], 0.95, dt)) {
        st.i = ni; st.mode = 'wave'; st.t = rand(3.5, 6);
      }
    }
  });
}

export function spawnPeople() {
  spawnSwings();
  spawnSlide();
  spawnBall();
  spawnSand();
  spawnSeesaw();
  spawnChase();
  spawnChat();
  spawnWalkGroup();
  spawnClassroom();
  spawnReading();
  spawnNap();
  spawnGateTeacher();
  return {
    kids: S.people.filter(p => !p.data.teacher).length,
    teachers: S.people.filter(p => p.data.teacher).length,
  };
}
