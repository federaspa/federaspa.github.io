/* Grammar-constrained decoding demo. Scripted: no model runs in the browser.
   The behaviour mirrors the paper: small models without constraints often
   produce text the solver can't parse; with a grammar, invalid tokens are masked. */
(() => {
  const root = document.getElementById('gcd-demo');
  if (!root) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Each step lists candidate next tokens: [text, probability, allowed by grammar]
  const PUZZLES = {
    logic: {
      problem: 'All squirrels are animals. Rocky is a squirrel.',
      question: 'Is Rocky an animal?',
      prefix: [],
      diverge: [['Sure! Here is', .46, false], ['all x (', .31, true], ['**Premises**', .12, false]],
      con: [
        [['Squirrel(x)', .71, true], ['squirrels', .15, false], ['Rocky', .08, false]],
        [[' -> ', .64, true], [' implies ', .22, false], [' ∧ ', .09, false]],
        [['Animal(x)', .83, true], ['animal', .11, false], ['Animals(x', .03, false]],
        [[').\n', .77, true], [') and', .12, false], [']', .05, false]],
        [['Squirrel(rocky)', .69, true], ['Rocky is a', .20, false], ['Squirrel[rocky]', .06, false]],
        [['.\n', .90, true], ['!', .05, false]],
        [['Conclusion: ', .74, true], ['So,', .16, false]],
        [['Animal(rocky)', .80, true], ['Is Rocky an', .12, false]],
        [['.', .93, true], ['?', .05, false]]
      ],
      unc: [
        [[' the translation:\n', .68, false], [' the logic:\n', .22, false]],
        [['∀x ', .52, false], ['all x (', .30, true]],
        [['(Squirrel(x) → Animal(x))', .61, false], ['Squirrel(x)', .25, true]],
        [['\nSquirrel(Rocky)', .58, false], ['\n', .30, true]],
        [['\nTherefore Rocky is an animal.', .66, false], ['\n', .20, true]]
      ],
      ok: { label: 'Solver says: True', detail: 'Prover9 proves Animal(rocky) from the premises.' },
      err: { label: 'Solver error', detail: "Syntax error on line 1: unexpected 'Sure'. No answer." }
    },
    math: {
      problem: 'Mia has 3 boxes with 12 pencils in each. She gives away 7 pencils.',
      question: 'How many pencils does she have left?',
      prefix: [
        [['boxes = 3\n', .81, true], ['Mia has', .11, false]],
        [['per_box = 12\n', .77, true], ['12 pencils', .14, false]],
        [['given = 7\n', .85, true], ['gives', .08, false]],
        [['answer = ', .79, true], ['The answer is', .15, false]]
      ],
      diverge: [['boxes × per_box', .41, false], ['boxes * per_box', .38, true], ['3 boxes', .10, false]],
      con: [[[' - given', .88, true], [' minus given', .07, false]]],
      unc: [[[' - given', .88, true], [' minus given', .07, false]]],
      ok: { label: 'Result: 29', detail: 'The program runs: 3 × 12 − 7 = 29.' },
      err: { label: 'Solver error', detail: "SyntaxError: invalid character '×'. No answer." }
    }
  };

  const $ = s => root.querySelector(s);
  const out = $('.gd-program'), cands = $('.gd-cands'), result = $('.gd-result'), masked = $('.gd-masked');
  const runBtn = $('.gd-run'), toggle = $('.gd-toggle');
  let puzzle = 'logic', grammar = true, running = false, token = 0;
  const wait = ms => new Promise(r => setTimeout(r, reduce ? 0 : ms));

  function reset() {
    token++;
    const p = PUZZLES[puzzle];
    $('.gd-problem').textContent = p.problem;
    $('.gd-question').textContent = p.question;
    out.textContent = '';
    out.classList.remove('done');
    cands.innerHTML = '<li class="gd-idle">Press Generate to start decoding.</li>';
    result.className = 'gd-result';
    result.innerHTML = '<span class="gd-wait">Waiting for a program</span>';
    masked.textContent = '0';
  }

  function renderStep(step, chosen) {
    cands.innerHTML = '';
    step.forEach(([tok, p, ok], i) => {
      const li = document.createElement('li');
      const isMasked = grammar && !ok;
      li.className = 'gd-cand' + (isMasked ? ' masked' : '') + (i === chosen ? ' chosen' : '');
      li.innerHTML = `<code></code><span class="gd-bar"><i style="width:${Math.round(p * 100)}%"></i></span><span class="gd-p">${Math.round(p * 100)}%</span><span class="gd-tag">${isMasked ? 'masked' : i === chosen ? 'picked' : ''}</span>`;
      li.querySelector('code').textContent = JSON.stringify(tok).slice(1, -1).replace(/\\n/g, '↵');
      cands.appendChild(li);
    });
  }

  function pick(step) {
    // greedy decoding: highest-probability token, among allowed ones if the grammar is on
    let best = -1;
    step.forEach(([, p, ok], i) => { if ((!grammar || ok) && (best < 0 || p > step[best][1])) best = i; });
    return best;
  }

  async function run() {
    if (running) return;
    running = true; runBtn.disabled = true;
    reset();
    const my = token, p = PUZZLES[puzzle];
    let nMasked = 0, valid = true;
    const steps = [...p.prefix];
    const firstPick = pick(p.diverge);
    steps.push(p.diverge);
    const tail = p.diverge[firstPick][2] ? p.con : p.unc;
    steps.push(...tail);
    for (const step of steps) {
      if (my !== token) break;
      renderStep(step, -1);
      await wait(520);
      if (my !== token) break;
      const c = pick(step);
      if (grammar) nMasked += step.filter(s => !s[2]).length;
      masked.textContent = nMasked;
      if (!step[c][2]) valid = false;
      renderStep(step, c);
      out.textContent += step[c][0];
      await wait(380);
    }
    if (my === token) {
      out.classList.add('done');
      cands.innerHTML = '<li class="gd-idle">Done. Program sent to the solver.</li>';
      result.className = 'gd-result running';
      result.innerHTML = '<span class="gd-wait">Solver running</span>';
      await wait(700);
      const r = valid ? p.ok : p.err;
      result.className = 'gd-result ' + (valid ? 'ok' : 'err');
      result.innerHTML = `<b>${valid ? '✓' : '✕'} ${r.label}</b><span>${r.detail}</span>`;
    }
    running = false; runBtn.disabled = false;
  }

  root.querySelectorAll('[data-puzzle]').forEach(b => b.addEventListener('click', () => {
    puzzle = b.dataset.puzzle;
    root.querySelectorAll('[data-puzzle]').forEach(o => o.setAttribute('aria-pressed', o === b));
    running = false; runBtn.disabled = false; reset();
  }));
  toggle.addEventListener('click', () => {
    grammar = !grammar;
    toggle.setAttribute('aria-checked', grammar);
    $('.gd-toggle-label').textContent = grammar ? 'Grammar on' : 'Grammar off';
    running = false; runBtn.disabled = false; reset();
  });
  runBtn.addEventListener('click', run);
  reset();
})();
