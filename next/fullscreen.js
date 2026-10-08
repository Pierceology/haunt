// Full screen, where the browser allows it (desktop and Android; iPhone Safari can't, so the button stays hidden there).
(() => {
  'use strict';
  if (window.GOODBYE_GATE && window.GOODBYE_GATE.on) return;   // the desktop-only page (index.html): nothing here starts on a phone
  const btn = document.getElementById('fsBtn');
  const intro = document.getElementById('fsIntro');
  if (!btn) return;
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  const exit = document.exitFullscreen || document.webkitExitFullscreen;
  if (!req || !(document.fullscreenEnabled || document.webkitFullscreenEnabled)) return;
  btn.hidden = false;
  if (intro) intro.hidden = false;
  const current = () => document.fullscreenElement || document.webkitFullscreenElement;
  const sync = () => {
    const on = !!current();
    btn.setAttribute('aria-label', on ? 'Exit full screen' : 'Full screen');
    btn.setAttribute('aria-pressed', String(on));
    btn.classList.toggle('on', on);
    if (intro) intro.textContent = on ? 'Exit full screen' : 'Full screen';
  };
  const toggle = () => {
    try {
      const p = current() ? exit.call(document) : req.call(el);
      if (p && p.catch) p.catch(() => {});
    } catch (e) { /* the frame refused; nothing to do */ }
  };
  btn.addEventListener('click', toggle);
  if (intro) intro.addEventListener('click', toggle);
  document.addEventListener('fullscreenchange', sync);
  document.addEventListener('webkitfullscreenchange', sync);
  addEventListener('keydown', (e) => {
    if (e.key !== 'f' && e.key !== 'F') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const a = document.activeElement;
    if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable)) return;
    toggle();
  });
  sync();
})();
