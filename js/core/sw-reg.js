/* ======================================================================
 * sw-reg.js —— PWA：Service Worker 注册与版本更新提示（v42·E526 自 index.html 内联块收编）
 * 离线可玩、可添加到主屏幕（http/https 环境生效）；检测到新版本就绪时按场景提示刷新——
 * 开始界面插提示条、游戏进行中走全局 toast；战斗/挂机未停时点刷新会被拦下并改提示。
 * 时机：本模块在 bundle 链尾求值，仅挂 window load 回调——注册不阻塞游戏初始化。
 * ====================================================================== */
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => {
        // v30 更新链：检测到新版本就绪时提示刷新（只在非战斗/非挂机时机弹，用户点才 reload）
        const notifyUpdate = () => {
          if (sessionStorage.getItem('sw_update_notified')) return;
          sessionStorage.setItem('sw_update_notified', '1');
          const canReload = () => !(window.Battle && Battle.active) && !(window.AutoCult && AutoCult.active) && !(window.Story && Story.active && Story.active());
          const show = () => {
            const tip = document.querySelector('.start-tip');
            if (!tip || document.getElementById('sw-update-tip')) return;
            const div = document.createElement('div');
            div.id = 'sw-update-tip';
            div.className = 'tip-line';
            div.style.marginTop = '6px';
            div.innerHTML = '✦ 新版本已就绪 —— <a href="#" id="sw-update-link" style="color:var(--hl,#c9a86a)">点此刷新启用</a>（挂机进度会自动存档）';
            tip.after(div);
            div.querySelector('#sw-update-link').addEventListener('click', (ev) => {
              ev.preventDefault();
              if (canReload()) location.reload();
              else UI.toast('战斗/挂机结束后再刷新更稳妥——进度已自动存档');
            });
          };
          if (document.getElementById('start-screen') && !document.getElementById('start-screen').classList.contains('hidden')) show();
          // v31 修瑕（E25）：游戏进行中收到的更新通知改走全局 toast——原延迟路径把提示插进隐藏的开始界面，
          // 玩家在游戏内永远看不到「新版本已就绪」
          else {
            const inGameTip = () => {
              if (document.getElementById('sw-update-tip')) return;
              UI.toast('✦ 新版本已就绪——回到开始界面即可刷新启用（进度已自动存档）');
            };
            const waitStart = () => {
              if (!document.getElementById('start-screen') || document.getElementById('start-screen').classList.contains('hidden')) { setTimeout(waitStart, 3000); return; }
              show();
            };
            setTimeout(() => { if (canReload()) waitStart(); else inGameTip(); }, 15000);
          }
        };
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) notifyUpdate(); });
        });
        navigator.serviceWorker.addEventListener('controllerchange', () => { /* 由上方 updatefound 路径统一提示 */ });
        return navigator.serviceWorker.ready;
      })
      .then(() => {
        const tip = document.querySelector('.start-tip');
        if (tip && !sessionStorage.getItem('pwa_hint')) {
          sessionStorage.setItem('pwa_hint', '1');
          tip.innerHTML += '<br>✦ 已可离线游玩——手机端可「添加到主屏幕」当 App 使用';
        }
      })
      .catch(() => { /* SW 不可用不影响游戏 */ });
  });
}
