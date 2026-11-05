import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot, query, orderBy,
  deleteDoc, doc, getDocs, updateDoc, increment
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

/* ============ 🔥 Firebase (기존과 동일 — 기존 이야기가 그대로 보여요) ============ */
const firebaseConfig = {
  apiKey: "AIzaSyCO9ZM-CM4rDIizZPHxo_Tx0ST89fADrgc",
  authDomain: "maum-project-f249b.firebaseapp.com",
  projectId: "maum-project-f249b",
  storageBucket: "maum-project-f249b.firebasestorage.app",
  messagingSenderId: "638023840601",
  appId: "1:638023840601:web:c55ce7b2a80e6d6018d248"
};
const db = getFirestore(initializeApp(firebaseConfig));
const postsCol = collection(db, "posts");
const ADMIN_PW = "0530";

/* ============ 📚 내용 ============ */
// 순서는 기존 데이터와 같아요: 0 주변화, 1 분리, 2 동화, 3 통합
const TYPES = [
  { key: "주변화", en: "Marginalization", emoji: "🍂", short: "어디에도 속하지 않는 느낌", tc: "#7B68C8", tbg: "#F0EDFB",
    desc: "고향 문화와 한국 문화 양쪽 모두에서 소외감을 느끼고, 어디에도 속하지 못해 혼란스러운 상태예요. 지금 많이 힘들 수 있어요. 혼자가 아니에요 🤍" },
  { key: "분리", en: "Separation", emoji: "🏠", short: "내 문화를 꼭 지켜요", tc: "#E07B1F", tbg: "#FFF1E2",
    desc: "나의 뿌리 문화를 강하게 지키면서, 한국 사회의 문화와는 조금 거리를 두는 방식이에요." },
  { key: "동화", en: "Assimilation", emoji: "🦎", short: "한국 문화에 맞춰가요", tc: "#1E9E5A", tbg: "#E3F8EC",
    desc: "한국 사회에 잘 적응하기 위해 나의 고유 문화를 내려놓거나 맞추려고 노력하는 상태예요." },
  { key: "통합", en: "Integration", emoji: "🌈", short: "두 문화 모두 소중해요", tc: "#2F7FE0", tbg: "#E6F1FF",
    desc: "나의 문화를 소중히 지키면서, 한국 문화의 좋은 점도 조화롭게 받아들인 상태예요." }
];
// 베리의 2×2 그림 배치: [분리, 통합] / [주변화, 동화]
const MATRIX_ORDER = [1, 3, 0, 2];

// 질문 문구는 기존과 같아요 (기존 답변과 짝이 맞아야 해요)
const QUESTIONS = [
  { q: "한국에 오게 된 이유", icon: "🧳", ph: "예: 일을 하려고, 가족과 함께 살려고…" },
  { q: "나를 버티게 해준 것", icon: "💪", ph: "예: 아이들의 웃음, 고향 음식, 친구…" },
  { q: "나에게 힘이 되는 말", icon: "💬", ph: "예: \"괜찮아, 잘하고 있어\"" },
  { q: "그만두고 싶었던 순간", icon: "🌧️", ph: "예: 말이 통하지 않아 답답했을 때…" }
];

const CHAR_EMOJI = { "남자": "🙋‍♂️", "여자": "🙋‍♀️", "가족": "🏡" };
const FAMILY_AVATARS = [
  { e: "👨", label: "남성", g: "남성" }, { e: "👩", label: "여성", g: "여성" },
  { e: "👴", label: "할아버지", g: "남성" }, { e: "👵", label: "할머니", g: "여성" },
  { e: "👦", label: "남자아이", g: "남성" }, { e: "👧", label: "여자아이", g: "여성" },
  { e: "👶", label: "아기", g: "" }
];

/* ============ 🧠 상태 ============ */
let members = [];
let selectedChar = "남자";
let selectedAvatar = FAMILY_AVATARS[1];
let currentFamilyName = "";
let editingPostId = null;
let allPosts = [];
let filterType = "all";
let visibleCount = 5;
let deferredInstall = null;

/* ============ 🛠️ 도우미 ============ */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const store = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} }
};
let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
}
const typeStyle = (i) => `--tc:${TYPES[i].tc};--tbg:${TYPES[i].tbg}`;
const typeIndex = (key) => TYPES.findIndex((t) => t.key === key);

function memberEmoji(m) {
  if (m.emoji) return m.emoji;
  if (m.char === "가족") return String(m.role || "").startsWith("여성") ? "👩" : String(m.role || "").startsWith("남성") ? "👨" : "🙂";
  return CHAR_EMOJI[m.char] || "🙂";
}
function fmtDate(ts) {
  try {
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    if (isNaN(d)) return "";
    return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
  } catch { return ""; }
}

// 가족 이름 비교 (기존 규칙 유지: 의미 없는 말을 빼고 한 글자라도 겹치면 같은 가족 후보)
function isSameFamily(a, b) {
  if (!a || !b) return false;
  const re = /가족|식구|부부|그룹|팀|네|과|와|\s|[,\.\/\-_]/g;
  const x = a.replace(re, ""), y = b.replace(re, "");
  for (const ch of x) if (y.includes(ch)) return true;
  return false;
}

// 홈 화면에 설치한 앱으로 열었는지 (설치 앱에는 크롬 메뉴가 없어서 크롬 번역을 쓸 수 없어요)
const IS_STANDALONE = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const IS_IOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

/* ============ 🌐 언어 ============ */
// 앱 안에서 고른 언어 (설치 앱·브라우저 모두에서 똑같이 동작해요)
let uiLang = store.get("ui-lang", "ko");
const UI_LANGS = [
  ["ko", "한국어"], ["en", "English"], ["vi", "Tiếng Việt"], ["zh-CN", "简体中文"], ["zh-TW", "繁體中文"],
  ["ja", "日本語"], ["th", "ไทย"], ["km", "ខ្មែរ"], ["my", "မြန်မာ"], ["ne", "नेपाली"], ["mn", "Монгол"],
  ["uz", "Oʻzbek"], ["ru", "Русский"], ["kk", "Қазақ"], ["ky", "Кыргызча"], ["id", "Indonesia"],
  ["tl", "Filipino"], ["si", "සිංහල"], ["bn", "বাংলা"], ["ur", "اردو"], ["hi", "हिन्दी"],
  ["lo", "ລາວ"], ["ar", "العربية"], ["fr", "Français"], ["es", "Español"], ["pt", "Português"]
];
const langGridHTML = () => `<div class="lang-grid notranslate" translate="no">${UI_LANGS.map(([c, n]) =>
  `<button type="button" data-ui-lang="${c}" class="${c === uiLang ? "on" : ""}">${n}</button>`).join("")}</div>`;

