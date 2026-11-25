/* ---------- Charts ---------- */
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs = {}, parent) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; };
  const ORANGE = '#FF6A13', BASE = '#8A8178', LINE = '#2B2622';

  function tipper(box) {
    const tip = box.querySelector('.tip');
    return {
      show(html, evt) {
        tip.innerHTML = html; tip.style.opacity = 1;
        const r = box.getBoundingClientRect();
        let x = evt.clientX - r.left + 14, y = evt.clientY - r.top - 10;
        if (x + tip.offsetWidth > r.width) x = evt.clientX - r.left - tip.offsetWidth - 14;
        tip.style.left = x + 'px'; tip.style.top = y + 'px';
      },
      hide() { tip.style.opacity = 0; }
    };
  }

  // Executable rate, 0-shot, from Table 2 of Raspanti et al. (ACL 2025)
  const models = ['gemma2-2b','gemma2-9b','gemma2-27b','llama3.2-1b','llama3.2-3b','llama3.1-8b','ministral-8b','mistral-22b','qwen2.5-0.5b','qwen2.5-1.5b','qwen2.5-3b','qwen2.5-7b','qwen2.5-14b'];
  const gcd = {
    gsm:   { unc: [0.00,0.43,0.64,0.00,0.00,0.00,0.02,0.00,0.00,0.01,0.00,0.01,0.59], con: [1.00,1.00,0.99,0.98,0.99,0.99,0.99,0.99,0.94,0.97,0.97,0.96,1.00] },
    folio: { unc: [0.07,0.41,0.67,0.00,0.00,0.09,0.09,0.40,0.00,0.01,0.04,0.37,0.30], con: [0.60,0.90,0.94,0.57,0.72,0.78,0.83,0.87,0.40,0.56,0.75,0.72,0.71] }
  };
  const gcdBox = document.getElementById('gcd-chart');
  const gcdTip = tipper(gcdBox);
  function drawGcd(ds) {
    gcdBox.querySelector('svg')?.remove();
    const d = gcd[ds], W = 640, rowH = 26, top = 24, left = 110, right = 24, H = top + models.length * rowH + 10;
    const x = v => left + v * (W - left - right);
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `Executable rate with no examples, ${ds === 'gsm' ? 'GSM-symbolic' : 'FOLIO'}: grammar constraints raise every model.` });
    gcdBox.insertBefore(svg, gcdBox.firstChild);
    for (const t of [0, .25, .5, .75, 1]) {
      el('line', { x1: x(t), x2: x(t), y1: top - 6, y2: H - 6, stroke: LINE, 'stroke-width': 1 }, svg);
      el('text', { x: x(t), y: top - 10, 'text-anchor': 'middle' }, svg).textContent = t === 0 ? '0' : t === 1 ? '100%' : `${t * 100}%`;
    }
    models.forEach((m, i) => {
      const y = top + i * rowH + rowH / 2, u = d.unc[i], c = d.con[i];
      const g = el('g', {}, svg);
      el('text', { x: left - 12, y: y + 4, 'text-anchor': 'end', class: 'lbl' }, g).textContent = m;
      el('line', { x1: x(u), x2: x(c), y1: y, y2: y, stroke: ORANGE, 'stroke-opacity': .45, 'stroke-width': 2 }, g);
      el('circle', { cx: x(u), cy: y, r: 5, fill: '#000', stroke: BASE, 'stroke-width': 2 }, g);
      el('circle', { cx: x(c), cy: y, r: 5.5, fill: ORANGE, stroke: '#000', 'stroke-width': 2 }, g);
      const hit = el('rect', { x: 0, y: y - rowH / 2, width: W, height: rowH, fill: 'transparent' }, g);
      const html = `<b>${m}</b><br>Unconstrained: ${Math.round(u * 100)}%<br>Constrained: ${Math.round(c * 100)}%`;
      hit.addEventListener('pointermove', e => gcdTip.show(html, e));
      hit.addEventListener('pointerleave', () => gcdTip.hide());
    });
    document.getElementById('gcd-table').innerHTML =
      `<table><thead><tr><th>Model</th><th>Unconstrained</th><th>Constrained</th></tr></thead><tbody>` +
      models.map((m, i) => `<tr><td>${m}</td><td>${d.unc[i].toFixed(2)}</td><td>${d.con[i].toFixed(2)}</td></tr>`).join('') + `</tbody></table>`;
  }
  document.querySelectorAll('[data-ds]').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('[data-ds]').forEach(o => o.setAttribute('aria-pressed', o === b));
    drawGcd(b.dataset.ds);
  }));
  drawGcd('gsm');

  // Greenwashing Alert weighted F1, Table 1 of Scala, Raspanti et al. (LREC 2026 workshop)
  const gr = [
    ['Claude Sonnet 4.5 (untuned)', .34], ['Qwen3-32B (untuned)', .45], ['Qwen3-4B (untuned)', .49],
    ['Qwen3-4B, hard distillation', .54], ['Qwen3-4B, hard distillation + GRPO', .60],
    ['Qwen3-4B, soft distillation', .67], ['Qwen3-4B, GRPO', .73]
  ];
  const grBox = document.getElementById('greench-chart');
  const grTip = tipper(grBox);
  (() => {
    const W = 640, rowH = 30, top = 20, left = 230, right = 40, H = top + gr.length * rowH + 6;
    const x = v => left + v * (W - left - right);
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Greenwashing alert weighted F1. GRPO-trained Qwen3-4B scores highest at 0.73.' });
    grBox.insertBefore(svg, grBox.firstChild);
    for (const t of [0, .25, .5, .75]) {
      el('line', { x1: x(t), x2: x(t), y1: top - 4, y2: H - 4, stroke: LINE }, svg);
      el('text', { x: x(t), y: top - 8, 'text-anchor': 'middle' }, svg).textContent = t.toFixed(2);
    }
    gr.forEach(([name, v], i) => {
      const y = top + i * rowH + 4, best = i === gr.length - 1;
      el('text', { x: left - 12, y: y + 15, 'text-anchor': 'end', class: 'lbl' }, svg).textContent = name;
      el('rect', { x: x(0), y, width: x(v) - x(0), height: rowH - 10, rx: 4, fill: best ? ORANGE : BASE, 'fill-opacity': best ? 1 : .55 }, svg);
      el('text', { x: x(v) + 8, y: y + 15, class: 'lbl' }, svg).textContent = v.toFixed(2);
      const hit = el('rect', { x: 0, y: y - 4, width: W, height: rowH, fill: 'transparent' }, svg);
      hit.addEventListener('pointermove', e => grTip.show(`<b>${name}</b><br>Weighted F1: ${v.toFixed(2)}`, e));
      hit.addEventListener('pointerleave', () => grTip.hide());
    });
    document.getElementById('greench-table').innerHTML =
      `<table><thead><tr><th>Model</th><th>Weighted F1</th></tr></thead><tbody>` +
      gr.map(([n, v]) => `<tr><td>${n}</td><td>${v.toFixed(2)}</td></tr>`).join('') + `</tbody></table>`;
  })();
})();
