// interaction.js —— 射线拾取：人物悬停/点击标签 + 区域热点聚焦
import * as THREE from 'three';
import { S } from './state.js';
import { GY } from './palette.js';

export function initInteraction() {
  const renderer = S.renderer, camCtl = S.camCtl;
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const canvas = renderer.domElement;

  // ---------- 区域热点（不可见，仅用于拾取） ----------
  const invisibleMat = new THREE.MeshBasicMaterial({ visible: false });
  const hotspotDefs = [
    { area: 'sports',    kind: 'cyl', x: -20,  z: 8,    r: 12.5, h: 8, y: GY + 4,   label: '操场 · Sports Field' },
    { area: 'play',      kind: 'cyl', x: 20,   z: 4,    r: 11.5, h: 8, y: GY + 4,   label: '游乐区 · Playground' },
    { area: 'classroom', kind: 'box', x: -8.4, y: GY + 1.9, z: -15.1, w: 10.5, h: 2.9, d: 1.4, label: '教室 · Classroom' },
    { area: 'reading',   kind: 'box', x: 8.4,  y: GY + 1.9, z: -15.1, w: 10.5, h: 2.9, d: 1.4, label: '阅读区 · Reading Corner' },
    { area: 'nap',       kind: 'box', x: -8.4, y: GY + 5.4, z: -15.1, w: 10.5, h: 2.6, d: 1.4, label: '午休区 · Nap Room' },
  ];
  for (const d of hotspotDefs) {
    let geo;
    if (d.kind === 'cyl') geo = new THREE.CylinderGeometry(d.r, d.r, d.h, 12);
    else geo = new THREE.BoxGeometry(d.w, d.h, d.d);
    const m = new THREE.Mesh(geo, invisibleMat);
    m.position.set(d.x, d.y, d.z);
    m.userData.hotspot = d;
    S.scene.add(m);
    S.hotspots.push(m);
  }

  // ---------- 悬停标记圈 ----------
  const marker = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.72, 28),
    new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }),
  );
  marker.rotation.x = -Math.PI / 2;
  marker.visible = false;
  marker.renderOrder = 5;
  S.scene.add(marker);

  // ---------- 标签 DOM ----------
  const labelEl = document.getElementById('label');
  const whoEl = labelEl.querySelector('.who');
  const whatEl = labelEl.querySelector('.what');

  const hitboxes = () => S.people.map(p => p.hitbox);
  const hotspotMeshes = () => S.hotspots;

  function toNDC(e) {
    const r = canvas.getBoundingClientRect();
    ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  }

  function pick(e) {
    toNDC(e);
    ray.setFromCamera(ndc, S.camera);
    // 人物优先
    const hp = ray.intersectObjects(hitboxes(), false);
    if (hp.length) return { type: 'person', person: hp[0].object.userData.person };
    const ha = ray.intersectObjects(hotspotMeshes(), false);
    if (ha.length) return { type: 'area', hotspot: ha[0].object.userData.hotspot };
    return null;
  }

  function showLabel(e, who, what, dotColor) {
    whoEl.innerHTML = `<span class="dot" style="background:${dotColor}"></span>${who}`;
    whatEl.textContent = what;
    labelEl.classList.add('on');
    const pad = 14;
    let x = e.clientX, y = e.clientY - 6;
    const rect = labelEl.getBoundingClientRect();
    if (x - rect.width / 2 < 4) x = rect.width / 2 + 4;
    if (x + rect.width / 2 > innerWidth - 4) x = innerWidth - rect.width / 2 - 4;
    if (y - rect.height < 4) y = rect.height + 8;
    labelEl.style.left = x + 'px';
    labelEl.style.top = y + 'px';
  }
  function hideLabel() { labelEl.classList.remove('on'); }

  let hovered = null;

  function setHover(h, e) {
    hovered = h;
    if (!h) {
      hideLabel();
      marker.visible = false;
      canvas.classList.remove('hovering');
      return;
    }
    canvas.classList.add('hovering');
    if (h.type === 'person') {
      const p = h.person, d = p.data;
      const icon = d.teacher ? '👩‍🏫' : '🧒';
      showLabel(e, `${icon} ${d.name}`, `${d.activity} · ${d.activityEn}`, d.color);
      marker.visible = true;
      p.root.getWorldPosition(marker.position);
      marker.position.y += 0.06;
    } else {
      showLabel(e, `📍 ${h.hotspot.label}`, '点击聚焦查看 Click to focus', '#4ecdc4');
      marker.visible = false;
    }
  }

  canvas.addEventListener('pointermove', (e) => {
    if (camCtl.pointers.size > 0) return;   // 拖拽中不拾取
    setHover(pick(e), e);
  });
  canvas.addEventListener('pointerleave', () => setHover(null, null));

  canvas.addEventListener('pointerup', (e) => {
    const di = camCtl.dragInfo;
    if (di.moved > 7 || performance.now() - di.downT > 600) return;   // 拖拽不算点击
    if (e.button !== 0) return;
    const hit = pick(e);
    if (!hit) return;
    if (hit.type === 'person') {
      S.tour = null;
      window.dispatchEvent(new CustomEvent('tour-off'));
      S.camCtl.followPerson(hit.person);
      S.flags.following = hit.person;
      window.dispatchEvent(new CustomEvent('follow-person', { detail: { person: hit.person } }));
    } else {
      S.camCtl.focus(hit.hotspot.area);
      S.tour = null;
      window.dispatchEvent(new CustomEvent('area-focus', { detail: { area: hit.hotspot.area } }));
      window.dispatchEvent(new CustomEvent('tour-off'));
    }
  });

  return { pick };
}