function currentLang() {
  if (uiLang !== "ko") return uiLang;
  // 크롬 번역이 켜져 있으면 <html>에 translated-ltr/rtl 표시와 번역 언어가 붙어요.
  const h = document.documentElement;
  const translated = /translated-(ltr|rtl)/.test(h.className) && h.lang && h.lang !== "ko";
  const raw = (translated ? h.lang : navigator.language) || "ko";
  const [base, region] = raw.split(/[-_]/);
  return base.toLowerCase() === "zh" && region ? `zh-${region.toUpperCase()}` : base.toLowerCase();
}
function langName(code) {
  try { return new Intl.DisplayNames(["ko"], { type: "language" }).of(code) || code; } catch { return code; }
}

/* ============ 🔤 이야기 번역 ============ */
// 크롬 페이지 번역은 페이지 전체를 한 언어로 보고 번역해서, 여러 언어가 섞이면 일부가 안 바뀌어요.
// 그래서 답변을 하나씩 따로 보내 언어를 각각 알아낸 뒤 번역해요.
let trMode = store.get("tr-mode", "orig");
const trCache = new Map(store.get("tr-cache", []));
let saveTimer;
function saveTrCache() { clearTimeout(saveTimer); saveTimer = setTimeout(() => store.set("tr-cache", [...trCache.entries()].slice(-2500)), 400); }
const trKey = (tl, sl, text) => (sl === "auto" ? `${tl}|${text}` : `${tl}|${sl}>${text}`);
const inflight = new Map();

