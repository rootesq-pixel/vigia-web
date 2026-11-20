/* Vigía · interacción y animaciones */
(() => {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (window.lucide) lucide.createIcons({ attrs: { 'stroke-width': 1.8 } });
  $('#year').textContent = new Date().getFullYear();

  /* ---------- descargas desde config ---------- */
  const cfg = window.VIGIA || {};
  $$('[data-version]').forEach(el => el.textContent = 'v' + (cfg.version || '1.0.0'));
  $$('[data-dl]').forEach(box => {
    const d = cfg.downloads && cfg.downloads[box.dataset.dl]; if (!d) return;
    $('.file', box).textContent = d.file;
    const a = $('.btn', box);
    if (cfg.available && d.url) {
      a.href = d.url; a.classList.remove('is-disabled'); a.removeAttribute('aria-disabled'); a.removeAttribute('tabindex');
      a.setAttribute('download', d.file);
      $('span', a).textContent = 'Descargar ' + d.label.toLowerCase() + (d.size ? ' · ' + d.size : '');
    }
  });
  if (cfg.available) {
    $('#dl-status').textContent = 'Versión ' + cfg.version + ' disponible. Elige instalador o portable.';
    $$('.hero-ctas .tag').forEach(t => t.remove());
  }

  /* ---------- nav ---------- */
  const nav = $('.nav'), burger = $('.burger'), menu = $('#menu');
  burger.addEventListener('click', () => {
    const o = menu.classList.toggle('open'); burger.setAttribute('aria-expanded', o);
  });
  $$('#menu a').forEach(a => a.addEventListener('click', () => { menu.classList.remove('open'); burger.setAttribute('aria-expanded', false); }));

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (!RM && window.Lenis) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    if (hasGSAP) { lenis.on('scroll', ScrollTrigger.update); gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0); }
    else { const r = t => { lenis.raf(t); requestAnimationFrame(r); }; requestAnimationFrame(r); }
  }
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href'); const el = id.length > 1 && $(id); if (!el) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(el, { offset: id === '#inicio' ? 0 : -20, duration: 1.4 });
    else el.scrollIntoView({ behavior: RM ? 'auto' : 'smooth' });
  }));

  const bar = $('.progress span');
  const onScroll = () => {
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    nav.classList.toggle('scrolled', y > 40);
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  const secs = ['panel', 'funciones', 'red', 'privacidad', 'como', 'faq'].map(id => document.getElementById(id));
  const navIO = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) $$('#menu a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  secs.forEach(s => s && navIO.observe(s));

  /* ---------- scan reveal de titulares ---------- */
  // (los titulares se revelan con ScrollTrigger más abajo; IntersectionObserver no ve elementos recortados por clip-path)
  if (RM || !hasGSAP) $$('[data-scan]').forEach(el => el.classList.add('in'));

  /* ---------- título hero por letras ---------- */
  const split = $('.split');
  split.innerHTML = [...split.textContent].map(c => `<span class="ch">${c}</span>`).join('');

  /* ---------- tarjetas: foco + inclinación ---------- */
  if (FINE) $$('.card').forEach(c => {
    c.addEventListener('pointermove', e => {
      const r = c.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      c.style.setProperty('--mx', x + 'px'); c.style.setProperty('--my', y + 'px');
      if (!RM) c.style.transform = `perspective(900px) rotateX(${(y / r.height - .5) * -6}deg) rotateY(${(x / r.width - .5) * 6}deg) translateY(-4px)`;
    });
    c.addEventListener('pointerleave', () => { c.style.transform = ''; });
  });

  /* ---------- retícula que se fija en objetivos ---------- */
  if (FINE && !RM) {
    const ret = $('.reticle'); let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y, w = 36, h = 36, cw = 36, ch = 36, target = null;
    addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; ret.classList.add('on'); }, { passive: true });
    document.addEventListener('pointerleave', () => ret.classList.remove('on'));
    const sel = 'a, button, summary, .card, .dl, .step';
    document.addEventListener('pointerover', e => { target = e.target.closest(sel); ret.classList.toggle('lock', !!target); });
    (function tick() {
      let tx = x - 18, ty = y - 18, tw = 36, th = 36;
      if (target) { const r = target.getBoundingClientRect(); const p = 6; tx = r.left - p; ty = r.top - p; tw = r.width + p * 2; th = r.height + p * 2; }
      cx += (tx - cx) * .22; cy += (ty - cy) * .22; cw += (tw - cw) * .22; ch += (th - ch) * .22;
      ret.style.transform = `translate(${cx}px,${cy}px)`; ret.style.width = cw + 'px'; ret.style.height = ch + 'px';
      requestAnimationFrame(tick);
    })();
  }

  /* ---------- panel: puntuación y semáforos ---------- */
  const CHECKS = [
    ['Microsoft Defender', 'ok', 'ok'], ['Firewall de Windows', 'ok', 'ok'], ['Windows Update', 'warn', 'ok'],
    ['BitLocker (C:)', 'crit', 'ok'], ['Control de cuentas (UAC)', 'warn', 'ok'], ['SMBv1', 'crit', 'ok'],
    ['Escritorio remoto (RDP)', 'crit', 'ok'], ['Secure Boot y TPM', 'ok', 'ok'], ['Cuentas de administrador', 'warn', 'ok'],
    ['Política de contraseñas', 'warn', 'warn']
  ];
  const LBL = { ok: 'OK', warn: 'AVISO', crit: 'CRÍTICO', pending: '···' };
  const FIX_ORDER = [5, 6, 3, 4, 2, 8];
  const list = $('#checks');
  list.innerHTML = CHECKS.map(c => `<li class="pending"><b></b><span>${c[0]}</span><em>···</em></li>`).join('');
  const items = $$('li', list);
  const gv = $('.g-val'), sc = $('#score'), sl = $('#score-label'), phases = $$('.phase li');
  const C = 502.65, BEFORE = 46, AFTER = 92;
  let lastState = '';
  function setPanel(p) {
    p = Math.max(0, Math.min(1, p));
    const states = CHECKS.map(() => 'pending'); let score, phase;
    if (p < .4) {
      const q = p / .4, n = Math.floor(q * (CHECKS.length + .999));
      for (let i = 0; i < n && i < CHECKS.length; i++) states[i] = CHECKS[i][1];
      score = Math.round(BEFORE * (1 - Math.pow(1 - q, 2))); phase = 0;
    } else {
      CHECKS.forEach((c, i) => states[i] = c[1]);
      const q = Math.min(1, (p - .4) / .5), k = Math.floor(q * (FIX_ORDER.length + .999));
      for (let j = 0; j < k && j < FIX_ORDER.length; j++) states[FIX_ORDER[j]] = CHECKS[FIX_ORDER[j]][2];
      score = Math.round(BEFORE + (AFTER - BEFORE) * q); phase = q >= 1 ? 2 : 1;
    }
    sc.textContent = score;
    gv.style.strokeDashoffset = C * (1 - score / 100);
    const col = score < 50 ? 'var(--crit)' : score < 80 ? 'var(--warn)' : 'var(--ok)';
    gv.style.stroke = col; sc.style.color = col;
    sl.textContent = phase === 0 && p < .38 ? 'AUDITANDO' : score < 50 ? 'EN RIESGO' : score < 80 ? 'MEJORABLE' : 'PROTEGIDO';
    phases.forEach((li, i) => { li.classList.toggle('on', i === phase); li.classList.toggle('done', i < phase); });
    const key = states.join();
    if (key !== lastState) {
      const prev = lastState.split(',');
      items.forEach((li, i) => {
        const s = states[i];
        if (prev[i] && prev[i] !== s && s === 'ok' && prev[i] !== 'pending') { li.classList.add('flash'); setTimeout(() => li.classList.remove('flash'), 700); }
        li.className = li.className.replace(/\b(ok|warn|crit|pending)\b/g, '').trim() + ' ' + s;
        $('em', li).textContent = LBL[s];
      });
      lastState = key;
    }
  }
  setPanel(RM ? 1 : 0);

  /* ---------- terminal de auditoría ---------- */
  const TERM = [
    ['c', 'vigia audit --completa'],
    ['o', '<span class="d">[00:00.12]</span> Leyendo estado con PowerShell / CIM…'],
    ['o', '<span class="o">[ OK ]</span>  Microsoft Defender · protección en tiempo real activa'],
    ['o', '<span class="o">[ OK ]</span>  Firewall · perfiles dominio, privado y público activos'],
    ['o', '<span class="w">[AVISO]</span> Windows Update · actualizaciones pendientes'],
    ['o', '<span class="c">[CRÍT]</span> BitLocker · unidad C: sin cifrar'],
    ['o', '<span class="w">[AVISO]</span> UAC · nivel de notificación reducido'],
    ['o', '<span class="c">[CRÍT]</span> SMBv1 · protocolo heredado habilitado'],
    ['o', '<span class="c">[CRÍT]</span> RDP · escritorio remoto abierto sin NLA'],
    ['o', '<span class="o">[ OK ]</span>  Secure Boot activo · TPM 2.0 presente'],
    ['o', '<span class="w">[AVISO]</span> 3 cuentas con privilegios de administrador'],
    ['o', '<span class="w">[AVISO]</span> Política de contraseñas · longitud mínima baja'],
    ['o', '<span class="d">────────────────────────────────────────────</span>'],
    ['o', '<span class="h">Puntuación: 46/100</span> · 3 críticos · 4 avisos'],
    ['o', '<span class="p">›</span> Pulsa <span class="h">Corregir</span> en cada hallazgo. Se pedirá confirmación.'],
  ];
  const term = $('#term');
  function renderTermAll() { term.innerHTML = TERM.map(l => l[0] === 'c' ? `<span class="p">PS C:\\&gt;</span> <span class="h">${l[1]}</span>` : l[1]).join('\n') + '\n<span class="cur"></span>'; }
  if (RM) renderTermAll();
  else {
    let started = false;
    const tio = new IntersectionObserver(es => { if (es[0].isIntersecting && !started) { started = true; typeTerm(); tio.disconnect(); } }, { threshold: .4 });
    tio.observe(term);
    term.innerHTML = '<span class="cur"></span>';
  }
  async function typeTerm() {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    let html = '';
    for (const [k, txt] of TERM) {
      if (k === 'c') {
        const pre = '<span class="p">PS C:\\&gt;</span> <span class="h">';
        for (let i = 1; i <= txt.length; i++) { term.innerHTML = html + pre + txt.slice(0, i) + '</span><span class="cur"></span>'; await wait(38 + Math.random() * 40); }
        html += pre + txt + '</span>\n'; await wait(380);
      } else { html += txt + '\n'; term.innerHTML = html + '<span class="cur"></span>'; await wait(180 + Math.random() * 220); }
    }
  }

  /* ---------- monitor de red ---------- */
  const net = $('#net'), nctx = net.getContext('2d');
  const PROCS = [['chrome.exe', 0], ['steam.exe', 0], ['Discord.exe', 0], ['svchost.exe', 0], ['OneDrive.exe', 0], ['desconocido.exe', 1]];
  const HOSTS = ['203.0.113.24:443', '198.51.100.7:443', '192.0.2.81:443', '203.0.113.90:27036', '198.51.100.52:443', '192.0.2.200:8443'];
  let NW, NH, nodes = [], packets = [];
  function netResize() {
    const d = Math.min(devicePixelRatio, 2); NW = net.clientWidth; NH = net.clientHeight;
    net.width = NW * d; net.height = NH * d; nctx.setTransform(d, 0, 0, d, 0, 0);
    nodes = [];
    const cx = NW * .5, cy = NH * .5;
    nodes.push({ x: cx, y: cy, l: 'ESTE PC', t: 'pc' });
    PROCS.forEach((p, i) => { const a = -Math.PI / 2 + i * Math.PI * 2 / PROCS.length + .3; nodes.push({ x: cx + Math.cos(a) * NW * .2, y: cy + Math.sin(a) * NH * .3, l: p[0], t: p[1] ? 'warn' : 'proc', a }); });
    HOSTS.forEach((h, i) => { const a = -Math.PI / 2 + i * Math.PI * 2 / HOSTS.length + .3; nodes.push({ x: cx + Math.cos(a) * NW * .42, y: cy + Math.sin(a) * NH * .42, l: h, t: 'host' }); });
  }
  netResize(); addEventListener('resize', netResize);
  function netDraw(t) {
    nctx.clearRect(0, 0, NW, NH);
    const pc = nodes[0];
    // rejilla
    nctx.strokeStyle = 'rgba(148,163,184,.05)'; nctx.lineWidth = 1;
    for (let x = 0; x < NW; x += 28) { nctx.beginPath(); nctx.moveTo(x, 0); nctx.lineTo(x, NH); nctx.stroke(); }
    for (let y = 0; y < NH; y += 28) { nctx.beginPath(); nctx.moveTo(0, y); nctx.lineTo(NW, y); nctx.stroke(); }
    for (let i = 1; i <= PROCS.length; i++) {
      const p = nodes[i], h = nodes[i + PROCS.length], warn = p.t === 'warn';
      const pulse = .5 + .5 * Math.sin(t * 2 + i);
      nctx.strokeStyle = `rgba(34,211,238,${.12 + pulse * .12})`; nctx.lineWidth = 1;
      nctx.beginPath(); nctx.moveTo(pc.x, pc.y); nctx.lineTo(p.x, p.y); nctx.stroke();
      nctx.strokeStyle = warn ? `rgba(245,158,11,${.25 + pulse * .4})` : `rgba(34,211,238,${.1 + pulse * .25})`;
      nctx.setLineDash(warn ? [4, 4] : []); nctx.beginPath(); nctx.moveTo(p.x, p.y);
      nctx.quadraticCurveTo((p.x + h.x) / 2 + (h.y - p.y) * .15, (p.y + h.y) / 2 - (h.x - p.x) * .15, h.x, h.y); nctx.stroke(); nctx.setLineDash([]);
    }
    if (!RM && Math.random() < .12) { const i = 1 + Math.floor(Math.random() * PROCS.length); packets.push({ i, s: 0, dir: Math.random() < .5 ? 1 : -1, v: .008 + Math.random() * .012 }); }
    packets = packets.filter(k => (k.s += k.v) < 1);
    for (const k of packets) {
      const p = nodes[k.i], h = nodes[k.i + PROCS.length], s = k.dir > 0 ? k.s : 1 - k.s;
      const qx = (p.x + h.x) / 2 + (h.y - p.y) * .15, qy = (p.y + h.y) / 2 - (h.x - p.x) * .15;
      const x = (1 - s) ** 2 * p.x + 2 * (1 - s) * s * qx + s * s * h.x, y = (1 - s) ** 2 * p.y + 2 * (1 - s) * s * qy + s * s * h.y;
      const warn = p.t === 'warn';
      nctx.fillStyle = warn ? '#F59E0B' : '#67E8F9'; nctx.shadowColor = nctx.fillStyle; nctx.shadowBlur = 10;
      nctx.beginPath(); nctx.arc(x, y, 2.4, 0, Math.PI * 2); nctx.fill(); nctx.shadowBlur = 0;
    }
    const small = NW < 480;
    nodes.forEach((n, i) => {
      const r = n.t === 'pc' ? 16 : n.t === 'host' ? 4 : 7;
      const col = n.t === 'warn' ? '245,158,11' : '34,211,238';
      if (n.t === 'pc') { nctx.strokeStyle = `rgba(34,211,238,${.3 + .2 * Math.sin(t * 3)})`; nctx.beginPath(); nctx.arc(n.x, n.y, 26 + 4 * Math.sin(t * 3), 0, Math.PI * 2); nctx.stroke(); }
      nctx.fillStyle = n.t === 'host' ? `rgba(${col},.6)` : '#111827'; nctx.strokeStyle = `rgb(${col})`; nctx.lineWidth = 1.5;
      nctx.beginPath(); nctx.arc(n.x, n.y, r, 0, Math.PI * 2); nctx.fill(); nctx.stroke();
      nctx.font = `${small ? 9 : 10.5}px "JetBrains Mono", monospace`; nctx.textAlign = 'center';
      nctx.fillStyle = n.t === 'warn' ? '#F59E0B' : n.t === 'host' ? 'rgba(148,163,184,.75)' : '#E5EDF7';
      if (n.t === 'host' && small) return;
      nctx.fillText(n.l, n.x, n.y + (n.t === 'pc' ? 44 : n.y < NH / 2 ? -12 : 20));
    });
  }
  let netOn = false, netRaf = 0; const nt0 = performance.now();
  function netLoop() { netRaf = 0; if (!netOn) return; netDraw((performance.now() - nt0) / 1000); netRaf = requestAnimationFrame(netLoop); }
  new IntersectionObserver(([e]) => { netOn = e.isIntersecting; if (RM) { netDraw(1); return; } if (netOn && !netRaf) netRaf = requestAnimationFrame(netLoop); }).observe(net);
  document.fonts && document.fonts.ready.then(() => netDraw(1));

  const ROWS = [
    ['chrome.exe', '203.0.113.24:443', 'ESTABLECIDA', ''], ['svchost.exe', '0.0.0.0:135', 'ESCUCHA', 'l'], ['steam.exe', '203.0.113.90:27036', 'ESTABLECIDA', ''],
    ['desconocido.exe', '192.0.2.200:8443', 'REVISAR', 'w'], ['Discord.exe', '198.51.100.7:443', 'ESTABLECIDA', ''], ['OneDrive.exe', '198.51.100.52:443', 'ESTABLECIDA', ''],
    ['System', '0.0.0.0:445', 'ESCUCHA', 'l'], ['chrome.exe', '192.0.2.81:443', 'ESTABLECIDA', '']
  ];
  const tb = $('#conn'); let ri = 0;
  const row = r => `<tr class="new"><td>${r[0]}</td><td>${r[1]}</td><td><span class="st ${r[3]}">${r[2]}</span></td></tr>`;
  tb.innerHTML = ROWS.slice(0, 5).map(row).join('').replace(/ class="new"/g, ''); ri = 5;
  if (!RM) setInterval(() => { if (!netOn) return; tb.insertAdjacentHTML('afterbegin', row(ROWS[ri++ % ROWS.length])); if (tb.rows.length > 5) tb.deleteRow(5); }, 1800);

  /* ---------- GSAP ---------- */
  if (!hasGSAP) { setPanel(1); $$('.split .ch').forEach(c => c.style.opacity = 1); return; }
  gsap.registerPlugin(ScrollTrigger);

  if (!RM) {
    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
    tl.from('.kicker', { y: 20, opacity: 0, duration: .8 }, .2)
      .from('.split .ch', { yPercent: 110, opacity: 0, rotateX: -80, stagger: .07, duration: 1.2 }, .3)
      .from('.hero-lema', { y: 24, opacity: 0, duration: .9 }, .7)
      .from('.hero-sub', { y: 24, opacity: 0, duration: .9 }, .8)
      .from('.hero-ctas .btn', { y: 20, opacity: 0, stagger: .1, duration: .8 }, .9)
      .from('.hud li', { y: 14, opacity: 0, stagger: .08, duration: .7 }, 1.05)
      .from('.hero-readout div', { x: 20, opacity: 0, stagger: .1, duration: .7 }, 1.1);

    ScrollTrigger.create({ trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true, onUpdate: s => { window.__heroProgress = s.progress; } });
    gsap.to('.hero-inner', { yPercent: -18, opacity: .2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

    ScrollTrigger.batch('[data-up]', {
      start: 'top 88%', once: true,
      onEnter: b => gsap.fromTo(b, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: .9, stagger: .08, ease: 'power3.out', overwrite: true })
    });
    gsap.set('[data-up]', { opacity: 0 });
  }

  if (!RM) $$('[data-scan]').forEach(el => ScrollTrigger.create({ trigger: el, start: 'top 85%', once: true, onEnter: () => el.classList.add('in') }));

  const mm = gsap.matchMedia();
  mm.add({ desk: '(min-width: 1101px)', mob: '(max-width: 1100px)', rm: '(prefers-reduced-motion: reduce)' }, ctx => {
    const { desk, rm } = ctx.conditions;
    if (rm) { setPanel(1); return; }
    if (desk) {
      ScrollTrigger.create({ trigger: '.panel-stage', start: 'top top', end: '+=160%', pin: true, scrub: .6, onUpdate: s => setPanel(s.progress) });
    } else {
      ScrollTrigger.create({ trigger: '.app-window', start: 'top 80%', end: 'bottom 20%', scrub: .5, onUpdate: s => setPanel(s.progress) });
    }
  });
  mm.add('(min-width: 901px) and (prefers-reduced-motion: no-preference)', () => {
    const track = $('.steps-track');
    const dist = () => Math.max(0, track.scrollWidth - innerWidth);
    gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '.steps-pin', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: .6, invalidateOnRefresh: true } });
    gsap.from('.step', { opacity: .25, scale: .94, stagger: .15, ease: 'none', scrollTrigger: { trigger: '.steps-pin', start: 'top 60%', end: 'top top', scrub: true } });
  });

  $$('.faq details').forEach(d => d.addEventListener('toggle', () => ScrollTrigger.refresh()));
  addEventListener('load', () => ScrollTrigger.refresh());
})();
