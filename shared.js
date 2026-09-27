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


/* ---------- 임상 판독문 (의사용 문서) ---------- */
function docHTML(o) {
  // o: { title, who, when, calib, cands:[{dx,p0}], trees:{dx:[rounds]}, fetchedText(fn), recommend:[...], note }
  const maxR = Math.max(...o.cands.map(c => (o.trees[c.dx] || []).length), 1);
  const last = dx => { const rs = o.trees[dx] || []; return rs[rs.length - 1]; };
  const vcls = v => v === '확정' ? 'ok' : v === '배제' ? 'out' : v === '추가 조사' ? 'more' : 'unc';
  const conf = o.cands.filter(c => last(c.dx) && last(c.dx).verdict === '확정').map(c => c.dx);
  const excl = o.cands.filter(c => last(c.dx) && last(c.dx).verdict === '배제').map(c => c.dx);
  const unc = o.cands.filter(c => last(c.dx) && last(c.dx).verdict === '불확실').map(c => c.dx);
  const today = new Date(); const dstr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
  const roundBlock = r => `<div class="dr"><div class="drh"><span class="drn">라운드 ${r}</span><span class="drs">${o.cands.filter(c => (o.trees[c.dx] || []).length >= r).length}개 후보 진행 · ${o.cands.filter(c => (o.trees[c.dx] || [])[r - 1] && (o.trees[c.dx] || [])[r - 1].judge === 'llm').length}건 LLM 추론</span></div>
    <table class="dt"><thead><tr><th>후보 진단</th><th>확률 변화</th><th>요청한 검사</th><th>조회 결과</th><th>판정</th></tr></thead><tbody>
    ${o.cands.map(c => { const rs = o.trees[c.dx] || []; const x = rs[r - 1]; if (!x) { const l = last(c.dx); return `<tr class="done"><td>${esc(c.dx)}</td><td class="num">${l ? fmt(l.after) : '—'}</td><td colspan="2" class="mute">라운드 ${rs.length}에서 종료</td><td><span class="dv ${vcls(l ? l.verdict : '')}">${l ? l.verdict : ''}</span></td></tr>`; }
      return `<tr><td><b>${esc(c.dx)}</b></td><td class="num"><span class="pb">${fmt(x.before)}</span> → <b class="pa">${fmt(x.after)}</b></td><td>${x.request.length ? esc(x.request.join(', ')) : '<span class="mute">없음</span>'}</td><td>${x.fetched.length ? esc(o.fetchedText(x.fetched)) : '<span class="mute">새 기록 없음</span>'}</td><td><span class="dv ${vcls(x.verdict)}">${x.verdict}</span></td></tr>
      <tr class="why"><td colspan="5"><span class="jl">${x.judge === 'llm' ? 'LLM 추론' : '임계값 판정'}</span>${esc(x.text)}</td></tr>`; }).join('')}
    </tbody></table></div>`;
  return `<article class="doc">
    <header class="dh"><div><div class="dk">EHR Agent 임상 판독문</div><h1>${esc(o.title)}</h1><div class="dm">${esc(o.who)} · ${esc(o.when)} · 생성 ${dstr}</div></div><div class="dlogo"><img src="${LOGO_KT}" alt="KT"><span>×</span><img src="${LOGO_KU}" alt="고려대"></div></header>
    <section class="ds"><h2>1. 요약</h2>
      <div class="dsum"><div class="dsb ok"><b>확정</b>${conf.length ? conf.map(esc).join(', ') : '<span class="mute">없음</span>'}</div><div class="dsb out"><b>배제</b>${excl.length ? excl.map(esc).join(', ') : '<span class="mute">없음</span>'}</div><div class="dsb unc"><b>불확실</b>${unc.length ? unc.map(esc).join(', ') : '<span class="mute">없음</span>'}</div></div>
      <p class="dp"><b>권고 검사 · 처치</b> ${o.recommend.length ? esc(o.recommend.join(', ')) : '추가 권고 없음'}</p></section>
    <section class="ds"><h2>2. 초기 평가 (첫 시점 기록 기준)</h2>
      <table class="dt small"><thead><tr><th>후보 진단</th><th>초기 확률</th><th>첫 라운드 요청 검사</th></tr></thead><tbody>${o.cands.map(c => `<tr><td>${esc(c.dx)}</td><td class="num"><b>${fmt(c.p0)}</b></td><td>${((o.trees[c.dx] || [])[0] || { request: [] }).request.join(', ') || '<span class="mute">—</span>'}</td></tr>`).join('')}</tbody></table>
      <p class="dp"><b>LLM 보정 근거</b> ${esc(o.calib)}</p></section>
    <section class="ds"><h2>3. 라운드별 경과</h2>${Array.from({ length: maxR }, (_, i) => roundBlock(i + 1)).join('')}</section>
    <section class="ds"><h2>4. 최종 소견</h2>
      <ul class="dl">${o.cands.map(c => { const l = last(c.dx); if (!l) return ''; return `<li><span class="dv ${vcls(l.verdict)}">${l.verdict}</span><b>${esc(c.dx)}</b> <span class="num">(${fmt(c.p0)} → ${fmt(l.after)})</span> — ${esc(l.text)}</li>`; }).join('')}</ul></section>
    <footer class="df">${esc(o.note)}</footer>
  </article>`;
}
