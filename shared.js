/* =====================================================================
   공용 런타임 — 두 체험이 같이 쓴다
   ===================================================================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fmt = p => p.toFixed(2);
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

/* ---------- shell 생성 ---------- */
const HUB_URL = '../index.html';
function buildShell({ stages, labName = 'BREIN Lab' }) {
  document.body.insertAdjacentHTML('afterbegin', `
  <img id="wm" src="${LOGO_KU}" alt="">
  <img id="wm2" src="${LOGO_KT}" alt="">
  <header id="bar">
    <button class="logos" id="home" title="체험 선택으로"><img src="${LOGO_KT}" alt="KT"><span class="x">×</span><img src="${LOGO_KU}" alt="고려대학교"><span class="labname">${labName}</span><span class="homehint">체험 선택</span></button>
    <div id="rail"></div><div id="who"></div>
  </header>
  <div id="thread"></div>
  <main id="app"></main>
  <footer id="nav">
    <div class="hintwrap"><div class="hint" id="hint"></div><div class="fn" id="fnote"></div></div>
    <div class="btns"><button class="btn ghost" id="prev">이전</button><button class="btn ghost" id="skip">바로 완료</button><button class="btn primary" id="next">다음</button></div>
  </footer>
  <div id="attract"><div><h2>다시 처음부터 시작할까요?</h2><p>한동안 조작이 없어 처음 화면으로 돌아갑니다.</p><button class="btn primary big" id="attractStay">계속 보기</button></div></div>`);
  window.STAGES = stages;
  $('#home').onclick = () => { location.href = HUB_URL; };
}

/* ---------- 실행 토큰 · 타이핑 ---------- */
let token = { fast: false };
async function wait(ms) { if (!token.fast) await sleep(ms); }
async function typeInto(el, text, cps = 60) {
  const cur = document.createElement('span'); cur.className = 'tcur'; el.textContent = ''; el.appendChild(cur);
  for (let i = 0; i < text.length; i++) {
    if (token.fast) { el.textContent = text; return; }
    cur.before(document.createTextNode(text[i]));
    await sleep(text[i] === ' ' ? 14 : 1000 / cps + (/[.。,]/.test(text[i]) ? 150 : 0));
  }
  cur.remove();
}
function countTo(el, from, to, ms = 700, dec = 2) {
  const t0 = performance.now();
  const step = t => { const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3); el.textContent = (from + (to - from) * e).toFixed(dec); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

/* ---------- 라우터 ---------- */
const Router = {
  order: [], scenes: {}, current: null, done: false, onEnter: null,
  init(order, scenes) {
    this.order = order; this.scenes = scenes;
    $('#next').onclick = () => this.next(); $('#prev').onclick = () => this.prev(); $('#skip').onclick = () => { token.fast = true; };
    $('#attractStay').onclick = () => { $('#attract').classList.remove('show'); Idle.touch(); };
    document.addEventListener('keydown', e => { if (e.target.tagName === 'INPUT') return; if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); this.next(); } if (e.key === 'ArrowLeft') this.prev(); if (e.key === 'f') toggleFullscreen(); });
  },
  go(name) {
    token.fast = true; token = { fast: false };
    this.current = name; this.done = false;
    const idx = this.order.indexOf(name);
    document.body.classList.toggle('landing', idx === 0);
    $('#rail').innerHTML = STAGES.map((s, i) => `<span class="${i + 1 === idx ? 'cur' : i + 1 < idx ? 'done' : ''}">${s}</span>`).join('');
    $('#thread').style.width = (idx / (this.order.length - 1) * 100) + '%';
    $('#prev').disabled = idx <= 0;
    const app = $('#app'); app.innerHTML = ''; app.scrollTop = 0; app.onclick = null;
    $('#skip').style.visibility = 'hidden'; $('#next').textContent = '다음'; $('#next').disabled = false;
    if (this.onEnter) this.onEnter(name, idx);
    this.scenes[name]();
  },
  ready(lbl) { this.done = true; $('#skip').style.visibility = 'hidden'; $('#next').disabled = false; if (lbl) $('#next').textContent = lbl; },
  block(lbl) { this.done = false; $('#next').disabled = true; if (lbl) $('#next').textContent = lbl; },
  next() {
    const i = this.order.indexOf(this.current);
    if (i === this.order.length - 1) return this.go(this.order[0]);
    if (!this.done) { token.fast = true; return; }
    this.go(this.order[i + 1]);
  },
  prev() { const i = this.order.indexOf(this.current); if (i > 0) this.go(this.order[i - 1]); },
  hint(t) { $('#hint').textContent = t; },
  note(t) { $('#fnote').textContent = t; },
  who(t) { $('#who').textContent = t; },
};
const go = n => Router.go(n);

