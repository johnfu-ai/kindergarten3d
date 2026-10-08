// textures.js —— Canvas 程序化贴图（标识 / 黑板 / 时钟 / 天空 / 装饰画）
import * as THREE from 'three';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}
function tex(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** 中英双语横幅牌（返回 texture；绘制在透明/纯色圆角底上） */
export function signTexture(cn, en, opt = {}) {
  const W = opt.w || 1024, H = opt.h || 256;
  const [c, g] = makeCanvas(W, H);
  const bg = opt.bg || '#ffffff';
  g.fillStyle = bg;
  const r = 42;
  g.beginPath();
  g.roundRect(4, 4, W - 8, H - 8, r);
  g.fill();
  g.lineWidth = 12; g.strokeStyle = opt.border || '#ff8a72';
  g.stroke();
  // 彩虹小点装饰
  const dots = ['#ff8a72', '#ffd166', '#4ecdc4', '#8fd3ff', '#ffa8c5'];
  for (let i = 0; i < 5; i++) {
    g.fillStyle = dots[i];
    g.beginPath(); g.arc(60 + i * 46, 40, 11, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(60 + i * 46, H - 40, 11, 0, Math.PI * 2); g.fill();
  }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = opt.cnColor || '#4a3b52';
  g.font = `bold ${opt.cnSize || 108}px "Microsoft YaHei", "PingFang SC", sans-serif`;
  g.fillText(cn, W / 2, H * 0.4);
  g.fillStyle = opt.enColor || '#7c6ce0';
  g.font = `bold ${opt.enSize || 44}px "Comic Sans MS", "Trebuchet MS", sans-serif`;
  g.fillText(en, W / 2, H * 0.76);
  return tex(c);
}

/** 天空渐变（场景背景） */
export function skyTexture() {
  const [c, g] = makeCanvas(64, 512);
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#8ecdf5');
  grad.addColorStop(0.45, '#c8e9fb');
  grad.addColorStop(0.75, '#e8f7ef');
  grad.addColorStop(1, '#f2fbe9');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 512);
  const t = tex(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** 黑板（粉笔内容） */
export function blackboardTexture() {
  const [c, g] = makeCanvas(512, 288);
  g.fillStyle = '#3d6b4f';
  g.fillRect(0, 0, 512, 288);
  g.fillStyle = 'rgba(255,255,255,.06)';
  for (let i = 0; i < 60; i++) g.fillRect(Math.random() * 512, Math.random() * 288, 22, 2);
  g.strokeStyle = '#f4f9f0'; g.lineWidth = 5; g.lineCap = 'round';
  // 太阳
  g.beginPath(); g.arc(92, 74, 30, 0, Math.PI * 2); g.stroke();
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    g.beginPath();
    g.moveTo(92 + Math.cos(a) * 40, 74 + Math.sin(a) * 40);
    g.lineTo(92 + Math.cos(a) * 54, 74 + Math.sin(a) * 54);
    g.stroke();
  }
  // A B C
  g.fillStyle = '#ffe9a8'; g.font = 'bold 54px "Comic Sans MS", sans-serif';
  g.fillText('A', 210, 84); g.fillText('B', 290, 84); g.fillText('C', 370, 84);
  // 简笔小房子
  g.strokeStyle = '#ffd166';
  g.beginPath();
  g.moveTo(70, 220); g.lineTo(70, 150); g.lineTo(130, 110); g.lineTo(190, 150); g.lineTo(190, 220); g.closePath();
  g.moveTo(115, 220); g.lineTo(115, 180); g.lineTo(150, 180); g.lineTo(150, 220);
  g.stroke();
  // 1+2=3
  g.fillStyle = '#a8e6cf'; g.font = 'bold 44px "Comic Sans MS", sans-serif';
  g.fillText('1 + 2 = 3', 250, 210);
  // 小花
  g.strokeStyle = '#ffa8c5';
  g.beginPath(); g.arc(430, 190, 6, 0, Math.PI * 2); g.stroke();
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2;
    g.beginPath(); g.arc(430 + Math.cos(a) * 16, 190 + Math.sin(a) * 16, 7, 0, Math.PI * 2); g.stroke();
  }
  return tex(c);
}

/** 时钟表盘 */
export function clockTexture() {
  const [c, g] = makeCanvas(256, 256);
  g.fillStyle = '#fffaf0';
  g.beginPath(); g.arc(128, 128, 124, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#ff8a72'; g.lineWidth = 14;
  g.beginPath(); g.arc(128, 128, 116, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#4a3b52';
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    const r1 = i % 3 === 0 ? 88 : 96;
    g.beginPath();
    g.arc(128 + Math.cos(a) * r1, 128 + Math.sin(a) * r1, i % 3 === 0 ? 8 : 5, 0, Math.PI * 2);
    g.fill();
  }
  return tex(c);
}

/** 北墙彩色装饰壁画（彩虹+房子+气球） */
export function muralTexture() {
  const [c, g] = makeCanvas(1024, 384);
  g.fillStyle = '#fdf3e3'; g.fillRect(0, 0, 1024, 384);
  // 彩虹
  const cols = ['#ff8a72', '#ffd166', '#a8e6cf', '#8fd3ff', '#c3a6e8'];
  const cx = 512, cy = 320;
  for (let i = 0; i < 5; i++) {
    g.strokeStyle = cols[i]; g.lineWidth = 30;
    g.beginPath(); g.arc(cx, cy, 200 - i * 32, Math.PI, Math.PI * 2); g.stroke();
  }
  // 云朵
  g.fillStyle = '#ffffff';
  const cloud = (x, y, s) => {
    g.beginPath();
    g.arc(x, y, 26 * s, 0, Math.PI * 2);
    g.arc(x + 30 * s, y - 10 * s, 32 * s, 0, Math.PI * 2);
    g.arc(x + 66 * s, y, 24 * s, 0, Math.PI * 2);
    g.fill();
  };
  cloud(180, 100, 1.3); cloud(850, 130, 1.0);
  // 气球
  const bal = (x, y, col) => {
    g.fillStyle = col;
    g.beginPath(); g.ellipse(x, y, 26, 32, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#8a7a96'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(x, y + 32); g.quadraticCurveTo(x + 8, y + 70, x - 4, y + 110); g.stroke();
  };
  bal(90, 90, '#ff8a72'); bal(940, 80, '#4ecdc4');
  return tex(c);
}

/** 飘出的“Z”字精灵 */
export function zTexture() {
  const [c, g] = makeCanvas(64, 64);
  g.fillStyle = '#ffffff';
  g.strokeStyle = '#7c6ce0'; g.lineWidth = 4;
  g.font = 'bold 44px "Comic Sans MS", sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.strokeText('Z', 32, 34);
  g.fillText('Z', 32, 34);
  return tex(c);
}

/** 足球贴图（白底黑色五边形点缀） */
export function ballTexture() {
  const [c, g] = makeCanvas(128, 128);
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#3a3a3a';
  const pents = [[24, 24], [88, 30], [30, 86], [92, 92], [64, 58]];
  for (const [x, y] of pents) {
    g.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i / 5 * Math.PI * 2;
      const px = x + Math.cos(a) * 14, py = y + Math.sin(a) * 14;
      i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
    }
    g.closePath(); g.fill();
  }
  return tex(c);
}
