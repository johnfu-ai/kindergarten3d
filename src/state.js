// state.js —— 全局共享上下文（避免循环依赖）
export const S = {
  scene: null,
  camera: null,
  renderer: null,
  camCtl: null,          // 相机控制器（camera-manager.js 填充）
  people: [],            // 所有人物 {root, hitbox, data}
  hotspots: [],          // 区域点击热点 {mesh, area, label}
  ambient: [],           // 环境动画更新函数 (dt,t)=>void
  actors: [],            // 行为更新函数 (dt,t)=>void
  ball: null,            // 足球 {mesh, vel}
  flags: { tour: false, following: null, quality: 2 },
  time: 0,
};