/* ---------- 확률 벽 ---------- */
function wallHTML(probs, n = 25) {
  return Object.entries(probs).sort((a, b) => b[1] - a[1]).slice(0, n).map(([d, v]) => `<div class="prow" data-dx="${esc(d)}"><span class="n">${esc(d)}</span><span class="b"><i style="width:0"></i></span><span class="v num">${fmt(v)}</span><span class="delta"></span></div>`).join('');
}
function wallFill(wall) { $$('.prow', wall).forEach(r => { r.querySelector('i').style.width = parseFloat(r.querySelector('.v').textContent) * 100 + '%'; }); }
let _prevProbs = null;
function wallReset() { _prevProbs = null; }
function wallUpdate(wall, probs, top = [], animateNums = false) {
  const first = new Map([...wall.children].map(el => [el.dataset.dx, el.getBoundingClientRect().top]));
  [...wall.children].forEach(el => {
    const d = el.dataset.dx, v = probs[d]; if (v === undefined) return;
    el.querySelector('i').style.width = v * 100 + '%';
    const vEl = el.querySelector('.v'); const pv = _prevProbs ? _prevProbs[d] : parseFloat(vEl.textContent);
    if (animateNums && Math.abs(v - pv) > 0.005) countTo(vEl, pv, v, 500); else vEl.textContent = fmt(v);
    el.classList.toggle('top', top.includes(d));
    el.classList.toggle('up', v - pv > 0.03); el.classList.toggle('down', pv - v > 0.03);
  });
  [...wall.children].sort((a, b) => probs[b.dataset.dx] - probs[a.dataset.dx]).forEach(el => wall.appendChild(el));
  [...wall.children].forEach(el => {
    const dy = first.get(el.dataset.dx) - el.getBoundingClientRect().top;
    if (dy) { el.style.transition = 'none'; el.style.transform = `translateY(${dy}px)`; requestAnimationFrame(() => { el.style.transition = 'transform .5s var(--spring)'; el.style.transform = ''; }); }
  });
  _prevProbs = { ...probs };
}

/* ---------- 도장 ---------- */
function stampHTML(verdict, sub) {
  const cls = verdict === '확정' ? 'ok' : verdict === '배제' ? 'out' : 'unc';
  return `<span class="stamp ${cls}"><span>${verdict}${sub ? `<span class="sm">${sub}</span>` : ''}</span></span>`;
}
function stampIn(el) { requestAnimationFrame(() => el.classList.add('in')); }

/* ---------- ECG 선 (첫 화면 한 번의 움직임) ---------- */
function ecgPath(width = 1600, height = 160) {
  const mid = height / 2; let d = `M0 ${mid}`; let x = 0;
  const beat = () => { d += ` L${x += 40} ${mid} L${x += 10} ${mid - 6} L${x += 10} ${mid} L${x += 14} ${mid} L${x += 6} ${mid + 8} L${x += 8} ${mid - 58} L${x += 8} ${mid + 24} L${x += 6} ${mid} L${x += 30} ${mid} L${x += 12} ${mid - 10} L${x += 12} ${mid}`; };
  while (x < width) beat();
  return d;
}

/* ---------- 부스용: 방치 시 처음으로 · 방문자 수 · 전체화면 ---------- */
const Idle = {
  ms: 90000, t: null, warned: false,
  start() { ['pointerdown', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, () => this.touch(), { passive: true })); this.touch(); },
  touch() { clearTimeout(this.t); this.warned = false; this.t = setTimeout(() => this.warn(), this.ms); },
  warn() {
    if (Router.order.indexOf(Router.current) === 0) return this.touch();
    $('#attract').classList.add('show'); this.warned = true;
    this.t = setTimeout(() => { if (this.warned) { $('#attract').classList.remove('show'); Router.go(Router.order[0]); } }, 15000);
  },
};
const Store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  bump(k) { const v = this.get(k, 0) + 1; this.set(k, v); return v; },
};
function toggleFullscreen() { if (!document.fullscreenElement) document.documentElement.requestFullscreen?.(); else document.exitFullscreen?.(); }
