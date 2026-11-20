/* Vigía · sonido de interfaz opcional (apagado por defecto) y escudo de partículas */
(() => {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = s => document.querySelector(s);

  /* ---------- sonido UI sintetizado con WebAudio ---------- */
  let ac = null, on = false;
  try { on = localStorage.getItem('vigia-sound') === '1'; } catch (e) {}
  const btn = $('.snd');
  const setBtn = () => { if (!btn) return; btn.setAttribute('aria-pressed', on); btn.setAttribute('aria-label', on ? 'Desactivar sonido de interfaz' : 'Activar sonido de interfaz'); btn.title = 'Sonido de interfaz (' + (on ? 'activado' : 'apagado') + ')'; };
  function tone(f, d, type = 'sine', g = .05, when = 0, f2) {
    const t = ac.currentTime + when, o = ac.createOscillator(), v = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(g, t + .008); v.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(v).connect(ac.destination); o.start(t); o.stop(t + d + .02);
  }
  const SOUNDS = {
    tick: () => tone(2400, .03, 'sine', .018),
    click: () => tone(900, .09, 'triangle', .05, 0, 1600),
    open: () => { tone(220, .5, 'sawtooth', .025, 0, 880); tone(1320, .25, 'sine', .03, .25); },
    alert: () => { tone(440, .16, 'square', .035); tone(330, .16, 'square', .035, .2); tone(440, .16, 'square', .035, .4); tone(330, .16, 'square', .035, .6); },
    ok: () => { tone(660, .18, 'sine', .05); tone(990, .3, 'sine', .05, .12); },
    lock: () => { tone(120, .35, 'sine', .08, 0, 60); tone(1760, .12, 'sine', .025, .05); }
  };
  let last = 0;
  window.VigiaSound = {
    play(n) { if (!on || !ac || RM && n !== 'click') return; const now = performance.now(); if (n === 'tick' && now - last < 70) return; last = now; try { SOUNDS[n] && SOUNDS[n](); } catch (e) {} }
  };
  setBtn();
  btn && btn.addEventListener('click', () => {
    on = !on; try { localStorage.setItem('vigia-sound', on ? '1' : '0'); } catch (e) {}
    if (on && !ac) { const C = window.AudioContext || window.webkitAudioContext; if (C) ac = new C(); }
    if (ac && ac.state === 'suspended') ac.resume();
    setBtn(); if (on) VigiaSound.play('click');
  });
  // el navegador exige un gesto del usuario para crear el audio: si estaba activado, se prepara al primer clic
  if (on) addEventListener('pointerdown', () => { if (!ac) { const C = window.AudioContext || window.webkitAudioContext; if (C) ac = new C(); } }, { once: true });
  document.addEventListener('pointerover', e => { if (e.target.closest && e.target.closest('a.btn, button, summary, .nav-links a')) VigiaSound.play('tick'); });
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('a.btn, summary, .nav-links a')) VigiaSound.play('click'); });

  /* ---------- escudo de partículas que se forma con el scroll ---------- */
  const cv = $('#forge'); if (!cv) return;
  const ctx = cv.getContext('2d');
  const meter = $('#forge-val');
  const mobile = matchMedia('(max-width: 900px)').matches || matchMedia('(pointer: coarse)').matches;
  const MAX = mobile ? 750 : 1700;
  const SHIELD = new Path2D('M32 4 9 13v15c0 15 9.8 26.6 23 32 13.2-5.4 23-17 23-32V13L32 4Z');
  let W, H, dpr, P = [], cx, cy, S, prog = RM ? 1 : 0, vis = false, raf = 0, locked = false;

  function sample() {
    const N = 220, o = document.createElement('canvas'); o.width = o.height = N;
    const c = o.getContext('2d'); c.scale(N / 64, N / 64);
    c.lineWidth = 3.4; c.strokeStyle = '#fff'; c.lineJoin = 'round'; c.stroke(SHIELD);
    c.lineWidth = 2.2; c.stroke(new Path2D('M17 31c4.2-6 9.2-9 15-9s10.8 3 15 9c-4.2 6-9.2 9-15 9s-10.8-3-15-9Z')); c.beginPath(); c.arc(32, 31, 5, 0, 7); c.stroke(); c.beginPath(); c.arc(32, 31, 1.8, 0, 7); c.fill();
    c.globalAlpha = .35; c.fill(SHIELD);
    const d = c.getImageData(0, 0, N, N).data, pts = [];
    for (let y = 0; y < N; y += 2) for (let x = 0; x < N; x += 2) { const a = d[(y * N + x) * 4 + 3]; if (a > 200 || (a > 60 && Math.random() < .16)) pts.push([x / N - .5, y / N - .5, a > 200 ? 1 : .45]); }
    for (let i = pts.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [pts[i], pts[j]] = [pts[j], pts[i]]; }
    return pts.slice(0, MAX);
  }
  const TGT = sample();
  function resize() {
    dpr = Math.min(devicePixelRatio, mobile ? 1.5 : 2); W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const wide = W > 900; cx = wide ? W * .68 : W * .5; cy = wide ? H * .5 : H * .3; S = Math.min(wide ? H * .78 : W * .78, wide ? 640 : 380);
    P = TGT.map(([tx, ty, w], i) => {
      const a = Math.random() * Math.PI * 2, r = (0.5 + Math.random() * .9) * Math.max(W, H) * .7;
      return { sx: cx + Math.cos(a) * r, sy: cy + Math.sin(a) * r * .7, tx: cx + tx * S, ty: cy + ty * S, w, d: Math.random() * .35, k: Math.random() < .14 ? (Math.random() < .5 ? 2 : 1) : 0, ph: Math.random() * 6.28 };
    });
    draw(performance.now() / 1000);
  }
  const ease = x => 1 - Math.pow(1 - x, 3);
  const COL = ['103,232,249', '245,158,11', '239,68,68'];
  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    const sz = mobile ? 2 : 2.3;
    for (const p of P) {
      const q = Math.max(0, Math.min(1, (prog - p.d) / (1 - .35 - (.35 - p.d) * 0)));
      const e = ease(Math.min(1, q / .65 > 1 ? 1 : q / .65));
      const jit = (1 - e) * 6;
      const x = p.sx + (p.tx - p.sx) * e + Math.sin(t * 1.3 + p.ph) * jit;
      const y = p.sy + (p.ty - p.sy) * e + Math.cos(t * 1.1 + p.ph) * jit;
      const settled = e > .97;
      const c = settled ? COL[0] : COL[p.k];
      const a = Math.min(1, (settled ? .9 + .1 * Math.sin(t * 2 + p.ph) : .4 + e * .45) * (p.w < 1 ? .55 : 1));
      ctx.fillStyle = `rgba(${c},${a})`;
      ctx.fillRect(x, y, sz, sz);
    }
    if (prog > .9) {
      const k = Math.min(1, (prog - .9) / .1), sw = t * 1.6;
      ctx.strokeStyle = `rgba(103,232,249,${.8 * k})`; ctx.lineWidth = 2;
      const r = S * 11 / 64, ox = cx, oy = cy + S * (31 / 64 - .5);
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + Math.cos(sw) * r, oy + Math.sin(sw) * r); ctx.stroke();
      const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, S * .6);
      g.addColorStop(0, `rgba(34,211,238,${.16 * k})`); g.addColorStop(1, 'rgba(34,211,238,0)');
      ctx.fillStyle = g; ctx.fillRect(ox - S, oy - S, S * 2, S * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
    if (meter) meter.textContent = Math.round(Math.min(1, prog / .9) * 100) + ' %';
  }
  function loop() { raf = 0; if (!vis) return; draw(performance.now() / 1000); raf = requestAnimationFrame(loop); }
  new IntersectionObserver(([e]) => { vis = e.isIntersecting; if (vis && !raf && !RM) raf = requestAnimationFrame(loop); }).observe(cv);
  addEventListener('resize', resize); resize();
  if (RM) { addEventListener('resize', () => draw(0)); return; }
  const start = () => {
    if (!window.gsap || !window.ScrollTrigger) { prog = 1; return; }
    ScrollTrigger.create({ trigger: '.forge-pin', start: 'top top', end: '+=130%', pin: true, scrub: .5,
      onUpdate: s => { prog = s.progress; if (prog > .9 && !locked) { locked = true; VigiaSound.play('lock'); } if (prog < .8) locked = false; } });
    ScrollTrigger.sort(); ScrollTrigger.refresh();
  };
  if (document.readyState === 'complete') start(); else addEventListener('load', start);
})();
