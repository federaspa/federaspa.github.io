/* Neural network background */
(() => {
  const canvas = document.getElementById('net');
  const ctx = canvas.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const noHover = matchMedia('(hover: none)').matches;
  const hintEl = document.getElementById('hint-text');
  if (noHover && hintEl) hintEl.textContent = 'Touch and drag. You’re the input layer.';

  let W, H, dpr, layers = [], edges = [];
  const pointer = { x: -9999, y: -9999, active: false };
  const t0 = performance.now();

  function build() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const L = W < 700 ? 5 : W < 1100 ? 7 : 9;
    const sizes = [];
    for (let l = 0; l < L; l++) { const base = W < 700 ? 6 : 8; sizes.push(l === 0 || l === L - 1 ? base - 3 : base + ((l % 2) ? 1 : -1)); }
    layers = sizes.map((n, l) => {
      const x = W * (0.06 + 0.88 * l / (L - 1));
      return Array.from({ length: n }, (_, i) => ({ x: x + (Math.random() - .5) * 18, y: H * (0.1 + 0.8 * (i + .5) / n) + (Math.random() - .5) * 24, a: 0, l }));
    });
    edges = [];
    for (let l = 0; l < L - 1; l++) for (const s of layers[l]) for (const d of layers[l + 1]) edges.push({ s, d, w: Math.pow(Math.random(), 1.6) });
    for (const n of layers.flat()) n.in = edges.filter(e => e.d === n);
  }

  function step() {
    if (noHover && !pointer.active) {
      const t = (performance.now() - t0) / 1000;
      pointer.x = W * (0.5 + 0.38 * Math.sin(t * 0.35));
      pointer.y = H * (0.5 + 0.3 * Math.sin(t * 0.53 + 1));
    }
    const sigma = Math.max(90, W * 0.08);
    for (const layer of layers) for (const n of layer) {
      const dx = n.x - pointer.x, dy = n.y - pointer.y;
      const direct = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
      let prop = 0;
      if (n.in.length) { let sw = 0; for (const e of n.in) { prop += e.w * e.s.a; sw += e.w; } prop = Math.min(1, (prop / sw) * 1.6); }
      const target = Math.max(direct, prop * 0.55);
      n.a += (target - n.a) * (reduce ? 1 : 0.12);
    }
  }

  const PAL = [[255,106,19],[255,77,141],[155,123,255],[45,212,191],[255,176,32]];
  function colAt(l) {
    const t = layers.length > 1 ? l / (layers.length - 1) * (PAL.length - 1) : 0;
    const i = Math.min(PAL.length - 2, Math.floor(t)), f = t - i;
    return PAL[i].map((v, k) => Math.round(v + (PAL[i + 1][k] - v) * f));
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = Math.max(0.3, 1 - (scrollY / H) * 0.8);
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(242,237,230,0.055)';
    ctx.beginPath();
    for (const e of edges) { ctx.moveTo(e.s.x, e.s.y); ctx.lineTo(e.d.x, e.d.y); }
    ctx.stroke();
    for (const e of edges) {
      const v = e.s.a * e.w; if (v < 0.03) continue;
      const c = colAt(e.s.l); ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${Math.min(0.8, v)})`; ctx.lineWidth = 0.6 + v * 1.6;
      ctx.beginPath(); ctx.moveTo(e.s.x, e.s.y); ctx.lineTo(e.d.x, e.d.y); ctx.stroke();
    }
    const reach = Math.max(140, W * 0.12);
    for (const n of layers.flat()) {
      const d = Math.hypot(n.x - pointer.x, n.y - pointer.y);
      if (d < reach) { const c = colAt(n.l); ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.55 * (1 - d / reach)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pointer.x, pointer.y); ctx.lineTo(n.x, n.y); ctx.stroke(); }
    }
    for (const n of layers.flat()) {
      const r = 2.2 + n.a * 3.5;
      const c = colAt(n.l); if (n.a > 0.15) { ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.22 * n.a})`; ctx.beginPath(); ctx.arc(n.x, n.y, r * 3.2, 0, 7); ctx.fill(); }
      ctx.fillStyle = n.a > 0.05 ? `rgb(${Math.round(70 + (c[0] - 70) * n.a)},${Math.round(65 + (c[1] - 65) * n.a)},${Math.round(60 + (c[2] - 60) * n.a)})` : '#3a3530';
      ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function loop() { step(); draw(); requestAnimationFrame(loop); }
  function move(x, y) { pointer.x = x; pointer.y = y; pointer.active = true; if (reduce) { step(); draw(); } }
  addEventListener('pointermove', e => move(e.clientX, e.clientY), { passive: true });
  addEventListener('pointerdown', e => move(e.clientX, e.clientY), { passive: true });
  document.addEventListener('pointerleave', () => { if (!noHover) pointer.x = pointer.y = -9999; });
  addEventListener('resize', () => { build(); if (reduce) draw(); });
  addEventListener('scroll', () => { if (reduce) draw(); }, { passive: true });
  build();
  if (reduce) draw(); else loop();

  let fires = 0, lit = false;
  setInterval(() => {
    const out = layers[layers.length - 1];
    const on = out && out.some(n => n.a > 0.2);
    if (on && !lit) {
      fires++;
      const fn = document.getElementById('foot-note'); if (fn) fn.textContent = `The network behind this page has 0 trainable parameters. You've made it fire ${fires} time${fires === 1 ? '' : 's'}.`;
    }
    lit = on;
  }, 200);
})();