// 여러 문장을 줄바꿈으로 묶어 한 번에 보내요 (빠르게). 줄 수가 안 맞으면 하나씩 다시 보내요.
async function fetchTr(texts, tl, sl) {
  const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${encodeURIComponent(tl)}&dt=t`, {
    method: "POST", body: new URLSearchParams({ q: texts.join("\n") })
  });
  if (!res.ok) throw new Error(`translate ${res.status}`);
  const d = await res.json();
  const src = d?.[2] || (sl === "auto" ? "" : sl);
  const full = (d?.[0] || []).map((s) => s?.[0] || "").join("");
  if (texts.length === 1) return [{ t: full, src }];
  const lines = full.split("\n");
  if (lines.length !== texts.length) throw new Error("line mismatch");
  return lines.map((t) => ({ t: t.trim(), src }));
}
// 문장 목록 → 번역 결과 Promise 목록 (저장본·진행 중인 요청을 다시 써요)
function translateMany(texts, tl, sl = "auto") {
  const out = new Array(texts.length), todo = [];
  texts.forEach((x, i) => {
    const k = trKey(tl, sl, x);
    if (trCache.has(k)) out[i] = Promise.resolve(trCache.get(k));
    else if (inflight.has(k)) out[i] = inflight.get(k);
    else todo.push(i);
  });
  const chunks = [];
  let chunk = [], len = 0;
  for (const i of todo) {
    if (chunk.length && (len + texts[i].length > 1500 || chunk.length >= 40)) { chunks.push(chunk); chunk = []; len = 0; }
    chunk.push(i); len += texts[i].length + 1;
  }
  if (chunk.length) chunks.push(chunk);
  for (const c of chunks) {
    const strs = [...new Set(c.map((i) => texts[i]))];
    const one = () => Promise.all(strs.map((s) => fetchTr([s], tl, sl).then((r) => r[0])));
    const p = (strs.length > 1 && !strs.some((s) => s.includes("\n")) ? fetchTr(strs, tl, sl).catch(one) : one())
      .then((rs) => { rs.forEach((r, j) => trCache.set(trKey(tl, sl, strs[j]), r)); saveTrCache(); return rs; })
      .finally(() => strs.forEach((s) => inflight.delete(trKey(tl, sl, s))));
    strs.forEach((s, j) => inflight.set(trKey(tl, sl, s), p.then((rs) => rs[j])));
    c.forEach((i) => (out[i] = inflight.get(trKey(tl, sl, texts[i]))));
  }
  return out;
}
const translateText = (text, tl) => translateMany([text], tl)[0];

/* ============ 🌐 앱 화면 번역 ============ */
// 화면의 글자를 하나씩 찾아 고른 언어로 바꿔요. 새로 생기는 글자(안내창·알림 등)도 자동으로 바꿔요.
// 이름·입력 중인 글(textarea)·notranslate 표시가 있는 곳은 그대로 둬요.
const tState = new WeakMap(), aState = new WeakMap();
const TR_ATTRS = ["placeholder", "aria-label"];
function skipEl(el) {
  const c = el.closest('[translate="no"], .notranslate, script, style, textarea');
  return !!c && c !== document.documentElement;
}
function collectItems() {
  const items = [];
  const add = (st, valid, set, auto) => {
    if (!/\p{L}/u.test(st.orig)) return;
    const m = st.orig.match(/^(\s*)([\s\S]*?)(\s*)$/);
    items.push({ st, valid, set, auto, pre: m[1], core: m[2], post: m[3] });
  };
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const p = n.parentElement;
    if (!p || skipEl(p)) continue;
    let st = tState.get(n);
    if (!st || n.nodeValue !== st.shown) { st = { orig: n.nodeValue, shown: n.nodeValue }; tState.set(n, st); }
    add(st, () => tState.get(n) === st && n.nodeValue === st.shown, (s) => { st.shown = s; n.nodeValue = s; }, !!p.closest(".qb"));
  }
  document.body.querySelectorAll("[placeholder], [aria-label]").forEach((el) => {
    if (skipEl(el)) return;
    let m = aState.get(el);
    if (!m) aState.set(el, (m = {}));
    TR_ATTRS.forEach((a) => {
      const v = el.getAttribute(a);
      if (v === null) return;
      let st = m[a];
      if (!st || v !== st.shown) m[a] = st = { orig: v, shown: v };
      add(st, () => m[a] === st && el.getAttribute(a) === st.shown, (s) => { st.shown = s; el.setAttribute(a, s); }, false);
    });
  });
  return items;
}
async function translatePage() {
  const tl = uiLang, items = collectItems();
  if (tl === "ko") { items.forEach((it) => it.st.shown !== it.st.orig && it.set(it.st.orig)); return; }
  const apply = (it, t) => { if (uiLang === tl && it.valid()) { const s = it.pre + t + it.post; if (s !== it.st.shown) it.set(s); } };
  const ui = items.filter((it) => !it.auto), answers = items.filter((it) => it.auto);
  await seedTypeNames(tl);
  const ps = translateMany(ui.map((it) => it.core), tl, "ko").map((p, i) => p.then((r) => apply(ui[i], r.t)));
  // 답변은 어느 나라 말인지 모르니 하나씩 언어를 알아내서 번역해요
  answers.forEach((it) => ps.push(translateText(it.core, tl).then((r) => {
    const same = !r.src || r.src.split("-")[0] === tl.split("-")[0];
    apply(it, same ? it.core : r.t);
  })));
  return Promise.allSettled(ps);
}
// 유형 이름(동화·분리…)은 한 단어라 잘못 번역되기 쉬워서, 영어 이름(Assimilation…)을 번역해 써요
async function seedTypeNames(tl) {
  if (TYPES.every((t) => trCache.has(trKey(tl, "ko", t.key)))) return;
  const rs = await Promise.allSettled(translateMany(TYPES.map((t) => t.en), tl, "en"));
  rs.forEach((r, i) => r.status === "fulfilled" && trCache.set(trKey(tl, "ko", TYPES[i].key), { t: r.value.t, src: "ko" }));
}
let pageTimer;
new MutationObserver(() => {
  if (uiLang === "ko") return;
  clearTimeout(pageTimer); pageTimer = setTimeout(translatePage, 60);
}).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: TR_ATTRS });

function applyLangAttrs() {
  const h = document.documentElement;
  h.lang = uiLang;
  // 앱 번역을 쓰는 동안에는 크롬 번역이 겹치지 않게 막아요
  if (uiLang === "ko") h.removeAttribute("translate"); else h.setAttribute("translate", "no");
}
async function setUiLang(code) {
  if (code === uiLang) return;
  uiLang = code; store.set("ui-lang", code);
  applyLangAttrs();
  $$("[data-ui-lang]").forEach((b) => b.classList.toggle("on", b.dataset.uiLang === code));
  renderTrSeg();
  await translatePage();
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-ui-lang]");
  if (b) setUiLang(b.dataset.uiLang);
});

function trOptions() {
  const opts = [{ v: "orig", label: "📝 원문" }, { v: "ko", label: "🇰🇷 한국어" }, { v: "en", label: "🇺🇸 English" }];
  const mine = currentLang();
  if (!["ko", "en"].includes(mine.split("-")[0])) opts.push({ v: mine, label: `🌐 ${langName(mine)}` });
  if (!opts.some((o) => o.v === trMode)) opts.push({ v: trMode, label: `🌐 ${langName(trMode)}` });
  return opts;
}
function renderTrSeg() {
  $("#tr-seg").innerHTML = trOptions().map((o) =>
    `<button type="button" class="${o.v === trMode ? "on" : ""}" data-tr="${esc(o.v)}">${esc(o.label)}</button>`).join("");
}
$("#tr-seg").onclick = (e) => {
  const b = e.target.closest("[data-tr]"); if (!b) return;
  trMode = b.dataset.tr; store.set("tr-mode", trMode);
  renderTrSeg(); renderFeed();
};

let trRun = 0;
async function applyTranslations() {
  const run = ++trRun;
  const els = $$("#feed-list .qb[data-orig]");
  const status = $("#tr-status");
  if (trMode === "orig" || !els.length) { status.textContent = ""; return; }
  const tl = trMode, queue = [...els];
  let done = 0, failed = 0;
  const worker = async () => {
    while (queue.length && run === trRun) {
      const el = queue.shift(), orig = el.dataset.orig;
      el.classList.add("tr-loading");
      try {
        const r = await translateText(orig, tl);
        if (run !== trRun || !el.isConnected) return;
        const same = !r.src || r.src.split("-")[0] === tl.split("-")[0];
        el.innerHTML = same
          ? `<span translate="no" class="notranslate">${esc(orig)}</span>`
          : `<span translate="no" class="notranslate">${esc(r.t)}</span><span class="orig">원문 · ${esc(langName(r.src))}<br><span translate="no" class="notranslate">${esc(orig)}</span></span>`;
      } catch (err) {
        console.error(err); failed++;
        if (el.isConnected) el.innerHTML = `${esc(orig)}<span class="orig">⚠️ 번역하지 못했어요 (인터넷 연결 확인)</span>`;
      } finally {
        el.classList.remove("tr-loading");
        done++;
        if (run === trRun) status.textContent = done < els.length ? `번역 중… ${done}/${els.length}` : failed ? `⚠️ ${failed}개 번역 실패` : "✅ 번역 완료";
      }
    }
  };
  await Promise.all([1, 2, 3, 4].map(worker));
}

/* ============ 🧭 탭 ============ */
function showTab(name) {
  $$(".view").forEach((v) => v.classList.add("hidden"));
  $(`#view-${name}`).classList.remove("hidden");
  $$(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (name === "board" && !store.get("hide-guide-board")) openGuide("board");
}
$$(".tab").forEach((t) => (t.onclick = () => showTab(t.dataset.tab)));

/* ============ 📖 사용설명서 (바텀 시트) ============ */
function matrixHTML({ selected = null, interactive = false, midx = "" } = {}) {
  const cells = MATRIX_ORDER.map((i) => {
    const t = TYPES[i];
    const cls = ["type-opt", selected === i ? "selected" : "", selected !== null && selected !== i ? "dim" : ""].join(" ");
    const tag = interactive ? "button" : "div";
    return `<${tag} class="${cls}" style="${typeStyle(i)}" ${interactive ? `data-type="${i}" data-midx="${midx}" type="button"` : ""}>
      <span class="emo">${t.emoji}</span><b>${t.key}</b><small>${t.short}</small></${tag}>`;
  });
  return `<div class="matrix ${interactive ? "" : "static"}">${cells.join("")}</div>
  <div class="axis-note">⬆️ 위쪽 줄: 내 문화를 지켜요 · ➡️ 오른쪽 줄: 한국 문화와 어울려요</div>`;
}

const LANG_SLIDE = () => `<div class="big-emo">🌐</div><h2>내 나라 말로 보기</h2>
       <p class="lang-ask">🙏 <b>자신이 편한 모국어나 영어로 선택해서 진행해 주세요.</b></p>
       <p>언어를 누르면 화면이 바로 바뀌어요. 앱으로 설치해도 똑같이 쓸 수 있어요.</p>
       ${langGridHTML()}
       <p class="muted">언제든 오른쪽 위 🌐 버튼으로 바꿀 수 있어요. 답은 내 나라 말로 써도 괜찮아요.</p>`;

const GUIDES = {
  intro: {
    flag: "hide-guide-intro",
    slides: [
      `<div class="big-emo">👋</div><h2>문화적응 여정에 오신 걸 환영해요!</h2>
       <p>낯선 나라에서 살아가는 <b>나의 마음</b>을 돌아보고,<br>다른 사람들과 <b>이야기를 나누는</b> 곳이에요.</p>
       <p>🌐 <b>자신이 편한 모국어나 영어로 선택해서 진행해 주세요.</b><br>다음 장에서 방법을 알려 드릴게요.</p>`,
      LANG_SLIDE,
      `<div class="big-emo">🧭</div><h2>4가지 마음의 모양</h2>
       <p>존 베리의 문화적응 모델이에요. 좋고 나쁨은 없어요!</p>${matrixHTML()}`,
      `<div class="big-emo">✍️</div><h2>이렇게 참여해요</h2>
       <ol class="steps">
         <li><span>🙋</span><div><b>누구인지 고르고 이름 쓰기</b></div></li>
         <li><span>🧭</span><div><b>지금 마음과 가까운 유형 고르기</b><br>모르겠으면 🤔 간단 체크!</div></li>
         <li><span>💬</span><div><b>질문 4개에 답하기</b> (짧아도 OK)</div></li>
         <li><span>💌</span><div><b>공유하기</b> → 모두의 이야기에 올라가요</div></li>
       </ol>`,
      ...(IS_STANDALONE ? [] : [`<div class="big-emo">📲</div><h2>앱처럼 설치할 수 있어요</h2>
       <div class="install-box" style="text-align:left">
         <div>🌐 <b>크롬(Chrome)</b>으로 열어 주세요</div>
         <div><b>🍎 아이폰</b><br>공유 버튼 ⬆️ → <b>홈 화면에 추가</b></div>
         <div><b>🤖 안드로이드</b><br>⋮ 메뉴 → <b>앱 설치</b></div>
       </div>
       <p>아래 <b>📖 설명서</b> 탭에서 언제든 다시 볼 수 있어요.</p>`])
    ]
  },
  lang: { flag: "hide-guide-lang-never", slides: [LANG_SLIDE], noHide: true },
  board: {
    flag: "hide-guide-board",
    slides: [
      `<div class="big-emo">💌</div><h2>모두의 이야기 사용법</h2>
       <p>참여한 모든 사람의 결과가 이곳에 모여요.</p>
       <ul class="bullets">
         <li>🔎 위쪽 <b>유형 버튼</b> → 같은 유형 이야기만 모아 보기</li>
         <li>❤️ <b>공감</b> → 마음 전하기 (한 이야기에 한 번)</li>
         <li>⋯ 버튼 → <b>✏️ 수정하기</b> / <b>🗑️ 삭제하기</b></li>
         <li>🏡 가족 이야기는 하나의 카드로 모여요</li>
         <li>🔤 <b>이야기 번역</b> → 한국어 / English를 누르면 여러 언어의 답변이 한 언어로 모여요</li>
         <li>✍️ 내 이야기를 올리려면 아래 <b>🧭 여정</b> 탭으로!</li>
       </ul>
       <p class="muted">🤝 다른 사람의 이야기는 따뜻한 마음으로 읽어 주세요.</p>`
    ]
  }
};

// onClose: 창이 닫힐 때(✕·바깥 누르기·버튼) 한 번 실행할 일
let sheetOnClose = null;
function openSheet(html, onClose = null) {
  $("#sheet-body").innerHTML = `<button type="button" class="sheet-x" aria-label="닫기">✕</button><div class="grabber"></div>${html}`;
  $("#sheet").classList.remove("hidden");
  $("#sheet-body").scrollTop = 0;
  sheetOnClose = onClose;
}
function closeSheet() {
  $("#sheet").classList.add("hidden");
  const f = sheetOnClose; sheetOnClose = null;
  if (f) f();
}
$("#sheet").addEventListener("click", (e) => { if (e.target.id === "sheet" || e.target.closest(".sheet-x")) closeSheet(); });

function openGuide(name) {
  const g = GUIDES[name];
  let i = 0;
  const render = () => {
    const last = i === g.slides.length - 1;
    const s = g.slides[i];
    openSheet(`
      <div class="slide">${typeof s === "function" ? s() : s}</div>
      ${g.slides.length > 1 ? `<div class="dots">${g.slides.map((_, k) => `<i class="${k === i ? "on" : ""}"></i>`).join("")}</div>` : ""}
      <div class="sheet-foot">
        ${g.noHide ? "<span></span>" : `<label><input type="checkbox" id="g-hide" ${store.get(g.flag) ? "checked" : ""}> 다시 보지 않기</label>`}
        <div style="display:flex;gap:6px">
          ${i > 0 ? `<button class="btn btn-ghost" id="g-prev">이전</button>` : ""}
          <button class="btn btn-primary" id="g-next">${g.noHide ? "확인 👍" : last ? "시작하기 👍" : "다음 ▶"}</button>
        </div>
      </div>`);
    if ($("#g-hide")) $("#g-hide").onchange = (e) => (e.target.checked ? store.set(g.flag, true) : store.del(g.flag));
    $("#g-next").onclick = () => { if (last) closeSheet(); else { i++; render(); } };
    if ($("#g-prev")) $("#g-prev").onclick = () => { i--; render(); };
  };
  render();
}
$$("[data-open-guide]").forEach((b) => (b.onclick = () => openGuide(b.dataset.openGuide)));
$("#help-top").onclick = () => openGuide($("#view-board").classList.contains("hidden") ? "intro" : "board");
$("#guide-matrix").innerHTML = matrixHTML();

/* ============ STEP 1: 누구? ============ */
$("#avatar-row").innerHTML = FAMILY_AVATARS.map((a, i) =>
  `<button type="button" class="avatar-opt ${a === selectedAvatar ? "selected" : ""}" data-av="${i}"><span>${a.e}</span>${a.label}</button>`).join("");
$("#avatar-row").onclick = (e) => {
  const b = e.target.closest(".avatar-opt"); if (!b) return;
  selectedAvatar = FAMILY_AVATARS[+b.dataset.av];
  $$(".avatar-opt").forEach((x) => x.classList.toggle("selected", x === b));
};

$$(".who-opt").forEach((opt) => (opt.onclick = () => {
  $$(".who-opt").forEach((o) => o.classList.remove("selected"));
  opt.classList.add("selected");
  selectedChar = opt.dataset.char;
  $("#family-form").classList.toggle("hidden", selectedChar !== "가족");
}));

function addMember() {
  const name = $("#user-name").value.trim();
  if (!name) { toast("✏️ 이름을 먼저 써 주세요"); $("#user-name").focus(); return false; }
  let role = "", emoji = CHAR_EMOJI[selectedChar];
  if (selectedChar === "가족") {
    const fam = $("#family-name-in").value.trim();
    if (!fam) { toast("🏡 가족 이름을 써 주세요 (예: 차무희네 가족)"); $("#family-name-in").focus(); return false; }
    currentFamilyName = fam;
    const r = $("#role-in").value.trim();
    role = [selectedAvatar.g, r].filter(Boolean).join(" / ");
    emoji = selectedAvatar.e;
  }
  members.push({ name, char: selectedChar, role, emoji, typeIdx: null, tempAnswers: ["", "", "", ""] });
  $("#user-name").value = ""; $("#role-in").value = "";
  renderChips(); saveDraft();
  toast(`${emoji} ${name} 님이 추가됐어요`);
  return true;
}
function renderChips() {
  $("#member-chips").innerHTML = members.map((m, i) =>
    `<span class="chip">${memberEmoji(m)} <b>${esc(m.name)}</b>${m.role ? ` <small>(${esc(m.role)})</small>` : ""}<button data-rm="${i}" aria-label="빼기">✕</button></span>`).join("");
}
$("#member-chips").onclick = (e) => {
  const b = e.target.closest("[data-rm]"); if (!b) return;
  members.splice(+b.dataset.rm, 1); renderChips(); saveDraft();
};
$("#add-btn").onclick = addMember;
$("#user-name").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); addMember(); } });

