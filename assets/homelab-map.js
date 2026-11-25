/* Interactive homelab map: a simplified model of the real setup. */
(() => {
  const root = document.getElementById('lab');
  if (!root) return;
  const svg = root.querySelector('svg');
  const statusEl = root.querySelector('.lab-status');
  const infoT = root.querySelector('.lab-info h3'), infoP = root.querySelector('.lab-info p');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';
  const el = (t, a = {}, p = svg) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); p && p.appendChild(n); return n; };

  const zones = [
    ['Internet', 10, 10, 980, 100],
    ['Outside', 10, 130, 150, 340],
    ['Home network', 175, 130, 220, 340],
    ['Proxmox host: old desktop, i5-4460, 24 GB RAM', 410, 130, 580, 350],
    ['Disks', 410, 495, 580, 135],
    ['Proxmox host: more containers', 10, 495, 385, 135]
  ];

  // id: [label, sub, x, y, w, h, info, opts]
  const N = {
    tailscale: ['Tailscale', 'private network', 30, 42, 170, 48, 'A private network between my devices, so I can reach the server from anywhere without opening any ports on the router.'],
    playit: ['playit.gg', 'game tunnel', 220, 42, 170, 48, 'A tunnel that gives my friends a public address for the Minecraft server, again without opening router ports.'],
    boards: ['Job boards', 'alerts and feeds', 410, 42, 170, 48, 'LinkedIn and Indeed alerts by email, plus the Himalayas, Remotive, ai-jobs.net and EURAXESS feeds.'],
    claude: ['Claude', 'API, no tools', 600, 42, 170, 48, 'Scores job postings against my CV and writes the Sunday report. It gets no tools: it only reads what it is sent and answers.'],
    telegram: ['Telegram', 'alerts, reports, bot', 790, 42, 170, 48, 'Where alerts and reports land, and where I talk to the server through its bot.'],
    you: ['You', 'phone, laptop', 25, 190, 120, 52, 'Me, on my phone or laptop. At home I am on the local network; away from home, Tailscale brings me in.'],
    friends: ['Friends', 'Minecraft players', 25, 350, 120, 52, 'Up to six friends playing on the SkyFactory 4 server.'],
    router: ['Router', 'DHCP, Pi-hole as DNS', 195, 190, 180, 52, 'Hands out addresses and points every device in the house at Pi-hole for DNS.'],
    repeater: ['Wi-Fi repeater', 'Wi-Fi in, cable out', 195, 350, 180, 52, 'The PC has no cable to the router, and Proxmox wants a wired connection. A Wi-Fi 6 repeater joins the network and hands the PC a gigabit cable.'],
    ct100: ['CT 100: apps', 'Docker inside an unprivileged container', 425, 160, 550, 305, 'The main container: unprivileged Debian with Docker, 4 cores and 12 GB of RAM. Every app has its own folder and compose file.', { group: true }],
    ct101: ['CT 101', 'sandbox', 22, 535, 116, 60, 'A sandbox container for tools I don\'t fully trust, scanned every night with ClamAV. If one misbehaves, it can\'t reach the rest.', { ct: true }],
    ct103: ['CT 103', 'job tracker', 145, 535, 116, 60, 'A web app I built with Claude Code (FastAPI and SQLite). Every morning it collects AI and ML postings, filters them with hard rules in Python, has Claude score the rest against my CV, and shows them on a Kanban board.', { ct: true }],
    ct104: ['CT 104', 'Minecraft', 268, 535, 116, 60, 'A modded Minecraft server (SkyFactory 4) for friends, reached through a playit.gg tunnel. The world is backed up every day.', { ct: true }],
    ssd: ['512 GB SSD', 'Proxmox, containers', 425, 535, 130, 60, 'Holds Proxmox itself and every container\'s system disk.'],
    data: ['4 TB WD Red', 'files, photos, media', 570, 535, 130, 60, 'A NAS drive with everything that matters: files, photos, films, music and manga.'],
    backup: ['500 GB drive', 'backups', 715, 535, 130, 60, 'An old laptop drive. Photos are copied to it every night, the main container is snapshotted every Sunday (last four kept), and the Minecraft world daily.'],
    old: ['2008 drive', 'retired', 860, 535, 115, 60, 'A hard drive from 2008. It froze the PC at startup until I tracked it down. Retired for good.', { dashed: true }]
  };
  const chips = [
    ['pihole', 'Pi-hole', 'DNS for the whole house. Ad and tracker domains get 0.0.0.0.'],
    ['homepage', 'Homepage', 'The start page, with a tile and a live widget for every service.'],
    ['jellyfin', 'Jellyfin', 'Films and shows. The Intel iGPU is passed through for transcoding.'],
    ['immich', 'Immich', 'Backs up the photos from my phone, with machine-learning search running locally.'],
    ['nextcloud', 'Nextcloud', 'My files, like a self-hosted Dropbox.'],
    ['navidrome', 'Navidrome', 'My music library, streamed to any Subsonic app, offline albums included.'],
    ['kavita', 'Kavita', 'A manga reader.'],
    ['wrapped', 'Wrapped', 'My own Spotify-Wrapped-style recap of what I listened to, every month and at the end of the year.'],
    ['discover', 'Discover', 'Album suggestions based on what I actually play, refreshed every Monday.'],
    ['kuma', 'Uptime Kuma', 'Checks every service and messages me on Telegram when something goes down.'],
    ['scrutiny', 'Scrutiny', 'Reads the disks\' health data every hour.'],
    ['proxy', 'Socket proxy', 'A read-only Docker API. No app gets the Docker socket itself, so nothing can start or change containers.'],
    ['bot', 'Telegram bot', 'My bot: I can run the server from my phone.'],
    ['report', 'Weekly report', 'Every Sunday Claude reads the week\'s numbers (disks, memory, backups, updates) and sends me a summary.'],
    ['wud', 'Update watcher', 'Checks for new versions of the Docker images every Saturday.']
  ];
  chips.forEach(([id, label, info], i) => {
    const col = i % 4, row = Math.floor(i / 4);
    N[id] = [label, '', 438 + col * 133, 202 + row * 62, 125, 46, info, { chip: true, parent: 'ct100' }];
  });

  // ---------- draw ----------
  const defs = el('defs');
  zones.forEach(([label, x, y, w, h]) => {
    el('rect', { x, y, width: w, height: h, rx: 8, class: 'zone' });
    el('text', { x: x + 12, y: y + 20, class: 'zone-label' }).textContent = label;
  });
  // static links
  const links = [['router', 'repeater'], ['repeater', 'ct100'], ['you', 'router']];
  const center = id => { const n = N[id]; return [n[2] + n[4] / 2, n[3] + n[5] / 2]; };
  links.forEach(([a, b]) => { const [x1, y1] = center(a), [x2, y2] = center(b); el('line', { x1, y1, x2, y2, class: 'link' }); });
  const trailLayer = el('g');
  const nodeLayer = el('g');
  const G = {};
  for (const id in N) {
    const [label, sub, x, y, w, h, info, o = {}] = N[id];
    const g = el('g', { class: 'node' + (o.group ? ' group' : '') + (o.chip ? ' chip' : '') + (o.ct ? ' ct' : '') + (o.dashed ? ' retired' : '') }, nodeLayer);
    el('title', {}, g).textContent = `${label}: ${info}`;
    el('rect', { x, y, width: w, height: h, rx: o.chip ? 5 : 7 }, g);
    if (o.group) {
      el('text', { x: x + 12, y: y + 22, class: 'n-label' }, g).textContent = label;
      el('text', { x: x + w - 12, y: y + 22, 'text-anchor': 'end', class: 'n-sub' }, g).textContent = sub;
      el('circle', { cx: x + w - 12, cy: y + h - 12, r: 4, class: 'power' }, g);
    } else {
      el('text', { x: x + w / 2, y: sub ? y + h / 2 - 3 : y + h / 2 + 5, 'text-anchor': 'middle', class: 'n-label' }, g).textContent = label;
      if (sub) el('text', { x: x + w / 2, y: y + h / 2 + 15, 'text-anchor': 'middle', class: 'n-sub' }, g).textContent = sub;
      if (o.ct) el('circle', { cx: x + w - 10, cy: y + 10, r: 4, class: 'power' }, g);
    }
    G[id] = g;
    g.addEventListener('pointerenter', e => { e.stopPropagation(); showInfo(id, null, false); });
  }

  // ---------- state ----------
  const down = new Set();
  const isDown = id => down.has(id) || Boolean(N[id][7] && N[id][7].parent && down.has(N[id][7].parent));
  function paint() {
    for (const id in N) G[id].classList.toggle('off', isDown(id));
  }
  function showInfo(id, extra, lit = true) {
    const n = N[id];
    infoT.textContent = n[0] + (n[1] && !n[7]?.chip ? `, ${n[1]}` : '');
    infoP.textContent = (extra ? extra + ' ' : '') + n[6];
    if (lit) flash(id);
  }
  function status(t) { statusEl.textContent = t; }
  function flash(id, cls = 'lit', ms = 900) {
    G[id].classList.add(cls);
    setTimeout(() => G[id].classList.remove(cls), reduce ? 400 : ms);
  }


  // ---------- packets ----------
  const SLOW = 1.8; // pace of the animation
  const wait = ms => new Promise(r => setTimeout(r, reduce ? 0 : ms * SLOW));
  function hop(a, b, dur, cls = '') {
    dur *= SLOW;
    const [x1, y1] = center(a), [x2, y2] = center(b);
    const trail = el('line', { x1, y1, x2, y2, class: 'trail ' + cls }, trailLayer);
    setTimeout(() => trail.remove(), reduce ? 600 : 1400 * SLOW);
    if (reduce) return Promise.resolve();
    const dot = el('circle', { r: 5.5, class: 'packet ' + cls, cx: x1, cy: y1 }, trailLayer);
    return new Promise(res => {
      const t0 = performance.now();
      const f = now => {
        const t = Math.min(1, (now - t0) / dur), e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        dot.setAttribute('cx', x1 + (x2 - x1) * e); dot.setAttribute('cy', y1 + (y2 - y1) * e);
        if (t < 1) requestAnimationFrame(f); else { dot.remove(); res(); }
      };
      requestAnimationFrame(f);
    });
  }
  // send along a path; stops at the first node that is down
  async function send(path, { dur = 300, cls = '' } = {}) {
    for (let i = 0; i < path.length - 1; i++) {
      if (isDown(path[i + 1])) {
        await hop(path[i], path[i + 1], dur, 'fail');
        flash(path[i + 1], 'failed', 1200);
        return path[i + 1];
      }
      await hop(path[i], path[i + 1], dur, cls);
      flash(path[i + 1]);
    }
    return null;
  }
  const IN = ['router', 'repeater'];          // from the router into the host
  const OUT = ['repeater', 'router'];         // from the host out to the internet

  async function healthCheck(target) {
    if (target === 'ct100' || down.has('ct100')) {
      status('Uptime Kuma lives in CT 100 too, so nobody is watching the watcher. No alert goes out.');
      await wait(2500);
      return restore(target);
    }
    status(`Uptime Kuma notices ${N[target][0]} stopped answering…`);
    await send(['kuma', target], { dur: 350 });
    status(`Uptime Kuma sends me an alert on Telegram: ${N[target][0]} is down.`);
    await send(['kuma', 'bot', ...OUT, 'telegram', 'you'], { dur: 230, cls: 'alert' });
    status(`Alert received. From my phone, I tell the bot to restart ${N[target][0]}.`);
    await wait(1200);
    await send(['you', 'telegram', 'router', 'repeater', 'bot', target], { dur: 300 });
    await restore(target);
  }
  async function restore(target) {
    down.delete(target); paint(); flash(target, 'lit', 1500);
    status(`${N[target][0]} is back up.`);
  }

  function failMsg(id) { return `${N[id][0]} is ${N[id][7] && N[id][7].parent ? 'down because ' + N[N[id][7].parent][0] + ' is off' : 'off'}.`; }

  const scenarios = {
    async movie() {
      status('Away from home, I press play in Jellyfin. The request rides Tailscale home.');
      let f = await send(['you', 'tailscale', ...IN, 'jellyfin', 'data']);
      if (f) return status(failMsg(f));
      status('The film streams back. The iGPU transcodes it if my phone needs a different format.');
      for (let i = 0; i < 3; i++) { send(['data', 'jellyfin', ...OUT, 'tailscale', 'you'], { dur: 220 }); await wait(260); }
      await wait(1400);
      status('Streaming.');
    },
    async web() {
      status('A laptop at home opens a news site. Its DNS question goes to Pi-hole.');
      let f = await send(['you', 'router', 'repeater', 'pihole']);
      if (f) return status(failMsg(f) + ' (Without Pi-hole, the house loses DNS. Phones fall back to the router.)');
      flash('pihole', 'blocked', 1200);
      status('The ad and tracker domains on the page get 0.0.0.0. The site itself is answered normally.');
      await send(['pihole', 'repeater', 'router', 'you'], { dur: 250 });
      status('Page loaded, without the ads.');
    },
    async photos() {
      status('My phone backs up today\'s photos to Immich.');
      let f = await send(['you', 'tailscale', ...IN, 'immich', 'data']);
      if (f) return status(failMsg(f));
      status('At 03:30 the photos are copied to the backup drive.');
      await wait(300);
      await send(['data', 'backup'], { dur: 500 });
      status('Two copies at home. An off-site copy is next on the list.');
    },
    async jobs() {
      status('07:00. The job tracker collects new postings.');
      let f = await send(['boards', 'router', 'repeater', 'ct103'], { dur: 260 });
      if (f) return status(failMsg(f));
      status('Hard rules in Python drop the bad fits. Claude scores the rest against my CV.');
      await send(['ct103', ...OUT, 'claude'], { dur: 240 });
      await send(['claude', ...IN, 'ct103'], { dur: 240 });
      status('New cards are on the Kanban board, each with the reasons behind its score.');
    },
    async report() {
      status('Sunday morning. The weekly report gathers the numbers: disk health, memory, backups, updates.');
      let f = await send(['scrutiny', 'report'], { dur: 400 });
      if (f) return status(failMsg(f));
      await send(['backup', 'report'], { dur: 400 });
      status('Claude turns them into a short summary…');
      await send(['report', ...OUT, 'claude'], { dur: 240 });
      await send(['claude', 'telegram', 'you'], { dur: 300 });
      status('…which lands on my phone over Telegram.');
    },
    async minecraft() {
      status('A friend joins the Minecraft server through the playit.gg tunnel. No ports are open on the router.');
      let f = await send(['friends', 'playit', ...IN, 'ct104'], { dur: 280 });
      if (f) return status(failMsg(f));
      status('Connected. The world is backed up every day to the backup drive.');
      await send(['ct104', 'backup'], { dur: 450 });
    },
    async random() {
      const cands = ['ct101', 'ct103', 'ct104'].filter(id => !down.has(id));
      if (!cands.length) return status('Everything is already off.');
      const id = cands[Math.floor(Math.random() * cands.length)];
      down.add(id); paint();
      showInfo(id, 'Switched off.');
      await healthCheck(id);
    },
    async init() {
      down.clear(); paint();
      infoT.textContent = 'Hover over anything on the map';
      infoP.textContent = 'Each part explains what it does.';
      status('All systems up. Pick an action, or hover over anything on the map.');
    }
  };

  let busy = false;
  root.querySelectorAll('[data-run]').forEach(b => b.addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    root.querySelectorAll('[data-run]').forEach(x => x.disabled = true);
    try { await scenarios[b.dataset.run](); } finally {
      busy = false;
      root.querySelectorAll('[data-run]').forEach(x => x.disabled = false);
    }
  }));
  scenarios.init();
})();
