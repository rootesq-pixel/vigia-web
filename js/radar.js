/* Vigía · hero: radar 3D con cúpula-escudo (Three.js) y fallback 2D */
const canvas = document.getElementById('radar');
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const readout = document.getElementById('ro-angle');
const TAU = Math.PI * 2;

function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

let THREE = null;
if (hasWebGL()) { try { THREE = await import('three'); } catch (e) { THREE = null; } }

if (THREE) initGL(); else init2D();

function heroVisible(cb) {
  let vis = true;
  new IntersectionObserver(([e]) => { vis = e.isIntersecting; cb(vis); }, { threshold: 0 }).observe(canvas);
  return () => vis;
}

function initGL() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0b0f17, 0.09);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  const root = new THREE.Group(); scene.add(root);
  const R = 2.4;
  const uni = { uTime: { value: 0 }, uSweep: { value: 0 }, uIntro: { value: 0 } };

  /* disco del radar */
  const disc = new THREE.Mesh(new THREE.PlaneGeometry(R * 2.2, R * 2.2), new THREE.ShaderMaterial({
    uniforms: uni, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `
      varying vec2 vUv; uniform float uTime,uSweep,uIntro;
      #define PI 3.14159265
      float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      void main(){
        vec2 p=(vUv*2.-1.)*1.1; float r=length(p);
        if(r>1.06) discard;
        float a=atan(p.y,p.x);
        float rr=r*6.; float dR=min(fract(rr),1.-fract(rr)); float ring=1.-smoothstep(0.,.035,dR);
        float sp=a/(PI/12.); float dS=min(fract(sp),1.-fract(sp))*r*PI/12.*6.; float spoke=(1.-smoothstep(0.,.02,dS))*smoothstep(.15,.4,r);
        float fine=1.-smoothstep(0.,.012,min(fract(r*30.),1.-fract(r*30.)));
        float delta=mod(uSweep-a,2.*PI);
        float trail=exp(-delta*2.2)*(1.-smoothstep(0.,1.02,r))*1.6+exp(-delta*2.2)*.25;
        float line=(1.-smoothstep(0.,.03,delta))*(1.-smoothstep(.98,1.02,r));
        float rim=(1.-smoothstep(0.,.012,abs(r-1.)))*1.2+(1.-smoothstep(0.,.005,abs(r-1.035)))*.6;
        float reveal=1.-smoothstep(uIntro*1.1-.08,uIntro*1.1+.0001,r);
        float n=hash(floor(p*90.)+floor(uTime*8.))*.06*trail;
        float v=ring*.3+spoke*.12+fine*.04*trail+trail*.42+line*1.1+rim*.55+n;
        v*=(1.-smoothstep(.94,1.06,r))+rim;
        vec3 col=mix(vec3(.05,.55,.7),vec3(.55,.95,1.),line+trail*.4);
        gl_FragColor=vec4(col,clamp(v*reveal,0.,1.));
      }`
  }));
  disc.rotation.x = -Math.PI / 2; root.add(disc);

  /* blips (contactos) */
  const N = 46, pos = new Float32Array(N * 3), ang = new Float32Array(N), kind = new Float32Array(N), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const a = Math.random() * TAU, r = (0.2 + Math.random() * 0.76) * R;
    pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = 0.02; pos[i * 3 + 2] = -Math.sin(a) * r;
    ang[i] = a; kind[i] = Math.random() < 0.12 ? 2 : (Math.random() < 0.2 ? 1 : 0); seed[i] = Math.random();
  }
  const bg = new THREE.BufferGeometry();
  bg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  bg.setAttribute('aAng', new THREE.BufferAttribute(ang, 1));
  bg.setAttribute('aKind', new THREE.BufferAttribute(kind, 1));
  bg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const blips = new THREE.Points(bg, new THREE.ShaderMaterial({
    uniforms: { ...uni, uPR: { value: renderer.getPixelRatio() } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute float aAng,aKind,aSeed; uniform float uSweep,uPR,uIntro; varying float vI; varying vec3 vC;
      void main(){
        float d=mod(uSweep-aAng,6.2831853); vI=exp(-d*1.1)*uIntro;
        vC= aKind>1.5? vec3(.94,.27,.27) : (aKind>.5? vec3(.96,.62,.04): vec3(.2,.83,.93));
        vec4 mv=modelViewMatrix*vec4(position,1.);
        gl_PointSize=(6.+18.*vI)*uPR*(5./-mv.z);
        gl_Position=projectionMatrix*mv;
      }`,
    fragmentShader: `varying float vI; varying vec3 vC;
      void main(){ vec2 c=gl_PointCoord-.5; float d=length(c); float core=1.-smoothstep(0.,.18,d); float halo=(1.-smoothstep(0.,.5,d))*.5; float ring=(1.-smoothstep(0.,.04,abs(d-.38)))*vI;
      float a=(core+halo)*(.18+vI)+ring*.8; gl_FragColor=vec4(vC,clamp(a,0.,1.)); }`
  }));
  root.add(blips);

  /* conexiones desde el centro a algunos contactos */
  const links = [];
  const lineMat = new THREE.ShaderMaterial({
    uniforms: uni, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aT; attribute float aAng; varying float vT; varying float vA; void main(){ vT=aT; vA=aAng; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying float vT; varying float vA; uniform float uTime,uSweep,uIntro;
      void main(){ float d=mod(uSweep-vA,6.2831853); float lit=exp(-d*1.4);
      float pulse=1.-smoothstep(0.,.12,abs(fract(uTime*.5+vA)-vT));
      float a=(.05+lit*.5+pulse*.7)*uIntro; gl_FragColor=vec4(vec3(.25,.85,.95),a); }`
  });
  for (let i = 0; i < N; i += 3) {
    const x = pos[i * 3], z = pos[i * 3 + 2];
    const pts = [], ts = [], as = [];
    const h = 0.35 + Math.hypot(x, z) * 0.25;
    for (let s = 0; s <= 40; s++) { const t = s / 40; pts.push(x * t, Math.sin(t * Math.PI) * h, z * t); ts.push(t); as.push(ang[i]); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    g.setAttribute('aT', new THREE.Float32BufferAttribute(ts, 1));
    g.setAttribute('aAng', new THREE.Float32BufferAttribute(as, 1));
    const l = new THREE.Line(g, lineMat); root.add(l); links.push(l);
  }

  /* cúpula-escudo */
  const domeGeo = new THREE.IcosahedronGeometry(R * 0.92, 3);
  const dome = new THREE.LineSegments(new THREE.WireframeGeometry(domeGeo), new THREE.ShaderMaterial({
    uniforms: uni, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec3 vP; uniform float uTime,uIntro;
      void main(){ if(vP.y<0.) discard; float h=vP.y/2.2;
      float scan=1.-smoothstep(0.,.06,abs(fract(uTime*.16)-h));
      float a=(.05+ (1.-h)*.07 + scan*.55)*smoothstep(0.,.05,vP.y)*uIntro;
      gl_FragColor=vec4(vec3(.2,.82,.93),a); }`
  }));
  root.add(dome);

  /* anillo de escaneo que sube por la cúpula */
  const scanRing = new THREE.Mesh(new THREE.TorusGeometry(1, 0.006, 6, 160), new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false }));
  scanRing.rotation.x = Math.PI / 2; root.add(scanRing);

  /* núcleo */
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), new THREE.MeshBasicMaterial({ color: 0x22d3ee, wireframe: true }));
  core.position.y = 0.22; root.add(core);
  const coreGlow = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), new THREE.MeshBasicMaterial({ color: 0xa5f3fc }));
  coreGlow.position.y = 0.22; root.add(coreGlow);

  /* polvo de datos */
  const D = 600, dp = new Float32Array(D * 3);
  for (let i = 0; i < D; i++) { dp[i * 3] = (Math.random() - .5) * 14; dp[i * 3 + 1] = Math.random() * 6 - 1; dp[i * 3 + 2] = (Math.random() - .5) * 14; }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0x22d3ee, size: 0.018, transparent: true, opacity: .45, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(dust);

  let wide = true;
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    wide = w / h > 1.05;
    camera.fov = wide ? 40 : 56;
    camera.updateProjectionMatrix();
    root.position.set(wide ? 2.25 : 0, wide ? -0.2 : 0.6, 0);
  }
  addEventListener('resize', resize); resize();

  let mx = 0, my = 0, tx = 0, ty = 0;
  addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }, { passive: true });

  let running = true, raf = 0;
  const t0 = performance.now();
  heroVisible(v => { running = v; if (v && !RM && !raf) raf = requestAnimationFrame(loop); });

  function frame(t) {
    const prog = window.__heroProgress || 0;
    uni.uTime.value = t;
    uni.uSweep.value = (t * 1.25) % TAU;
    uni.uIntro.value = RM ? 1 : Math.min(1, t / 2.2);
    tx += (mx - tx) * .05; ty += (my - ty) * .05;
    camera.position.set(Math.sin(tx * .6) * 6.4, 3.2 - ty * 1.2 + prog * 1.5, Math.cos(tx * .6) * 6.4 - prog * 1.2);
    camera.lookAt(root.position.x * .55, 0.3 - prog * .6, 0);
    root.rotation.y = t * 0.05;
    dome.rotation.y = -t * 0.08;
    const ph = (t * .16) % 1, yy = ph * R * .92;
    scanRing.position.y = yy; const rr = Math.sqrt(Math.max(0.0001, (R * .92) ** 2 - yy * yy)); scanRing.scale.set(rr, rr, rr);
    scanRing.material.opacity = .7 * (1 - ph) * uni.uIntro.value;
    core.rotation.y = t * 1.2; core.rotation.x = t * .7;
    const s = 1 + Math.sin(t * 3) * .15; coreGlow.scale.set(s, s, s);
    dust.rotation.y = t * .01; dust.position.y = -prog * 1.5;
    canvas.style.opacity = String(1 - prog * .85);
    if (readout) readout.textContent = String(Math.round(((uni.uSweep.value * 180 / Math.PI) % 360))).padStart(3, '0') + '°';
    renderer.render(scene, camera);
  }
  function loop() {
    raf = 0;
    if (!running) return;
    frame((performance.now() - t0) / 1000);
    raf = requestAnimationFrame(loop);
  }
  if (RM) { frame(2.6); addEventListener('resize', () => frame(2.6)); }
  else if (!raf) raf = requestAnimationFrame(loop);
}

function init2D() {
  document.documentElement.classList.add('no-webgl');
  const ctx = canvas.getContext('2d');
  let w, h, dpr, cx, cy, R;
  const blips = Array.from({ length: 34 }, () => ({ a: Math.random() * TAU, r: .15 + Math.random() * .8, k: Math.random() < .12 ? 2 : Math.random() < .2 ? 1 : 0 }));
  const cols = ['34,211,238', '245,158,11', '239,68,68'];
  function resize() {
    dpr = Math.min(devicePixelRatio, 2); w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const wide = w / h > 1.05; cx = wide ? w * .7 : w * .5; cy = wide ? h * .5 : h * .32; R = Math.min(wide ? h * .42 : w * .46, 420);
  }
  addEventListener('resize', resize); resize();
  function draw(t) {
    const sw = (t * 1.25) % TAU;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(34,211,238,.18)'; ctx.lineWidth = 1;
    for (let i = 1; i <= 5; i++) { ctx.beginPath(); ctx.arc(cx, cy, R * i / 5, 0, TAU); ctx.stroke(); }
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.stroke(); }
    if (ctx.createConicGradient) {
      const g = ctx.createConicGradient(sw - 1.2, cx, cy);
      g.addColorStop(0, 'rgba(34,211,238,0)'); g.addColorStop(1.2 / TAU, 'rgba(34,211,238,.35)'); g.addColorStop(1.2 / TAU + .001, 'rgba(34,211,238,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(103,232,249,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(sw) * R, cy + Math.sin(sw) * R); ctx.stroke();
    for (const b of blips) {
      const d = ((sw - b.a) % TAU + TAU) % TAU, I = Math.exp(-d * 1.1);
      ctx.fillStyle = `rgba(${cols[b.k]},${.15 + I})`; ctx.beginPath(); ctx.arc(cx + Math.cos(b.a) * b.r * R, cy + Math.sin(b.a) * b.r * R, 2 + I * 3, 0, TAU); ctx.fill();
    }
    if (readout) readout.textContent = String(Math.round(sw * 180 / Math.PI) % 360).padStart(3, '0') + '°';
  }
  let running = true, raf = 0; const t0 = performance.now();
  heroVisible(v => { running = v; if (v && !RM && !raf) raf = requestAnimationFrame(loop); });
  function loop() { raf = 0; if (!running) return; draw((performance.now() - t0) / 1000); raf = requestAnimationFrame(loop); }
  if (RM) { draw(2); addEventListener('resize', () => draw(2)); } else if (!raf) raf = requestAnimationFrame(loop);
}