$("#start-btn").onclick = () => {
  if ($("#user-name").value.trim() && !addMember()) return;
  if (!members.length) { toast("✏️ 이름을 먼저 써 주세요"); $("#user-name").focus(); return; }
  goWrite();
};

function goStep(id) {
  ["#step-who", "#step-write", "#step-done"].forEach((s) => $(s).classList.toggle("hidden", s !== id));
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function goWrite() { goStep("#step-write"); renderSurvey(); }

/* ============ STEP 2: 유형 + 질문 ============ */
function renderSurvey() {
  $("#family-edit").innerHTML = currentFamilyName !== "" ? `
    <label class="field" style="margin:12px 0 0">
      <span class="field-label">🏡 우리 가족 이름 (고칠 수 있어요)</span>
      <input type="text" id="edit-family-name" value="${esc(currentFamilyName)}">
    </label>` : "";

  $("#member-cards").innerHTML = members.map((m, i) => `
    <div class="member-card" data-midx="${i}">
      <div class="m-head">
        <div class="avatar">${memberEmoji(m)}</div>
        <div class="inputs">
          <input type="text" data-f="name" data-midx="${i}" value="${esc(m.name)}" placeholder="이름">
          ${m.char === "가족" ? `<input type="text" data-f="role" data-midx="${i}" value="${esc(m.role)}" placeholder="역할 (예: 여성 / 첫째 딸)">` : ""}
        </div>
      </div>
      <div class="sec-title">🧭 지금 나의 마음은 어디에 가까운가요?</div>
      ${matrixHTML({ selected: m.typeIdx, interactive: true, midx: i })}
      ${m.typeIdx !== null
        ? `<div class="bubble" style="${typeStyle(m.typeIdx)}">${TYPES[m.typeIdx].emoji} <b>${TYPES[m.typeIdx].key}</b> <small>(${TYPES[m.typeIdx].en})</small><br>${TYPES[m.typeIdx].desc}</div>`
        : `<div class="bubble">👆 카드를 하나 눌러 주세요</div>`}
      <button class="link-btn" data-check="${i}" type="button">🤔 잘 모르겠어요 → 간단 체크 해보기</button>
      <div class="qa-write">
        ${QUESTIONS.map((q, qi) => `
          <div class="q"><span class="qi">${q.icon}</span>Q${qi + 1}. ${q.q}</div>
          <textarea data-f="ans" data-midx="${i}" data-qidx="${qi}" placeholder="${esc(q.ph)}">${esc(m.tempAnswers?.[qi] || "")}</textarea>`).join("")}
      </div>
    </div>`).join("");

  $("#share-btn").textContent = editingPostId ? "✏️ 수정 완료하기" : "💌 이야기 공유하기";
}

// 입력할 때마다 상태에 바로 저장 (다시 그려도 글이 사라지지 않아요)
$("#step-write").addEventListener("input", (e) => {
  const el = e.target;
  if (el.id === "edit-family-name") { currentFamilyName = el.value; saveDraft(); return; }
  const m = members[el.dataset.midx]; if (!m) return;
  if (el.dataset.f === "name") m.name = el.value;
  if (el.dataset.f === "role") m.role = el.value;
  if (el.dataset.f === "ans") m.tempAnswers[+el.dataset.qidx] = el.value;
  saveDraft();
});
$("#member-cards").addEventListener("click", (e) => {
  const t = e.target.closest(".type-opt[data-type]");
  if (t) { members[+t.dataset.midx].typeIdx = +t.dataset.type; saveDraft(); renderSurvey(); return; }
  const c = e.target.closest("[data-check]");
  if (c) openQuickCheck(+c.dataset.check);
});

// 🤔 간단 체크: 베리의 두 질문
function openQuickCheck(midx) {
  const ans = { a: null, b: null };
  const render = () => {
    let result = "";
    if (ans.a !== null && ans.b !== null) {
      const idx = ans.a ? (ans.b ? 3 : 1) : (ans.b ? 2 : 0);
      const t = TYPES[idx];
      result = `<div class="bubble" style="${typeStyle(idx)}">${t.emoji} 나는 <b>${t.key}</b>에 가까워요!<br>${t.desc}</div>
        <button class="btn btn-primary" id="qc-ok" data-idx="${idx}">이 유형으로 할게요 👍</button>`;
    }
    openSheet(`
      <div class="slide" style="min-height:0">
        <div class="big-emo">🤔</div><h2>간단 체크</h2>
        <p>두 질문에 답하면 가까운 유형을 알려 드려요.</p>
        <div class="check-q">❶ <b>내 나라의 언어·음식·전통</b>을 지키는 것이 나에게 중요해요.
          <div class="yn"><button data-q="a" data-v="1" class="${ans.a === true ? "selected" : ""}">👍 그래요</button><button data-q="a" data-v="0" class="${ans.a === false ? "selected" : ""}">👎 아니에요</button></div></div>
        <div class="check-q">❷ <b>한국 사람들과 어울리고</b> 한국 문화를 배우고 싶어요.
          <div class="yn"><button data-q="b" data-v="1" class="${ans.b === true ? "selected" : ""}">👍 그래요</button><button data-q="b" data-v="0" class="${ans.b === false ? "selected" : ""}">👎 아니에요</button></div></div>
        ${result}
        <button class="btn btn-ghost" id="qc-close">닫기</button>
      </div>`);
    $$("#sheet-body .yn button").forEach((b) => (b.onclick = () => { ans[b.dataset.q] = b.dataset.v === "1"; render(); }));
    $("#qc-close").onclick = closeSheet;
    if ($("#qc-ok")) $("#qc-ok").onclick = () => { members[midx].typeIdx = +$("#qc-ok").dataset.idx; saveDraft(); closeSheet(); renderSurvey(); };
  };
  render();
}

$("#back-btn").onclick = () => {
  if (editingPostId) {
    if (!confirm("수정을 그만둘까요? 바꾼 내용은 저장되지 않아요.")) return;
    resetJourney(); return;
  }
  goStep("#step-who"); renderChips();
};

/* ============ 💾 임시 저장 ============ */
function saveDraft() {
  if (editingPostId) return;
  store.set("draft", { members, currentFamilyName });
}
function loadDraft() {
  const d = store.get("draft");
  if (d?.members?.length) {
    members = d.members; currentFamilyName = d.currentFamilyName || "";
    renderChips();
    toast("📝 쓰던 이야기를 불러왔어요");
  }
}

/* ============ 💌 공유 ============ */
$("#share-btn").onclick = async () => {
  const missing = members.findIndex((m) => m.typeIdx === null);
  if (missing !== -1) {
    toast(`🧭 ${members[missing].name || "참여자"} 님의 유형을 골라 주세요`);
    $(`.member-card[data-midx="${missing}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  if (members.some((m) => !m.name.trim())) { toast("✏️ 이름이 비어 있어요"); return; }

  const btn = $("#share-btn");
  btn.disabled = true; btn.textContent = "⏳ 올리는 중…";
  try {
    currentFamilyName = currentFamilyName.trim();
    const finalData = members.map((m) => ({
      name: m.name.trim(), char: m.char, role: (m.role || "").trim(), emoji: memberEmoji(m),
      type: TYPES[m.typeIdx].key, answers: m.tempAnswers.map((a) => (a || "").trim()),
      lang: m.lang || currentLang()
    }));

    // 같은 가족 후보 찾기 → 합치기 전에 물어봐요
    let target = null;
    if (currentFamilyName) {
      const match = allPosts.find((p) => p.familyName && p.id !== editingPostId && isSameFamily(p.familyName, currentFamilyName));
      if (match && confirm(`🏡 이미 '${match.familyName}' 이야기가 있어요.\n이 가족과 하나로 합칠까요?\n\n(아니요를 누르면 새 가족 카드로 올라가요)`)) target = match;
    }

    let msg;
    if (target) {
      await updateDoc(doc(db, "posts", target.id), { family: [...(target.family || []), ...finalData], timestamp: new Date() });
      if (editingPostId) await deleteDoc(doc(db, "posts", editingPostId));
      msg = `'${target.familyName}' 가족과 하나로 합쳐졌어요! 🏡`;
    } else if (editingPostId) {
      await updateDoc(doc(db, "posts", editingPostId), { family: finalData, familyName: currentFamilyName, timestamp: new Date() });
      msg = "수정이 완료됐어요! ✏️";
    } else {
      await addDoc(postsCol, { familyName: currentFamilyName, family: finalData, timestamp: new Date() });
      msg = "이야기가 광장에 올라갔어요!";
    }

    $("#done-title").textContent = msg;
    $("#done-summary").innerHTML = finalData.map((m) => {
      const i = typeIndex(m.type);
      return `<span class="badge" style="${typeStyle(i)}">${esc(m.emoji)} ${esc(m.name)} · ${TYPES[i].emoji} <span>${m.type}</span></span>`;
    }).join("");
    store.del("draft");
    members = []; currentFamilyName = ""; editingPostId = null;
    renderChips();
    goStep("#step-done");
  } catch (err) {
    console.error(err);
    toast(err?.code === "permission-denied" ? "🔒 서버가 잠겨 있어 올릴 수 없어요. 관리자에게 알려 주세요" : "😢 오류가 났어요. 인터넷 연결을 확인하고 다시 눌러 주세요");
  } finally {
    btn.disabled = false;
    btn.textContent = editingPostId ? "✏️ 수정 완료하기" : "💌 이야기 공유하기";
  }
};

function resetJourney() {
  members = []; currentFamilyName = ""; editingPostId = null;
  $("#family-name-in").value = "";
  renderChips(); goStep("#step-who");
}
$("#new-story").onclick = resetJourney;
$("#go-board").onclick = () => { resetJourney(); showTab("board"); };
$("#ext-share").onclick = async () => {
  const data = { title: "문화적응 여정 ✈️", text: "나의 문화적응 이야기를 나눴어요. 당신의 이야기도 들려주세요 💌", url: location.href.split("#")[0] };
  try {
    if (navigator.share) await navigator.share(data);
    else { await navigator.clipboard.writeText(data.url); toast("🔗 링크를 복사했어요"); }
  } catch {}
};

/* ============ 📰 이야기 광장 ============ */
onSnapshot(query(postsCol, orderBy("timestamp", "desc")), (snap) => {
  allPosts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  renderFeed();
}, (err) => {
  console.error(err);
  $("#board-count").textContent = err?.code === "permission-denied"
    ? "🔒 서버가 잠겨 있어 이야기를 불러올 수 없어요. 관리자에게 알려 주세요. (Firebase 보안 규칙)"
    : "😢 이야기를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.";
});

function renderFilters() {
  const counts = [0, 0, 0, 0];
  let people = 0;
  allPosts.forEach((p) => (p.family || []).forEach((m) => { people++; const i = typeIndex(m.type); if (i >= 0) counts[i]++; }));
  $("#board-count").innerHTML = `지금까지 <b>${people}명</b>이 <b>${allPosts.length}개</b>의 이야기를 나눴어요 🙌`;
  $("#filter-chips").innerHTML =
    `<button class="f-chip ${filterType === "all" ? "active" : ""}" data-filter="all">✨ 전체 <b>${people}</b></button>` +
    TYPES.map((t, i) => `<button class="f-chip ${filterType === t.key ? "active" : ""}" data-filter="${t.key}">${t.emoji} <span>${t.key}</span> <b>${counts[i]}</b></button>`).join("");
}
$("#filter-chips").onclick = (e) => {
  const b = e.target.closest("[data-filter]"); if (!b) return;
  filterType = b.dataset.filter; visibleCount = 5; renderFeed();
};

function renderFeed() {
  renderFilters();
  const list = filterType === "all" ? allPosts : allPosts.filter((p) => (p.family || []).some((m) => m.type === filterType));
  if (!list.length) {
    $("#feed-list").innerHTML = `<div class="card empty"><div class="big-emo">🌱</div>
      <p>${filterType === "all" ? "아직 이야기가 없어요.<br>첫 번째 이야기를 들려주세요!" : "이 유형의 이야기는 아직 없어요."}</p></div>`;
    $("#more-btn").classList.add("hidden");
    return;
  }
  const liked = store.get("liked", []);
  $("#feed-list").innerHTML = list.slice(0, visibleCount).map((post) => `
    <article class="post">
      ${post.familyName ? `<div class="fam-banner">🏡 <span translate="no" class="notranslate">${esc(post.familyName)}</span></div>` : ""}
      ${(post.family || []).map((m) => {
        const i = typeIndex(m.type);
        const answers = (m.answers || []).map((a, qi) => a ? `
          <div class="qa"><div class="ql">${QUESTIONS[qi]?.icon || "💭"} ${esc(QUESTIONS[qi]?.q || "")}</div><div class="qb" data-orig="${esc(a)}"${m.lang ? ` lang="${esc(m.lang)}"` : ""}>${esc(a)}</div></div>` : "").join("");
        return `<div class="member">
          <div class="member-top">
            <div class="avatar sm">${esc(memberEmoji(m))}</div>
            <div class="who"><b translate="no" class="notranslate">${esc(m.name)}</b>${m.role ? `<small>${esc(m.role)}</small>` : ""}${m.lang && m.lang !== "ko" ? `<br><span class="lang-tag">🌐 ${esc(langName(m.lang))}로 작성</span>` : ""}</div>
            ${i >= 0 ? `<span class="badge" style="${typeStyle(i)}">${TYPES[i].emoji} <span>${TYPES[i].key}</span></span>` : ""}
          </div>
          ${answers || `<div class="no-ans">💭 작성된 답변이 없어요</div>`}
        </div>`;
      }).join("")}
      <div class="post-foot">
        <button class="heart ${liked.includes(post.id) ? "on" : ""}" data-heart="${post.id}">${liked.includes(post.id) ? "❤️" : "🤍"} 공감 ${post.hearts || 0}</button>
        <span class="date">${fmtDate(post.timestamp)}</span>
        <button class="more" data-more="${post.id}" aria-label="더보기">⋯</button>
      </div>
    </article>`).join("");
  $("#more-btn").classList.toggle("hidden", list.length <= visibleCount);
  applyTranslations();
}
$("#more-btn").onclick = () => { visibleCount += 5; renderFeed(); };

$("#feed-list").addEventListener("click", async (e) => {
  const h = e.target.closest("[data-heart]");
  if (h) {
    const id = h.dataset.heart, liked = store.get("liked", []);
    if (liked.includes(id)) { toast("❤️ 이미 공감했어요"); return; }
    try {
      await updateDoc(doc(db, "posts", id), { hearts: increment(1) });
      store.set("liked", [...liked, id]);
      toast("❤️ 마음을 전했어요");
    } catch (err) { console.error(err); toast("😢 공감을 보내지 못했어요"); }
    return;
  }
  const m = e.target.closest("[data-more]");
  if (m) openPostMenu(m.dataset.more);
});

function openPostMenu(id) {
  openSheet(`
    <h3 style="text-align:center">이 이야기를…</h3>
    <div class="action-list">
      <button class="btn btn-soft" id="pm-edit">✏️ 수정하기</button>
      <button class="btn btn-danger" id="pm-del">🗑️ 삭제하기 (비밀번호 필요)</button>
      <button class="btn btn-ghost" id="pm-cancel">취소</button>
    </div>`);
  $("#pm-cancel").onclick = closeSheet;
  $("#pm-edit").onclick = () => { closeSheet(); startEdit(id); };
  $("#pm-del").onclick = async () => {
    closeSheet();
    const pw = prompt("🔐 삭제하려면 비밀번호를 입력하세요.");
    if (pw === null || pw === "") return;
    if (pw !== ADMIN_PW) { toast("🔐 비밀번호가 맞지 않아요"); return; }
    try { await deleteDoc(doc(db, "posts", id)); toast("🗑️ 삭제했어요"); }
    catch (err) { console.error(err); toast("😢 삭제하지 못했어요"); }
  };
}

function startEdit(id) {
  const p = allPosts.find((x) => x.id === id); if (!p) return;
  editingPostId = id;
  currentFamilyName = p.familyName || "";
  members = (p.family || []).map((m) => ({
    name: m.name || "", char: m.char, role: m.role || "", emoji: m.emoji || "",
    typeIdx: typeIndex(m.type) >= 0 ? typeIndex(m.type) : null,
    tempAnswers: [0, 1, 2, 3].map((k) => m.answers?.[k] || ""),
    lang: m.lang || ""
  }));
  showTab("journey");
  goWrite();
  toast("✏️ 고친 다음 아래 '수정 완료하기'를 눌러 주세요");
}

/* ============ 🔐 관리자 ============ */
$("#del-all").onclick = async () => {
  if ($("#admin-pw").value !== ADMIN_PW) { toast("🔐 비밀번호가 맞지 않아요"); return; }
  if (!confirm("⚠️ 모든 이야기를 지울까요? 되돌릴 수 없어요.")) return;
  try {
    const s = await getDocs(postsCol);
    await Promise.all(s.docs.map((d) => deleteDoc(doc(db, "posts", d.id))));
    $("#admin-pw").value = "";
    toast("🗑️ 전체 삭제를 마쳤어요");
  } catch (err) { console.error(err); toast("😢 삭제 중 오류가 났어요"); }
};

/* ============ 📲 앱 설치 (PWA) ============ */
// 서비스 워커를 바로 등록해요 (크롬은 이게 준비돼야 '설치 가능' 신호를 보내요)
if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(console.error);
// 크롬·엣지·삼성 인터넷은 버튼 한 번으로 설치할 수 있어요. 아이폰·사파리·파이어폭스는 안 돼요.
const CAN_AUTO_INSTALL = "onbeforeinstallprompt" in window && !IS_IOS;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault(); deferredInstall = e;
  $("#install-btn").classList.remove("hidden");
});
window.addEventListener("appinstalled", () => {
  deferredInstall = null;
  $("#install-btn").classList.add("hidden");
  toast("📲 설치됐어요! 홈 화면의 ✈️ 아이콘으로 열어 주세요");
});
async function runInstall() {
  if (!deferredInstall) return false;
  const ev = deferredInstall;
  ev.prompt();
  const { outcome } = await ev.userChoice;
  deferredInstall = null;
  $("#install-btn").classList.add("hidden");
  if (outcome === "accepted") toast("📲 설치하고 있어요!");
  return true;
}
$("#install-btn").onclick = runInstall;

// 설치 창이 아직 준비되지 않았으면 조금 기다려요 (크롬이 페이지를 연 직후 알려 줘요)
function waitInstallPrompt(ms) {
  if (deferredInstall) return Promise.resolve(deferredInstall);
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(deferredInstall), ms);
    window.addEventListener("beforeinstallprompt", () => { clearTimeout(t); setTimeout(() => resolve(deferredInstall)); }, { once: true });
  });
}
function manualInstallSheet(next) {
  openSheet(`
    <div class="slide" style="min-height:0">
      <div class="big-emo">📲</div><h2>이렇게 설치해 주세요</h2>
      ${IS_IOS
        ? `<p>아이폰은 버튼 하나로 바로 설치할 수 없어서<br>아래 순서대로 눌러 주세요.</p>
           <div class="install-box" style="text-align:left">
             <div><b>1.</b> 화면의 <b>공유 버튼 ⬆️</b> 누르기</div>
             <div><b>2.</b> <b>홈 화면에 추가 ➕</b> 누르기</div>
             <div><b>3.</b> 오른쪽 위 <b>추가</b> 누르기</div>
           </div>`
        : CAN_AUTO_INSTALL
        ? `<p>지금은 크롬이 바로 설치를 허락하지 않았어요.<br>이미 설치되어 있거나 <b>시크릿 창</b>이면 이렇게 돼요.<br>아래 방법으로 설치해 주세요.</p>`
          + `<div class="install-box" style="text-align:left">
             <div><b>📱 휴대폰</b><br>오른쪽 위 <b>⋮ 메뉴</b> → <b>앱 설치</b> 또는 <b>홈 화면에 추가</b></div>
             <div><b>💻 컴퓨터</b><br>주소창 오른쪽 <b>설치 아이콘</b> 또는 <b>⋮ 메뉴</b> → <b>앱 설치</b></div>
           </div>`
        : `<p>이 브라우저는 버튼 하나로 바로 설치할 수 없어요.<br><b>크롬(Chrome)</b>으로 열면 바로 설치돼요.</p>
           <div class="install-box" style="text-align:left">
             <div><b>📱 휴대폰</b><br>오른쪽 위 <b>⋮ 메뉴</b> → <b>앱 설치</b> 또는 <b>홈 화면에 추가</b></div>
             <div><b>💻 컴퓨터</b><br>주소창 오른쪽 <b>설치 아이콘</b> 또는 <b>⋮ 메뉴</b> → <b>앱 설치</b></div>
           </div>`}
      <p class="muted">이미 설치했다면 홈 화면의 ✈️ 아이콘으로 열어 주세요.</p>
      <button class="btn btn-primary" id="mi-ok">알겠어요 👍</button>
    </div>`, next);
  $("#mi-ok").onclick = closeSheet;
}
// 처음 들어왔을 때: "앱으로 설치할까요?" → 아니오: 그냥 넘어가요 / 예: 바로 설치해요
function askInstall(next) {
  openSheet(`
    <div class="slide" style="min-height:0">
      <div class="big-emo">📲</div><h2>앱으로 설치할까요?</h2>
      <p>홈 화면(컴퓨터는 바탕화면)에 ✈️ 아이콘이 생겨서<br>다음부터 바로 열 수 있어요.</p>
      <div class="ask-btns">
        <button class="btn btn-soft" id="ia-no">아니오</button>
        <button class="btn btn-primary" id="ia-yes">예 👍</button>
      </div>
    </div>`, () => { store.set("install-asked", true); next(); });
  $("#ia-no").onclick = closeSheet;
  $("#ia-yes").onclick = () => {
    store.set("install-asked", true);
    // 설치 창은 '예'를 누른 그 순간에 바로 띄워야 해요 (기다리면 브라우저가 막아요)
    if (deferredInstall) { closeSheet(); runInstall(); }
    else if (CAN_AUTO_INSTALL) waitInstallSheet(next);
    else manualInstallSheet(next);
  };
}
// 크롬이 아직 설치 준비 중이면: 준비될 때까지 기다렸다가 '지금 설치하기' 버튼을 보여 줘요
function waitInstallSheet(next) {
  openSheet(`
    <div class="slide" style="min-height:0">
      <div class="big-emo">⏳</div><h2 id="iw-title">설치를 준비하고 있어요</h2>
      <p id="iw-text">잠시만 기다려 주세요…</p>
      <button class="btn btn-primary" id="iw-go" disabled>⏳ 준비 중…</button>
    </div>`, next);
  const btn = $("#iw-go");
  waitInstallPrompt(10000).then((ev) => {
    if (!btn.isConnected) return;
    if (!ev) { manualInstallSheet(next); return; }
    $("#iw-title").textContent = "설치 준비가 끝났어요!";
    $("#iw-text").textContent = "아래 버튼을 누르면 바로 설치돼요.";
    btn.disabled = false; btn.textContent = "📲 지금 설치하기";
    btn.onclick = () => { closeSheet(); runInstall(); };
  });
}

/* ============ 🚀 시작 ============ */
applyLangAttrs();
renderTrSeg();
$("#guide-lang-grid").outerHTML = langGridHTML();
loadDraft();
const startIntro = () => { if (!store.get("hide-guide-intro")) openGuide("intro"); };
// 처음 들어오면 항상 바로 물어봐요 (설치한 앱으로 열었거나 이미 답했으면 안 물어요)
if (IS_STANDALONE || store.get("install-asked")) startIntro();
else askInstall(startIntro);
if (uiLang !== "ko") translatePage();
