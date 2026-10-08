// palette.js —— 全局配色 + 材质缓存 + 随机工具
import * as THREE from 'three';

export const GY = 2.6; // 平台地面高度（所有户外物体的基准Y）

export const C = {
  grass:      '#8fce62',
  grassDark:  '#7cbf52',
  dirt:       '#c9a273',
  dirtDark:   '#b58e5f',
  path:       '#f5e6c8',
  pathEdge:   '#e8d3ac',
  rubberRed:  '#e5675f',
  rubberTeal: '#5fc9b9',
  rubberYellow:'#ffd166',
  rubberBlue: '#7cc6e8',
  sand:       '#f2d791',
  sandEdge:   '#ffffff',
  fieldGreen: '#86cf58',
  fieldLine:  '#ffffff',
  wall:       '#fff6e6',
  wallShade:  '#f7e8d2',
  roof:       '#ff8f70',
  roofDark:   '#f2785b',
  wood:       '#d9a76a',
  woodDark:   '#c08e52',
  white:      '#ffffff',
  fenceWhite: '#ffffff',
  metal:      '#9fb8c8',
  trunk:      '#a9744f',
  leaf1:      '#6fc36a',
  leaf2:      '#8fd45e',
  leaf3:      '#5eb85f',
  cloud:      '#ffffff',
  accentCoral:'#ff8a72',
  accentMint: '#7fe0c3',
  accentSky:  '#8fd3ff',
  accentPink: '#ffa8c5',
  accentPurple:'#c3a6e8',
  interiorFloor:'#f7e2c0',
  classFloor: '#f5d9a8',
  readFloor:  '#d9ecff',
  napFloor:   '#dcd6f7',
  blackboard: '#3d6b4f',
};

// 皮肤/头发/衣服随机池（卡通清新）
export const SKINS = ['#ffd9b8', '#f8c9a0', '#eab88f', '#f6d0ac', '#dcae85'];
export const HAIRS = ['#4a3628', '#6b4a2f', '#2e2a28', '#a5683a', '#c98d4e', '#8a5a3a'];
export const TOPS  = ['#ff8a72', '#ffd166', '#4ecdc4', '#7cc6e8', '#ffa8c5', '#a8e6cf', '#c3a6e8', '#ff9f68', '#6dd5a8', '#f97f8e'];
export const PANTS = ['#5b7fb5', '#7a6eae', '#e8a13c', '#5fa8a0', '#8a79b8', '#d97b6c'];
export const SHOES = ['#5a4632', '#e8e2d6', '#ff8a72', '#4ecdc4'];

const matCache = new Map();
/** 平光卡通材质（带缓存） */
export function matOf(hex, opts = {}) {
  const key = hex + JSON.stringify(opts);
  if (matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshStandardMaterial({
    color: new THREE.Color(hex),
    roughness: opts.rough ?? 0.88,
    metalness: opts.metal ?? 0,
    flatShading: opts.flat ?? false,
    transparent: opts.opacity !== undefined,
    opacity: opts.opacity ?? 1,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveI ?? 1,
    side: opts.side ?? THREE.FrontSide,
  });
  matCache.set(key, m);
  return m;
}

// ---------- 随机（可复现种子） ----------
let _s = 20261007;
export function srand(s){ _s = s >>> 0; }
export function rand(a = 1, b = null) {
  _s |= 0; _s = (_s + 0x6D2B79F5) | 0;
  let t = Math.imul(_s ^ (_s >>> 15), 1 | _s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  t = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return b === null ? t * a : a + t * (b - a);
}
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[Math.floor(rand() * arr.length)];

// ---------- 数学 ----------
export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, l, dt) => lerp(a, b, 1 - Math.exp(-l * dt));
/** 角度插值（最短弧） */
export function dampAngle(a, b, l, dt) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return a + d * (1 - Math.exp(-l * dt));
}
export const smooth01 = (t) => t * t * (3 - 2 * t);
export const easeInOut = (t) => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

// ---------- 几何工具 ----------
/** 圆角矩形 Shape（中心在原点） */
export function roundedRectShape(w, d, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -d / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + d - r);
  s.absarc(x + w - r, y + d - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + d);
  s.absarc(x + r, y + d - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

/** 在指定位置添加 mesh 并返回 */
export function add(parent, mesh, x = 0, y = 0, z = 0) {
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}
/** box 快捷方式 */
export function box(w, h, d, mat) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
}
export function cyl(rt, rb, h, mat, seg = 14) {
  return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
}
export function sph(r, mat, w = 14, h = 12) {
  return new THREE.Mesh(new THREE.SphereGeometry(r, w, h), mat);
}

/** 阴影批量设置 */
export function shadow(mesh, cast = true, receive = false) {
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}
export function shadowR(mesh) { mesh.castShadow = false; mesh.receiveShadow = true; return mesh; }
