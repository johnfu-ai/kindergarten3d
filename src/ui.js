// ui.js —— 界面按钮 / 区域导航 / 自动漫游开关
import { S } from './state.js';
import { Tour } from './camera-manager.js';

export function initUI() {
  const chips = [...document.querySelectorAll('.chip')];
  const btnTour = document.getElementById('btn-tour');
  const btnHome = document.getElementById('btn-home');

  const setActive = (area) => chips.forEach(c => c.classList.toggle('active', !!area && c.dataset.area === area));
  const stopTour = () => {
    if (S.tour) { S.tour = null; syncTourBtn(false); }
  };
  const syncTourBtn = (on) => {
    btnTour.classList.toggle('active', on);
    btnTour.textContent = on ? '⏸ 停止漫游' : '🎬 自动漫游';
  };

  chips.forEach(c => c.addEventListener('click', () => {
    stopTour();
    S.camCtl.focus(c.dataset.area);
    setActive(c.dataset.area);
  }));

  btnTour.addEventListener('click', () => {
    if (S.tour) { stopTour(); }
    else {
      S.tour = new Tour(S.camCtl);
      syncTourBtn(true);
    }
  });

  btnHome.addEventListener('click', () => {
    stopTour();
    S.camCtl.focus('panorama');
    setActive('panorama');
  });

  window.addEventListener('tour-off', () => { S.tour = null; syncTourBtn(false); });
  window.addEventListener('tour-stop', (e) => setActive(e.detail.area));
  window.addEventListener('area-focus', (e) => setActive(e.detail.area));
  window.addEventListener('follow-person', () => {
    setActive(null);
    btnHome.classList.add('active');
  });
  window.addEventListener('unfollow', () => btnHome.classList.remove('active'));

  return { setActive };
}
