// main.js —— 启动流程 + 主循环（RAF）
import * as THREE from 'three';
import { S } from './state.js';
import { srand } from './palette.js';
import { createRenderer, createScene, createCamera, createLights, onResize } from './setup.js';
import { CamCtl } from './camera-manager.js';
import { buildGround } from './ground.js';
import { buildBuilding } from './building.js';
import { buildSports } from './sports.js';
import { buildPlayground } from './playground.js';
import { buildNature } from './nature.js';
import { spawnPeople } from './behaviors.js';
import { updatePerson } from './character.js';
import { initInteraction } from './interaction.js';
import { initUI } from './ui.js';

const $bar = document.getElementById('bar');
const $tip = document.getElementById('load-tip');
const $loading = document.getElementById('loading');
const $hud = document.getElementById('hud');
const $fps = document.getElementById('fps');

const nextFrame = () => new Promise(r => setTimeout(r, 20));  // 不用 rAF：后台标签页会被节流卡死
async function step(i, text) {
  $bar.style.width = (i * 100) + '%';
  $tip.textContent = text;
  await nextFrame(); await nextFrame();
}

(async function boot() {
  try {
    srand(20261007);
    await step(0.08, '正在准备画布…');
    const renderer = createRenderer();
    createScene();
    createCamera();
    createLights();

    await step(0.2, '正在铺设草坪与跑道…');
    buildGround();
    buildSports();

    await step(0.38, '正在搭建幼儿园主楼…');
    buildBuilding();

    await step(0.55, '正在安装滑梯与秋千…');
    buildPlayground();

    await step(0.72, '正在种花栽树、等待白云飘来…');
    buildNature();

    await step(0.86, '小朋友们陆续到校啦…');
    const { kids, teachers } = spawnPeople();

    // 相机 + 交互 + UI
    S.camCtl = new CamCtl(S.camera, renderer.domElement);
    initInteraction();
    initUI();
    window.addEventListener('resize', onResize);

    await step(1, '准备就绪，开园啦！');
    window.__S = S;   // 调试/测试接口
    window.__dbg = {
      kids, teachers,
      people: S.people.length,
      drawCalls: 0, fps: 0,
      quality: () => S.flags.quality,
    };

    // ---- 开场 ----
    $loading.classList.add('hide');
    $hud.classList.add('on');
    S.camCtl.intro();
    setTimeout(() => $loading.remove(), 900);

    // ---- 主循环 ----
    const clock = new THREE.Clock();
    let frames = 0, fpsT = 0, fps = 60;
    let adaptT = 0, adaptDone = 0;
    const camPos = new THREE.Vector3();
    const tmp = new THREE.Vector3();

    function frame(nowDt) {
      const dt = nowDt !== undefined ? nowDt : Math.min(clock.getDelta(), 0.05);
      const t = (S.time += dt);

      if (S.tour) S.tour.update(dt);
      S.camCtl.update(dt);

      for (const fn of S.ambient) fn(dt, t);
      for (const fn of S.actors) fn(dt, t);

      camPos.copy(S.camera.position);
      for (const p of S.people) {
        p.root.getWorldPosition(tmp);
        updatePerson(p, dt, t, tmp.distanceTo(camPos));
      }

      renderer.info.reset();
      renderer.render(S.scene, S.camera);
      window.__dbg.drawCalls = renderer.info.render.calls;
      window.__dbg.triangles = renderer.info.render.triangles;

      // FPS 统计
      frames++; fpsT += dt;
      if (fpsT >= 0.5) {
        fps = Math.round(frames / fpsT);
        window.__dbg.fps = fps;
        $fps.textContent = `FPS ${fps}`;
        $fps.style.color = fps >= 45 ? '#5b7a6b' : fps >= 30 ? '#c98a2a' : '#c94a4a';
        frames = 0; fpsT = 0;
      }

      // 自适应画质（开场后 6s 生效）
      adaptT += dt;
      if (adaptT > 6 && adaptDone < 2 && fps < 40) {
        adaptDone++;
        S.flags.quality = adaptDone === 1 ? 1 : 0;
        const pr = adaptDone === 1 ? 1.35 : 1;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, pr));
        onResize();
      }
    }
    window.__dbg.frame = frame;   // 手动步进（测试/后台标签页用）

    renderer.setAnimationLoop(() => frame());
  } catch (err) {
    console.error(err);
    $tip.innerHTML = `<span style="color:#c94a4a">加载失败：${err.message}</span>`;
    $bar.style.width = '100%';
    $bar.style.background = '#c94a4a';
  }
})();
