// setup.js —— 渲染器 / 场景 / 相机 / 灯光
import * as THREE from 'three';
import { S } from './state.js';
import { skyTexture } from './textures.js';

export function createRenderer() {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('app').appendChild(renderer.domElement);

  renderer.info.autoReset = false; // 手动 reset 以便统计 draw calls
  S.renderer = renderer;
  return renderer;
}

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = skyTexture();
  scene.fog = new THREE.Fog(0xdff2f7, 110, 210);
  S.scene = scene;
  return scene;
}

export function createCamera() {
  const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.5, 400);
  camera.position.set(24, 34, 42);
  S.camera = camera;
  return camera;
}

export function createLights() {
  const scene = S.scene;

  // 半球光：天空蓝 + 草地绿反弹
  const hemi = new THREE.HemisphereLight(0xcfeaff, 0xa8d878, 0.95);
  scene.add(hemi);

  // 主方向光（暖阳，柔和阴影）
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.35);
  sun.position.set(38, 52, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -52;
  sun.shadow.camera.right = 52;
  sun.shadow.camera.top = 52;
  sun.shadow.camera.bottom = -52;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 160;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.035;
  scene.add(sun);
  scene.add(sun.target);
  sun.target.position.set(0, 0, 0);

  // 补光（冷色，弱，让暗部通透）
  const fill = new THREE.DirectionalLight(0xcfe8ff, 0.5);
  fill.position.set(-30, 24, -20);
  scene.add(fill);

  return { hemi, sun, fill };
}

export function onResize() {
  const camera = S.camera, renderer = S.renderer;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
