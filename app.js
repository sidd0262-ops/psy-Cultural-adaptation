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
// 관리자는 '삭제'만 할 수 있어요 (내용 보기·공개로 바꾸기는 글쓴이만)
const ADMIN_PW = "0530";

/* ============ 📚 내용 ============ */
// 문화적응 4단계. 순서는 기존 데이터와 같아요: 0 주변화, 1 분리, 2 동화, 3 통합
const TYPES = [
  { key: "주변화", en: "Marginalization", emoji: "🍂", short: "어디에도 속하지 않는 느낌", tc: "#7B68C8", tbg: "#F0EDFB",
    desc: "우리 나라 문화도, 한국 문화도 나와 조금 멀게 느껴져요. 내가 어디에 속하는지 헷갈릴 수 있어요. 이런 마음도 자연스러워요. 혼자가 아니에요." },
  { key: "분리", en: "Separation", emoji: "🏠", short: "내 문화를 꼭 지켜요", tc: "#E07B1F", tbg: "#FFF1E2",
    desc: "우리 나라 문화를 가장 소중하게 지켜요. 한국 문화와는 아직 조금 거리를 두고 있어요." },
  { key: "동화", en: "Assimilation", emoji: "🦎", short: "한국 문화에 맞춰가요", tc: "#1E9E5A", tbg: "#E3F8EC",
    desc: "한국 생활에 맞춰 살아가려고 해요. 우리 나라 문화보다 한국 문화를 더 많이 따르고 있어요." },
  { key: "통합", en: "Integration", emoji: "🌈", short: "두 문화 모두 소중해요", tc: "#2F7FE0", tbg: "#E6F1FF",
    desc: "우리 나라 문화도 지키고, 한국 문화도 즐겨요. 두 문화를 함께 가지고 살아가요." }
];
// 막대 위의 자리: 1(주변화) ~ 4(통합), 0.5 단위. 1.5·2.5·3.5는 두 단계 사이(경계)예요.
const POSITIONS = [1, 1.5, 2, 2.5, 3, 3.5, 4];
const posLeft = (p) => 12.5 + (p - 1) * 25;              // 막대에서의 가로 위치(%)
const posStage = (p) => Math.min(3, Math.floor(p) - 1);  // 예전 방식 저장용 (경계면 앞 단계)
const isHalf = (p) => p % 1 !== 0;

// 나의 이야기 질문 (2026-11 리뉴얼). 답은 순서(0~3)로 저장돼요.
const QUESTIONS = [
  { title: "한국행을 결심하던 날", q: "한국에 오기로 마음먹었을 때, 어떤 마음이었나요? 무엇을 기대했나요?",
    ph: "예: 설레기도 하고, 걱정도 많이 됐어요…" },
  { title: "나를 버티게 해준 것", q: "한국 생활이 지칠 때 나를 다시 일어서게 하는 것은 무엇인가요?",
    ph: "예: 아이들의 웃음, 고향 음식, 친구…" },
  { title: "내 마음에 남은 한마디", q: "누군가에게 들은 말 중에 가장 힘이 되었던 말은 무엇인가요?",
    ph: "예: \"괜찮아, 잘하고 있어\"" },
  { title: "가장 어려웠던 순간", q: "한국 생활에서 가장 어려웠던 순간은 언제였나요? 그때 나에게 가장 필요했던 것은 무엇이었나요?",
    ph: "예: 병원에서 말이 통하지 않았을 때, 함께 가 줄 사람이 필요했어요" }
];
// 예전 버전(v1) 이야기는 그때 질문 제목으로 보여 줘요
const OLD_TITLES = ["한국에 오게 된 이유", "나를 버티게 해준 것", "나에게 힘이 되는 응원의 한마디", "그만두고 싶었던 순간"];
const qTitles = (post) => (post.v >= 2 ? QUESTIONS.map((q) => q.title) : OLD_TITLES);

/* ============ 🎨 아바타 (성별 없이 모양·색·표정·꾸미기로 만들어요) ============ */
const INK = "#2B2D42";
const AV_KINDS = [
  { id: "short", label: "짧은 머리", hair: true }, { id: "long", label: "긴 머리", hair: true },
  { id: "curly", label: "곱슬머리", hair: true }, { id: "ghost", label: "유령" }, { id: "alien", label: "외계인" },
  { id: "cat", label: "고양이" }, { id: "bear", label: "곰" }, { id: "bunny", label: "토끼" }, { id: "robot", label: "로봇" }
];
const AV_COLORS = ["#FFE3CC", "#F6C9A3", "#E2A97E", "#C1855A", "#8D5A3B", "#5E3B26",
  "#FFFFFF", "#FFD166", "#FF9EC4", "#8FD694", "#7CC6FE", "#B79CFF", "#FF9F6B", "#A7B0BE"];
const AV_ACCENTS = ["#2E2420", "#6B4128", "#E3A93C", "#C8553D", "#9AA5B1", "#F2F2F2", "#6C63FF", "#FF6F9F", "#3FB58A", "#4D9DFF"];
const AV_FACES = [
  { id: "smile", label: "웃음" }, { id: "grin", label: "활짝" }, { id: "wink", label: "윙크" }, { id: "calm", label: "차분" },
  { id: "wow", label: "깜짝" }, { id: "shy", label: "수줍음" }, { id: "sad", label: "시무룩" }
];
const AV_ITEMS = [
  { id: "none", label: "없음" }, { id: "beanie", label: "털모자" }, { id: "ribbon", label: "리본" }, { id: "glasses", label: "안경" },
  { id: "crown", label: "왕관" }, { id: "flower", label: "꽃" }, { id: "phones", label: "헤드폰" }
];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomAvatar = () => ({ k: pick(AV_KINDS).id, c: pick(AV_COLORS.slice(0, 6)), h: pick(AV_ACCENTS), f: "smile", a: "none" });
function normAv(av) {
  const ok = (list, v, d) => (list.some((x) => (x.id ?? x) === v) ? v : d);
  return {
    k: ok(AV_KINDS, av?.k, "short"), c: ok(AV_COLORS, av?.c, "#F6C9A3"), h: ok(AV_ACCENTS, av?.h, "#2E2420"),
    f: ok(AV_FACES, av?.f, "smile"), a: ok(AV_ITEMS, av?.a, "none")
  };
}

// 모든 캐릭터는 같은 그림체(둥근 얼굴 + 진한 테두리)로 그려요
function avatarSVG(raw) {
  const { k, c, h, f, a } = normAv(raw);
  const S = `stroke="${INK}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"`;
  let back = "", head = `<circle cx="50" cy="55" r="30" fill="${c}" ${S}/>`, mid = "", front = "";
  switch (k) {
    case "short":
      front = `<path d="M20 54 C18 28 36 20 50 20 C66 20 82 28 80 54 C76 44 70 40 62 37 C56 44 42 44 35 37 C28 41 23 46 20 54 Z" fill="${h}" ${S}/>`;
      break;
    case "long":
      back = `<path d="M18 52 C16 24 34 18 50 18 C66 18 84 24 82 52 L84 90 Q50 96 16 90 Z" fill="${h}" ${S}/>`;
      front = `<path d="M21 50 C22 30 36 22 50 22 C64 22 78 30 79 50 C72 40 62 35 50 35 C38 35 28 40 21 50 Z" fill="${h}" ${S}/>`;
      break;
    case "curly":
      back = [[24, 46], [27, 32], [37, 22], [50, 18], [63, 22], [73, 32], [76, 46]]
        .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="11" fill="${h}" ${S}/>`).join("");
      front = [[36, 31], [50, 27], [64, 31]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="8.5" fill="${h}" ${S}/>`).join("");
      break;
    case "ghost":
      head = `<path d="M21 90 L21 52 C21 20 79 20 79 52 L79 90 L69.5 83 L60 90 L50 83 L40 90 L30.5 83 Z" fill="${c}" ${S}/>`;
      break;
    case "alien":
      back = `<path d="M39 32 L30 13 M61 32 L70 13" fill="none" ${S}/>
        <circle cx="30" cy="12" r="5" fill="${h}" ${S}/><circle cx="70" cy="12" r="5" fill="${h}" ${S}/>`;
      head = `<ellipse cx="50" cy="56" rx="33" ry="28" fill="${c}" ${S}/>`;
      break;
    case "cat":
      back = `<path d="M23 44 L26 14 L47 29 Z M77 44 L74 14 L53 29 Z" fill="${c}" ${S}/>
        <path d="M29 35 L30 22 L40 29 Z M71 35 L70 22 L60 29 Z" fill="${h}"/>`;
      front = `<path d="M20 61 L33 63 M20 68 L33 67 M80 61 L67 63 M80 68 L67 67" ${S} stroke-width="1.8" fill="none"/>`;
      break;
    case "bear":
      back = `<circle cx="27" cy="31" r="11" fill="${c}" ${S}/><circle cx="73" cy="31" r="11" fill="${c}" ${S}/>
        <circle cx="27" cy="31" r="5" fill="${h}"/><circle cx="73" cy="31" r="5" fill="${h}"/>`;
      mid = `<ellipse cx="50" cy="67" rx="12" ry="8.5" fill="#fff" opacity=".6"/>`;
      break;
    case "bunny":
      back = `<ellipse cx="38" cy="21" rx="8" ry="19" fill="${c}" ${S}/><ellipse cx="62" cy="21" rx="8" ry="19" fill="${c}" ${S}/>
        <ellipse cx="38" cy="22" rx="3.5" ry="12" fill="${h}"/><ellipse cx="62" cy="22" rx="3.5" ry="12" fill="${h}"/>`;
      break;
    case "robot":
      back = `<path d="M50 26 L50 13" ${S}/><circle cx="50" cy="10" r="5" fill="${h}" ${S}/>
        <rect x="13" y="48" width="9" height="15" rx="3" fill="${h}" ${S}/><rect x="78" y="48" width="9" height="15" rx="3" fill="${h}" ${S}/>`;
      head = `<rect x="20" y="25" width="60" height="58" rx="16" fill="${c}" ${S}/>`;
      break;
  }
  const dot = (x, r = 3.6) => `<circle cx="${x}" cy="55" r="${r}" fill="${INK}"/>`;
  const arcUp = (x) => `<path d="M${x - 5} 56 Q${x} 50 ${x + 5} 56" fill="none" ${S}/>`;
  const arcDown = (x) => `<path d="M${x - 5} 54 Q${x} 58 ${x + 5} 54" fill="none" ${S}/>`;
  const blush = (o = 0.5) => `<ellipse cx="33" cy="66" rx="5" ry="3" fill="#FF7F9F" opacity="${o}"/><ellipse cx="67" cy="66" rx="5" ry="3" fill="#FF7F9F" opacity="${o}"/>`;
  const smileMouth = `<path d="M43 65 Q50 71 57 65" fill="none" ${S}/>`;
  const faces = {
    smile: dot(39) + dot(61) + smileMouth + blush(0.35),
    grin: arcUp(39) + arcUp(61) + `<path d="M41 63 Q50 63 59 63 Q58 75 50 75 Q42 75 41 63 Z" fill="#7A2E3A" ${S}/>` + blush(0.35),
    wink: dot(39) + arcUp(61) + smileMouth + blush(0.35),
    calm: arcDown(39) + arcDown(61) + `<path d="M46 66 Q50 68.5 54 66" fill="none" ${S}/>`,
    wow: dot(39, 4.2) + dot(61, 4.2) + `<ellipse cx="50" cy="68" rx="4" ry="5" fill="${INK}"/>`,
    shy: dot(39, 3) + dot(61, 3) + `<path d="M46 66 Q50 69 54 66" fill="none" ${S}/>` + blush(0.7),
    sad: dot(39) + dot(61) + `<path d="M43 69 Q50 63 57 69" fill="none" ${S}/>`
  };
  const items = {
    none: "",
    beanie: `<path d="M24 40 C24 15 76 15 76 40 Z" fill="#FF7A7A" ${S}/><rect x="21" y="35" width="58" height="9" rx="4.5" fill="#FFB3B3" ${S}/><circle cx="50" cy="14" r="5" fill="#fff" ${S}/>`,
    ribbon: `<path d="M71 30 L60 22 L60 38 Z M71 30 L82 22 L82 38 Z" fill="#FF6F9F" ${S}/><circle cx="71" cy="30" r="3.5" fill="#FF6F9F" ${S}/>`,
    glasses: `<circle cx="39" cy="55" r="9" fill="rgba(255,255,255,.25)" ${S}/><circle cx="61" cy="55" r="9" fill="rgba(255,255,255,.25)" ${S}/><path d="M48 55 L52 55" ${S}/>`,
    crown: `<path d="M33 32 L35 14 L44 24 L50 10 L56 24 L65 14 L67 32 Z" fill="#FFD166" ${S}/>`,
    flower: [0, 72, 144, 216, 288].map((d) => {
      const r = (d * Math.PI) / 180;
      return `<circle cx="${(29 + Math.cos(r) * 5.5).toFixed(1)}" cy="${(31 + Math.sin(r) * 5.5).toFixed(1)}" r="4.6" fill="#fff" stroke="${INK}" stroke-width="1.8"/>`;
    }).join("") + `<circle cx="29" cy="31" r="3.4" fill="#FFD166" stroke="${INK}" stroke-width="1.8"/>`,
    phones: `<path d="M21 56 C21 21 79 21 79 56" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><rect x="13" y="47" width="12" height="20" rx="5" fill="#6C63FF" ${S}/><rect x="75" y="47" width="12" height="20" rx="5" fill="#6C63FF" ${S}/>`
  };
  return `<svg class="av" viewBox="0 0 100 100" aria-hidden="true">${back}${head}${mid}${faces[f]}${front}${items[a]}</svg>`;
}
// 예전 이야기는 이모지 아바타예요
const avatarOf = (m) => (m?.avatar ? avatarSVG(m.avatar) : `<span>${esc(m?.emoji || "🙂")}</span>`);

/* ============ 🧠 상태 ============ */
const freshMe = () => ({ name: "", avatar: randomAvatar(), pos: null, answers: ["", "", "", ""] });
let me = freshMe();
let editingPostId = null;   // 수정 중인 이야기 (생일 4자리 확인을 마친 경우만)
let specStage = null;       // 단계 이름을 눌러서 보고 있는 설명 (null이면 내 위치 설명)
let allPosts = [];
let filterType = "all";
let deckIdx = 0;
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
  toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}
const typeStyle = (i) => `--tc:${TYPES[i].tc};--tbg:${TYPES[i].tbg}`;
const typeIndex = (key) => TYPES.findIndex((t) => t.key === key);
function fmtDate(ts) {
  try {
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    if (isNaN(d)) return "";
    return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
  } catch { return ""; }
}
// 이야기 속 한 사람의 위치 (예전 이야기는 단계 이름만 있어서 그 단계 자리로 봐요)
function memberPos(m) {
  if (typeof m?.pos === "number" && POSITIONS.includes(m.pos)) return m.pos;
  const i = typeIndex(m?.type);
  return i >= 0 ? i + 1 : null;
}
// 경계(.5)에 있으면 양쪽 단계 모두에 들어가요
const inStage = (m, i) => { const p = memberPos(m); return p !== null && Math.abs(p - (i + 1)) <= 0.5; };
function posBadge(p) {
  if (p === null) return "";
  if (!isHalf(p)) { const i = p - 1; return `<span class="pos-badge" style="${typeStyle(i)}">${TYPES[i].emoji} <span>${TYPES[i].key}</span></span>`; }
  const a = Math.floor(p) - 1, b = a + 1;
  return `<span class="pos-badge" style="${typeStyle(a)}">${TYPES[a].emoji} <span>${TYPES[a].key}</span> · ${TYPES[b].emoji} <span>${TYPES[b].key}</span> <span>사이</span></span>`;
}
const miniSpec = (p) => `<div class="mini-spec">${TYPES.map((_, i) => `<i style="${typeStyle(i)}"></i>`).join("")}${p !== null ? `<span class="dot" style="left:${posLeft(p)}%"></span>` : ""}</div>
  <div class="mini-labels">${TYPES.map((t) => `<span>${t.key}</span>`).join("")}</div>`;

// 🔐 내 글 비밀번호 = 생일 4자리 (월월일일, 예: 0828). 그대로 저장하지 않고 암호처럼 바꿔서 저장해요.
const PIN_RE = /^(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])$/;
const randomSalt = () => [...crypto.getRandomValues(new Uint8Array(8))].map((b) => b.toString(16).padStart(2, "0")).join("");
async function hashPin(pin, salt) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${pin}`));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const pinInputHTML = (id) => `<input type="tel" inputmode="numeric" maxlength="4" class="pin-input notranslate" translate="no" id="${id}" placeholder="0828" autocomplete="off">`;
function bindPinInput(el) { el.addEventListener("input", () => { el.value = el.value.replace(/\D/g, "").slice(0, 4); }); }

// 홈 화면에 설치한 앱으로 열었는지
const IS_STANDALONE = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const IS_IOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

/* ============ 🌐 언어 (한국어 · English) ============ */
const UI_LANGS = [["ko", "한국어"], ["en", "English"]];
let uiLang = store.get("ui-lang", "ko");
if (!UI_LANGS.some(([c]) => c === uiLang)) { uiLang = "en"; store.set("ui-lang", uiLang); }
const langGridHTML = () => `<div class="lang-grid notranslate" translate="no">${UI_LANGS.map(([c, n]) =>
  `<button type="button" data-ui-lang="${c}" class="${c === uiLang ? "on" : ""}">${n}</button>`).join("")}</div>`;
const currentLang = () => uiLang;
function langName(code) {
  try { return new Intl.DisplayNames([uiLang === "ko" ? "ko" : "en"], { type: "language" }).of(code) || code; } catch { return code; }
}

/* ============ 🔤 이야기 번역 ============ */
// 답변을 하나씩 따로 보내 언어를 각각 알아낸 뒤 번역해요.
let trMode = store.get("tr-mode", "orig");
if (!["orig", "ko", "en"].includes(trMode)) trMode = "orig";
const trCache = new Map(store.get("tr-cache", []));
let saveTimer;
function saveTrCache() { clearTimeout(saveTimer); saveTimer = setTimeout(() => store.set("tr-cache", [...trCache.entries()].slice(-2500)), 400); }
const trKey = (tl, sl, text) => (sl === "auto" ? `${tl}|${text}` : `${tl}|${sl}>${text}`);
const inflight = new Map();

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
// 화면의 글자를 하나씩 찾아 고른 언어로 바꿔요. 새로 생기는 글자도 자동으로 바꿔요.
const tState = new WeakMap(), aState = new WeakMap();
const TR_ATTRS = ["placeholder", "aria-label"];
function skipEl(el) {
  const c = el.closest('[translate="no"], .notranslate, script, style, textarea, svg');
  return !!c && c !== document.documentElement;
}
function collectItems() {
  const items = [];
  const add = (st, valid, set, auto, el) => {
    if (!/\p{L}/u.test(st.orig)) return;
    const m = st.orig.match(/^(\s*)([\s\S]*?)(\s*)$/);
    items.push({ st, valid, set, auto, el, pre: m[1], core: m[2], post: m[3] });
  };
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const p = n.parentElement;
    if (!p || skipEl(p) || p.closest("[data-tr-dict]")) continue;
    let st = tState.get(n);
    if (!st || n.nodeValue !== st.shown) { st = { orig: n.nodeValue, shown: n.nodeValue }; tState.set(n, st); }
    add(st, () => tState.get(n) === st && n.nodeValue === st.shown, (s) => { st.shown = s; n.nodeValue = s; }, !!p.closest(".qb"), p);
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
      add(st, () => m[a] === st && el.getAttribute(a) === st.shown, (s) => { st.shown = s; el.setAttribute(a, s); }, false, null);
    });
  });
  return items;
}
/* ============ 📚 검수한 번역 사전 (i18n/<언어>.json) ============ */
// 사전에 있는 문장은 사전대로, 없는 글자만 Google 번역으로 바로 번역해요. (원문 목록: i18n/source.json)
const dicts = new Map();
async function loadDict(tl) {
  if (!dicts.has(tl)) dicts.set(tl, fetch(`i18n/${tl}.json`).then((r) => (r.ok ? r.json() : null))
    .then((o) => (o ? new Map(Object.entries(o)) : null)).catch(() => null));
  return dicts.get(tl);
}
const normKey = (s) => String(s).replace(/\s+/g, " ").trim();
const HANGUL = /[가-힣]/;
const INLINE_TAGS = new Set(["B", "STRONG", "SMALL", "SPAN", "BR", "I", "EM"]);
function isBlockOnly(el) {
  if (!el.firstElementChild || ["SCRIPT", "STYLE", "TEXTAREA"].includes(el.tagName)) return false;
  for (const c of el.querySelectorAll("*")) {
    if (!INLINE_TAGS.has(c.tagName) || c.id || c.matches(".qb")) return false;
  }
  return HANGUL.test(el.textContent);
}
const isSentenceBlock = (el) => isBlockOnly(el) && !(el.parentElement && isBlockOnly(el.parentElement));
const bState = new WeakMap();
function applyDictBlocks(tl, dict) {
  for (const el of document.body.querySelectorAll("*")) {
    if (skipEl(el)) continue;
    const st = bState.get(el);
    if (st && el.dataset.trDict) {
      if (el.innerHTML === st.shown) {
        const want = tl === "ko" ? null : dict?.get(st.key);
        if (want == null) { el.innerHTML = st.orig; delete el.dataset.trDict; bState.delete(el); }
        else if (want !== st.tr) { el.innerHTML = want; st.tr = want; st.shown = el.innerHTML; }
        continue;
      }
      delete el.dataset.trDict; bState.delete(el);
    }
    if (tl === "ko" || !dict || el.closest("[data-tr-dict]") || !isSentenceBlock(el)) continue;
    const key = normKey(el.innerHTML), tr = dict.get(key);
    if (tr == null) continue;
    const orig = el.innerHTML;
    el.innerHTML = tr;
    el.dataset.trDict = "1";
    bState.set(el, { orig, key, tr, shown: el.innerHTML });
  }
}
function seedDictTexts(tl, dict) {
  if (!dict || dict.__seeded) return;
  for (const [k, v] of dict) if (!k.includes("<")) trCache.set(trKey(tl, "ko", k), { t: v, src: "ko" });
  dict.__seeded = true;
}
async function translatePage() {
  const tl = uiLang;
  const dict = tl === "ko" ? null : await loadDict(tl);
  if (uiLang !== tl) return;
  applyDictBlocks(tl, dict);
  const items = collectItems();
  if (tl === "ko") { items.forEach((it) => it.st.shown !== it.st.orig && it.set(it.st.orig)); return; }
  const apply = (it, t) => { if (uiLang === tl && it.valid()) { const s = it.pre + t + it.post; if (s !== it.st.shown) it.set(s); } };
  const ui = items.filter((it) => !it.auto), answers = items.filter((it) => it.auto);
  seedDictTexts(tl, dict);
  await seedTypeNames(tl);
  const ps = translateMany(ui.map((it) => it.core), tl, "ko").map((p, i) => p.then((r) => apply(ui[i], r.t)));
  answers.forEach((it) => ps.push(translateText(it.core, tl).then((r) => {
    const same = !r.src || r.src.split("-")[0] === tl.split("-")[0];
    apply(it, same ? it.core : r.t);
  })));
  return Promise.allSettled(ps);
}
// 단계 이름(동화·분리…)은 한 단어라 잘못 번역되기 쉬워서, 영어 이름(Assimilation…)을 써요
async function seedTypeNames(tl) {
  if (TYPES.every((t) => trCache.has(trKey(tl, "ko", t.key)))) return;
  const rs = await Promise.allSettled(translateMany(TYPES.map((t) => t.en), tl, "en"));
  rs.forEach((r, i) => r.status === "fulfilled" && trCache.set(trKey(tl, "ko", TYPES[i].key), { t: r.value.t, src: "ko" }));
}
// 🧺 번역할 글자 모으기 (개발용: 주소 끝에 ?harvest)
if (new URLSearchParams(location.search).has("harvest")) {
  const seen = new Map();
  const ctxOf = (el) => normKey((el.closest("p, li, h1, h2, h3, dt, dd, summary, button, label, .toast, div") || el).textContent).slice(0, 300);
  window.__harvest = () => {
    for (const el of document.body.querySelectorAll("*")) {
      if (skipEl(el) || el.closest("[data-tr-dict], .qb, .f-chip, #board-count, .post-head") || !isSentenceBlock(el)) continue;
      const k = normKey(el.innerHTML);
      if (!seen.has(k)) seen.set(k, { key: k, kind: "html", ctx: ctxOf(el.parentElement || el) });
    }
    const inBlock = (el) => { for (let a = el; a && a !== document.body; a = a.parentElement) if (isSentenceBlock(a)) return true; return false; };
    collectItems().forEach((it) => {
      if (it.auto || !HANGUL.test(it.core) || (it.el && inBlock(it.el))) return;
      const k = normKey(it.core);
      if (!seen.has(k)) seen.set(k, { key: k, kind: "text", ctx: it.el ? ctxOf(it.el) : "(입력칸 안내 글자)" });
    });
    return seen.size;
  };
  window.__harvestDump = () => [...seen.values()];
}

let pageTimer;
new MutationObserver(() => {
  if (uiLang === "ko") return;
  clearTimeout(pageTimer); pageTimer = setTimeout(translatePage, 60);
}).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: TR_ATTRS });

function applyLangAttrs() {
  const h = document.documentElement;
  h.lang = uiLang;
  if (uiLang === "ko") h.removeAttribute("translate"); else h.setAttribute("translate", "no");
}
async function setUiLang(code) {
  if (code === uiLang) return;
  uiLang = code; store.set("ui-lang", code);
  applyLangAttrs();
  $$("[data-ui-lang]").forEach((b) => b.classList.toggle("on", b.dataset.uiLang === code));
  await translatePage();
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-ui-lang]");
  if (b) setUiLang(b.dataset.uiLang);
});

function renderTrSeg() {
  const opts = [{ v: "orig", label: "원문" }, { v: "ko", label: "한국어" }, { v: "en", label: "English" }];
  $("#tr-seg").innerHTML = opts.map((o) =>
    `<button type="button" class="${o.v === trMode ? "on" : ""}" data-tr="${o.v}">${o.label}</button>`).join("");
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
        if (el.isConnected) el.innerHTML = `${esc(orig)}<span class="orig">번역하지 못했어요 (인터넷 연결 확인)</span>`;
      } finally {
        el.classList.remove("tr-loading");
        done++;
        if (run === trRun) status.textContent = done < els.length ? `번역 중… ${done}/${els.length}` : failed ? `${failed}개 번역 실패` : "번역 완료";
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
  if (name === "board") { syncDeck(); if (!store.get("hide-guide-board-v2")) openGuide("board"); }
}
$$(".tab").forEach((t) => (t.onclick = () => showTab(t.dataset.tab)));

/* ============ 📖 안내 문구 ============ */
const typeListHTML = () => `<ul class="type-list">${TYPES.map((t, k) =>
  `<li style="${typeStyle(k)}"><b>${t.emoji} ${t.key}</b><small> (${t.en})</small><br>${t.desc}</li>`).join("")}</ul>`;

// 💡 알아 두세요 (안내 = 노란 상자)
const SPECTRUM_HTML = `<div class="info-box">
  <div class="info-title">💡 알아 두세요</div>
  <ul class="dot-list">
    <li>4단계에 <b>좋고 나쁜 것은 없어요.</b></li>
    <li><span>문화적응은 하나로 딱 정해지지 않아요. 생활 속에서 <b>여러 모습이 섞여</b> 나타나요.</span>
      <div class="info-ex"><span class="ex-label">예</span>라면이나 불고기 같은 한국 음식은 좋아하지만, K-POP 같은 음악은 싫어해요.</div></li>
    <li>그래서 <b>나의 지금 마음 확인하기</b>는 지금 내가 가장 많이 느끼는 마음을 알아보는 거예요. 마음은 시간이 지나면 바뀔 수 있어요.</li>
  </ul>
</div>`;

const INSTALL_FLOW_HTML = `<ol class="flow">
  <li><b>크롬(Chrome) 앱</b>으로 이 링크를 열어요.</li>
  <li><span><b>홈 화면에 추가</b>해요. 내 휴대폰에 맞는 방법을 따라 해요.</span>
    <div class="branch">
      <div><div class="branch-h">아이폰</div><span>공유 버튼 ⬆️ → <b>홈 화면에 추가</b> → <b>추가</b></span></div>
      <div><div class="branch-h">안드로이드</div><span>오른쪽 위 ⋮ 메뉴 → <b>앱 설치</b></span></div>
    </div>
    <small class="muted">아이폰에서 메뉴가 안 보이면 최신 버전으로 업데이트하거나 Safari로 열어 같은 방법으로 해 주세요.</small>
  </li>
</ol>`;

// 💌 모두의 이야기 사용법: 왼쪽 = 화면의 버튼 모양, 오른쪽 = 설명
const BOARD_HOWTO_HTML = `<div class="howto">
  <div class="howto-group">이야기 보기</div>
  <div class="howto-row"><span class="ui-chip">◀ ▶</span><span>옆으로 밀거나 눌러서 이야기를 <b>한 장씩</b> 넘겨 봐요.</span></div>
  <div class="howto-row"><span class="ui-chip">🍂 주변화 3</span><span>같은 단계의 이야기만 모아 봐요. 두 단계 사이에 있는 이야기는 양쪽 모두에 나와요.</span></div>
  <div class="howto-row"><span class="ui-chip">한국어 · English</span><span>여러 나라 언어로 쓴 답변을 <b>한 언어로</b> 바꿔 봐요. 원문도 함께 보여요.</span></div>
  <div class="howto-group">마음 나누기</div>
  <div class="howto-row"><span class="ui-chip">🤍 공감</span><span>마음을 전해요. 이야기 하나에 한 번 누를 수 있어요.</span></div>
  <div class="howto-row"><span class="ui-chip">⋯</span><span>내 이야기라면 <b>생일 4자리</b>를 넣고 다시 보기·수정·공개 바꾸기·삭제를 할 수 있어요.</span></div>
</div>
<div class="info-box">
  <div class="info-title">💡 알아 두세요</div>
  <ul class="dot-list">
    <li>비공개 이야기는 글이 흐리게 가려져 있어요. 쓴 사람만 생일 4자리로 볼 수 있어요.</li>
    <li>관리자는 이야기를 <b>삭제만</b> 할 수 있어요.</li>
  </ul>
</div>`;

const GUIDES = {
  intro: {
    flag: "hide-guide-intro-v2",
    slides: [() => `<div class="big-emo">👋</div><h2>문화적응 여정에 오신 걸 환영해요!</h2>
       <p>낯선 나라에서 살아가는 <b>나의 마음</b>을 돌아보고,<br>다른 사람들과 <b>이야기를 나누는</b> 곳이에요.</p>
       <p class="lang-ask">편한 언어를 골라 주세요${uiLang === "ko" ? ` <span class="notranslate muted" translate="no">· Choose your language</span>` : ""}</p>
       ${langGridHTML()}`]
  },
  lang: {
    flag: "hide-guide-lang-never", noHide: true,
    slides: [() => `<div class="big-emo">🌐</div><h2>편한 언어 고르기</h2>
       <p>한국어와 영어 중에서 골라 주세요. 화면이 바로 바뀌어요.</p>${langGridHTML()}`]
  },
  board: {
    flag: "hide-guide-board-v2",
    slides: [`<div class="big-emo">💌</div><h2>모두의 이야기 사용법</h2>
       <p>참여한 모든 사람의 이야기가 이곳에 모여요.</p>
       ${BOARD_HOWTO_HTML}
       <p class="muted">다른 사람의 이야기는 따뜻한 마음으로 읽어 주세요.</p>`]
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

function openGuide(name, after = null) {
  const g = GUIDES[name];
  let i = 0;
  const render = () => {
    const last = i === g.slides.length - 1;
    const s = g.slides[i];
    openSheet(`
      <div class="slide">${typeof s === "function" ? s() : s}</div>
      <div class="sheet-foot">
        ${g.noHide ? "<span></span>" : `<label><input type="checkbox" id="g-hide" ${store.get(g.flag) ? "checked" : ""}> 다시 보지 않기</label>`}
        <div style="display:flex;gap:6px">
          ${i > 0 ? `<button class="btn btn-ghost" id="g-prev">이전</button>` : ""}
          <button class="btn btn-primary" id="g-next">${g.noHide ? "확인" : last ? "시작하기" : "다음 ▶"}</button>
        </div>
      </div>`, after);
    if ($("#g-hide")) $("#g-hide").onchange = (e) => (e.target.checked ? store.set(g.flag, true) : store.del(g.flag));
    $("#g-next").onclick = () => { if (last) closeSheet(); else { i++; render(); } };
    if ($("#g-prev")) $("#g-prev").onclick = () => { i--; render(); };
  };
  render();
}
$$("[data-open-guide]").forEach((b) => (b.onclick = () => openGuide(b.dataset.openGuide)));
$("#help-top").onclick = () => ($("#view-board").classList.contains("hidden") ? showTab("guide") : openGuide("board"));
$("#guide-types").innerHTML = typeListHTML() + SPECTRUM_HTML;
$("#board-howto").innerHTML = BOARD_HOWTO_HTML;
$("#install-flow").innerHTML = INSTALL_FLOW_HTML;
$("#spectrum-note").innerHTML = SPECTRUM_HTML;

/* ============ STEP 1: 아바타 만들기 ============ */
function renderBuilder() {
  const av = (me.avatar = normAv(me.avatar));
  const kind = AV_KINDS.find((x) => x.id === av.k);
  const keep = Object.fromEntries($$("#av-options .av-opts").map((r) => [r.dataset.row, r.scrollLeft]));
  const optRow = (row, title, list, make, cls = "") => `<div class="av-row"><div class="av-row-h">${title}</div>
    <div class="av-opts ${cls}" data-row="${row}">${list.map(make).join("")}</div></div>`;
  $("#av-preview").innerHTML = avatarSVG(av);
  $("#av-options").innerHTML =
    optRow("k", "모양", AV_KINDS, (x) => `<button type="button" class="av-opt ${x.id === av.k ? "on" : ""}" data-av="k" data-v="${x.id}" aria-label="${x.label}" title="${x.label}">${avatarSVG({ ...av, k: x.id })}</button>`) +
    optRow("c", "색", AV_COLORS, (x) => `<button type="button" class="av-sw ${x === av.c ? "on" : ""}" style="background:${x}" data-av="c" data-v="${x}" aria-label="색 ${x}"></button>`, "sw") +
    optRow("h", kind?.hair ? "머리 색" : "포인트 색", AV_ACCENTS, (x) => `<button type="button" class="av-sw ${x === av.h ? "on" : ""}" style="background:${x}" data-av="h" data-v="${x}" aria-label="색 ${x}"></button>`, "sw") +
    optRow("f", "표정", AV_FACES, (x) => `<button type="button" class="av-opt ${x.id === av.f ? "on" : ""}" data-av="f" data-v="${x.id}" aria-label="${x.label}" title="${x.label}">${avatarSVG({ ...av, f: x.id })}</button>`) +
    optRow("a", "꾸미기", AV_ITEMS, (x) => `<button type="button" class="av-opt ${x.id === av.a ? "on" : ""}" data-av="a" data-v="${x.id}" aria-label="${x.label}" title="${x.label}">${avatarSVG({ ...av, a: x.id })}</button>`);
  $$("#av-options .av-opts").forEach((r) => { if (keep[r.dataset.row]) r.scrollLeft = keep[r.dataset.row]; });
  $("#user-name").value = me.name;
  $("#start-btn").textContent = editingPostId ? "다음" : "여정 시작하기";
}
$("#av-options").onclick = (e) => {
  const b = e.target.closest("[data-av]"); if (!b) return;
  me.avatar[b.dataset.av] = b.dataset.v;
  renderBuilder(); saveDraft();
};
$("#user-name").addEventListener("input", (e) => { me.name = e.target.value; saveDraft(); });
$("#user-name").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); $("#start-btn").click(); } });
$("#start-btn").onclick = () => {
  me.name = $("#user-name").value.trim();
  if (!me.name) { toast("별명을 먼저 써 주세요"); $("#user-name").focus(); return; }
  saveDraft(); goWrite();
};

function goStep(id) {
  ["#step-avatar", "#step-write", "#step-done"].forEach((s) => $(s).classList.toggle("hidden", s !== id));
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function goWrite() { goStep("#step-write"); renderWrite(); }

/* ============ STEP 2: 나의 지금 마음 확인하기 ============ */
function renderWrite() {
  $("#edit-banner").classList.toggle("hidden", !editingPostId);
  $("#me-row").innerHTML = `<div class="av-sm">${avatarSVG(me.avatar)}</div><b class="notranslate" translate="no">${esc(me.name)}</b>`;
  renderSpectrum();
  $("#qa-write").innerHTML = QUESTIONS.map((q, qi) => `
    <div class="qw">
      <div class="qw-h"><span class="qw-n">${qi + 1}</span><span class="qw-title">${q.title}</span></div>
      <p class="qw-q">${q.q}</p>
      <textarea data-qidx="${qi}" placeholder="${esc(q.ph)}">${esc(me.answers[qi] || "")}</textarea>
    </div>`).join("") + `
    <details class="q-about">
      <summary>이 질문들은 무엇을 살펴보나요?</summary>
      <dl class="def-list">
        <div><dt>이주 동기</dt><dd>내가 한국에 오게 된 마음 (1번)</dd></div>
        <div><dt>심리적 자원</dt><dd>다른 문화 속에서 살아가도록 나를 도와준 힘 (2·3번)</dd></div>
        <div><dt>필요했던 것</dt><dd>힘들 때 나에게 부족했던 도움 (4번)</dd></div>
      </dl>
    </details>`;
  $("#share-btn").textContent = editingPostId ? "수정한 이야기 올리기" : "이야기 올리기";
}
$("#qa-write").addEventListener("input", (e) => {
  const t = e.target.closest("textarea[data-qidx]"); if (!t) return;
  me.answers[+t.dataset.qidx] = t.value; saveDraft();
});

// 🧭 4단계 막대: 막대를 누르거나 밀면 내 아바타가 그 자리(0.5 단위)로 움직여요
function renderSpectrum() {
  const p = me.pos;
  $("#spectrum").innerHTML = `<div class="spec">
    <div class="spec-track" id="spec-track">
      <div class="spec-zones">${TYPES.map((_, i) => `<i style="${typeStyle(i)}"></i>`).join("")}</div>
      <div class="spec-stops">${POSITIONS.map((x) => `<button type="button" class="spec-stop ${isHalf(x) ? "half" : ""} ${x === p ? "on" : ""}" style="left:${posLeft(x)}%" data-pos="${x}" aria-label="${isHalf(x) ? `${TYPES[Math.floor(x) - 1].key}와 ${TYPES[Math.floor(x)].key} 사이` : TYPES[x - 1].key}"></button>`).join("")}</div>
      <div class="spec-avatar ${p === null ? "wait" : ""}" id="spec-avatar" style="left:${posLeft(p ?? 2.5)}%">${avatarSVG(me.avatar)}</div>
    </div>
    <div class="spec-labels">${TYPES.map((t, i) => `<button type="button" class="spec-label ${specStage === i ? "on" : ""}" style="${typeStyle(i)}" data-stage="${i}"><span class="emo">${t.emoji}</span><b>${t.key}</b></button>`).join("")}</div>
    <p class="spec-help">단계 이름을 누르면 아래에 설명이 나와요.</p>
    <div id="spec-desc">${specDescHTML()}</div>
  </div>`;
}
function specDescHTML() {
  const p = me.pos;
  const one = (i, mine) => `<div class="spec-desc" style="${typeStyle(i)}"><div class="sd-h">${TYPES[i].emoji} ${TYPES[i].key} <small>(${TYPES[i].en})</small>${mine ? `<span class="sd-mine">내 위치</span>` : ""}</div>${TYPES[i].desc}</div>`;
  if (specStage !== null) return one(specStage, p === specStage + 1);
  if (p === null) return "";
  if (!isHalf(p)) return one(p - 1, true);
  const a = Math.floor(p) - 1, b = a + 1;
  return `<div class="spec-desc both" style="--a-bg:${TYPES[a].tbg};--b-bg:${TYPES[b].tbg};--a-c:${TYPES[a].tc}">
    <div class="sd-h">${TYPES[a].emoji} ${TYPES[a].key} · ${TYPES[b].emoji} ${TYPES[b].key} 사이<span class="sd-mine">내 위치</span></div>
    <p style="margin:2px 0 6px">두 단계의 마음이 함께 있어요.</p>
    <ul class="dot-list"><li><b>${TYPES[a].key}</b>: ${TYPES[a].short}</li><li><b>${TYPES[b].key}</b>: ${TYPES[b].short}</li></ul>
  </div>`;
}
function setPos(p, { final = true } = {}) {
  me.pos = p;
  const av = $("#spec-avatar");
  if (av) { av.style.left = `${posLeft(p)}%`; av.classList.remove("wait"); }
  $$("#spectrum .spec-stop").forEach((s) => s.classList.toggle("on", +s.dataset.pos === p));
  if (final) {
    specStage = null;
    $$("#spectrum .spec-label").forEach((l) => l.classList.remove("on"));
    $("#spec-desc").innerHTML = specDescHTML();
    saveDraft();
  }
}
function posFromX(clientX) {
  const r = $("#spec-track").getBoundingClientRect();
  const pct = ((clientX - r.left) / r.width) * 100;
  const p = Math.round((1 + (pct - 12.5) / 25) * 2) / 2;
  return Math.min(4, Math.max(1, p));
}
let dragging = false;
$("#spectrum").addEventListener("pointerdown", (e) => {
  const track = e.target.closest("#spec-track"); if (!track) return;
  dragging = true;
  track.setPointerCapture?.(e.pointerId);
  setPos(posFromX(e.clientX), { final: false });
});
$("#spectrum").addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const p = posFromX(e.clientX);
  if (p !== me.pos) setPos(p, { final: false });
});
const endDrag = () => { if (!dragging) return; dragging = false; if (me.pos !== null) setPos(me.pos); };
$("#spectrum").addEventListener("pointerup", endDrag);
$("#spectrum").addEventListener("pointercancel", endDrag);
$("#spectrum").addEventListener("click", (e) => {
  const s = e.target.closest("[data-pos]");
  if (s) { setPos(+s.dataset.pos); return; }
  const l = e.target.closest("[data-stage]");
  if (l) {
    const i = +l.dataset.stage;
    specStage = specStage === i ? null : i;
    $$("#spectrum .spec-label").forEach((x) => x.classList.toggle("on", +x.dataset.stage === specStage));
    $("#spec-desc").innerHTML = specDescHTML();
  }
});

$("#back-btn").onclick = () => { goStep("#step-avatar"); renderBuilder(); };
$("#edit-cancel").onclick = () => { resetJourney(); toast("수정을 그만뒀어요"); };

/* ============ 💾 임시 저장 ============ */
function saveDraft() { if (!editingPostId) store.set("draft-v2", me); }
function loadDraft() {
  const d = store.get("draft-v2");
  if (d && (d.name || d.answers?.some(Boolean))) {
    me = { ...freshMe(), ...d, avatar: normAv(d.avatar), answers: [0, 1, 2, 3].map((k) => d.answers?.[k] || "") };
    if (!POSITIONS.includes(me.pos)) me.pos = null;
    toast("쓰던 이야기를 불러왔어요");
  }
}

/* ============ 📮 이야기 올리기 (공유 창) ============ */
const peopleCount = () => allPosts.reduce((n, p) => n + (p.family || []).length, 0);
$("#share-btn").onclick = () => {
  if (!me.name.trim()) { toast("별명을 먼저 써 주세요"); goStep("#step-avatar"); renderBuilder(); return; }
  if (me.pos === null) {
    toast("막대에서 지금 내 위치를 골라 주세요");
    $("#spectrum").scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  openShareSheet();
};
function openShareSheet() {
  const editing = !!editingPostId;
  openSheet(`<div class="share-sheet">
    <h2>${editing ? "수정한 이야기를 올릴까요?" : "나의 이야기를 함께 나눌까요?"}</h2>
    <div class="share-msg">
      <p class="sm-strong">지금 ${peopleCount()}명의 이야기가 모여 있어요.</p>
      <p>내 이야기가 누군가에게는 '나만 그런 게 아니구나' 하는 위로가 돼요.</p>
      <p>이름 대신 아바타와 별명으로만 보여요.</p>
    </div>
    ${editing ? "" : `<div class="pin-field">
      <span class="field-label">내 글 비밀번호: 생일 4자리</span>
      <small>예: 8월 28일 → 0828. 나중에 내 이야기를 다시 보거나, 수정하거나, 공개로 바꿀 때 써요.</small>
      ${pinInputHTML("sh-pin")}
    </div>`}
    <button type="button" class="choice pub" data-vis="public"><b>예, 공개할게요</b><span>모두가 읽고 🤍 공감을 보낼 수 있어요.</span></button>
    <button type="button" class="choice" data-vis="private"><b>아니오, 비공개로 올릴게요</b><span>글은 흐리게 가려져서 다른 사람에게는 보이지 않아요. 아바타와 내 위치만 보여요. 생일 4자리로 나중에 다시 보거나 공개로 바꿀 수 있어요.</span></button>
    <p class="share-ok">어떤 선택이든 괜찮아요.</p>
    <button type="button" class="link-btn share-back" id="sh-back">◀ 다시 고치기</button>
  </div>`);
  if ($("#sh-pin")) bindPinInput($("#sh-pin"));
  $("#sh-back").onclick = closeSheet;
  $$(".share-sheet .choice").forEach((b) => (b.onclick = () => submitStory(b.dataset.vis === "private")));
}
async function submitStory(isPrivate) {
  const editing = !!editingPostId;
  let pin = "";
  if (!editing) {
    pin = $("#sh-pin").value;
    if (!PIN_RE.test(pin)) { toast("생일 4자리를 넣어 주세요 (예: 0828)"); $("#sh-pin").focus(); return; }
  }
  $$(".share-sheet .choice").forEach((b) => (b.disabled = true));
  try {
    const member = {
      name: me.name.trim(), avatar: normAv(me.avatar), pos: me.pos, type: TYPES[posStage(me.pos)].key,
      answers: me.answers.map((a) => (a || "").trim()), lang: currentLang()
    };
    if (editing) {
      await updateDoc(doc(db, "posts", editingPostId), { family: [member], private: isPrivate, v: 2 });
    } else {
      const pinSalt = randomSalt();
      await addDoc(postsCol, {
        v: 2, familyName: "", family: [member], private: isPrivate,
        pinSalt, pinHash: await hashPin(pin, pinSalt), hearts: 0, timestamp: new Date()
      });
    }
    closeSheet();
    $("#done-avatar").innerHTML = avatarSVG(member.avatar);
    $("#done-title").textContent = editing ? "수정을 마쳤어요!" : isPrivate ? "비공개로 올라갔어요" : "이야기가 올라갔어요!";
    $("#done-text").textContent = isPrivate
      ? "글은 다른 사람에게 보이지 않고, 아바타와 내 위치만 함께 있어요. 생일 4자리로 언제든 다시 볼 수 있어요."
      : "모두의 이야기에서 다른 사람들의 이야기도 읽어 보세요.";
    store.del("draft-v2");
    me = freshMe(); editingPostId = null; specStage = null;
    deckIdx = 0;
    goStep("#step-done");
  } catch (err) {
    console.error(err);
    $$(".share-sheet .choice").forEach((b) => (b.disabled = false));
    toast(err?.code === "permission-denied" ? "서버가 잠겨 있어 올릴 수 없어요. 관리자에게 알려 주세요" : "오류가 났어요. 인터넷 연결을 확인하고 다시 눌러 주세요");
  }
}

function resetJourney() {
  me = freshMe(); editingPostId = null; specStage = null;
  store.del("draft-v2");
  renderBuilder(); goStep("#step-avatar");
}
$("#new-story").onclick = resetJourney;
$("#go-board").onclick = () => { resetJourney(); showTab("board"); };
$("#ext-share").onclick = async () => {
  const data = { title: "문화적응 여정", text: "나의 문화적응 이야기를 나눴어요. 당신의 이야기도 들려주세요.", url: location.href.split("#")[0] };
  try {
    if (navigator.share) await navigator.share(data);
    else { await navigator.clipboard.writeText(data.url); toast("링크를 복사했어요"); }
  } catch {}
};

/* ============ 💌 모두의 이야기 (카드 한 장씩) ============ */
onSnapshot(query(postsCol, orderBy("timestamp", "desc")), (snap) => {
  allPosts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  renderFeed();
}, (err) => {
  console.error(err);
  $("#board-count").textContent = err?.code === "permission-denied"
    ? "서버가 잠겨 있어 이야기를 불러올 수 없어요. 관리자에게 알려 주세요. (Firebase 보안 규칙)"
    : "이야기를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.";
});

function renderFilters() {
  const counts = TYPES.map((_, i) => allPosts.reduce((n, p) => n + (p.family || []).filter((m) => inStage(m, i)).length, 0));
  const people = peopleCount();
  $("#board-count").innerHTML = `지금까지 <b>${people}명</b>이 이야기를 나눴어요.`;
  $("#filter-chips").innerHTML =
    `<button class="f-chip ${filterType === "all" ? "active" : ""}" data-filter="all">전체 <b>${people}</b></button>` +
    TYPES.map((t, i) => `<button class="f-chip ${filterType === String(i) ? "active" : ""}" data-filter="${i}">${t.emoji} <span>${t.key}</span> <b>${counts[i]}</b></button>`).join("");
}
$("#filter-chips").onclick = (e) => {
  const b = e.target.closest("[data-filter]"); if (!b) return;
  filterType = b.dataset.filter; deckIdx = 0; renderFeed();
};
const filteredPosts = () => (filterType === "all" ? allPosts : allPosts.filter((p) => (p.family || []).some((m) => inStage(m, +filterType))));

function postHTML(post, liked) {
  const titles = qTitles(post);
  const members = (post.family || []).map((m) => {
    const p = memberPos(m);
    const answers = post.private ? "" : (m.answers || []).map((a, qi) => a ? `
      <div class="qa"><div class="ql">${esc(titles[qi] || "")}</div><div class="qb" data-orig="${esc(a)}"${m.lang ? ` lang="${esc(m.lang)}"` : ""}>${esc(a)}</div></div>` : "").join("");
    return `<div class="member">
      <div class="post-head">
        <div class="av-sm">${avatarOf(m)}</div>
        <div class="who"><b translate="no" class="notranslate">${esc(m.name)}</b>${m.role ? `<small>${esc(m.role)}</small>` : ""}</div>
      </div>
      ${posBadge(p)}
      ${miniSpec(p)}
      ${post.private ? "" : answers || `<div class="no-ans">작성된 답변이 없어요</div>`}
    </div>`;
  }).join("");
  const privateBox = post.private ? `<div class="private-box">
      <div class="fake" aria-hidden="true">${"<i></i>".repeat(7)}</div>
      <div class="private-cover"><b>🔒 비공개 이야기예요</b><small>쓴 사람만 볼 수 있어요</small></div>
    </div>` : "";
  return `<article class="post">
    ${post.familyName ? `<div class="fam-banner">🏡 <span translate="no" class="notranslate">${esc(post.familyName)}</span></div>` : ""}
    ${members}${privateBox}
    <div class="post-foot">
      <button class="heart ${liked.includes(post.id) ? "on" : ""}" data-heart="${post.id}">${liked.includes(post.id) ? "❤️" : "🤍"} 공감 ${post.hearts || 0}</button>
      <span class="date">${fmtDate(post.timestamp)}</span>
      <button class="more" data-more="${post.id}" aria-label="더보기">⋯</button>
    </div>
  </article>`;
}

function renderFeed() {
  renderFilters();
  const list = filteredPosts();
  const deck = $("#feed-list");
  $("#deck-nav").classList.toggle("hidden", list.length < 2);
  if (!list.length) {
    deck.innerHTML = `<div class="card empty"><div class="big-emo">🌱</div>
      <p>${filterType === "all" ? "아직 이야기가 없어요.<br>첫 번째 이야기를 들려주세요!" : "이 단계의 이야기는 아직 없어요."}</p></div>`;
    deckIdx = 0;
    return;
  }
  const liked = store.get("liked", []);
  deck.innerHTML = list.map((p) => postHTML(p, liked)).join("");
  deckIdx = Math.min(deckIdx, list.length - 1);
  syncDeck();
  applyTranslations();
}
// 지금 보고 있는 카드로 다시 맞춰요 (새 이야기가 들어와도 보던 카드를 유지)
function syncDeck() {
  const deck = $("#feed-list"), card = deck.children[deckIdx];
  if (card) { deck.style.scrollBehavior = "auto"; deck.scrollLeft = card.offsetLeft - deck.offsetLeft; deck.style.scrollBehavior = ""; }
  updateDeckNav();
}
function updateDeckNav() {
  const n = $("#feed-list").querySelectorAll(".post").length;
  $("#deck-count").textContent = n ? `${deckIdx + 1} / ${n}` : "0 / 0";
  $("#deck-prev").disabled = deckIdx <= 0;
  $("#deck-next").disabled = deckIdx >= n - 1;
}
let deckRaf;
$("#feed-list").addEventListener("scroll", () => {
  cancelAnimationFrame(deckRaf);
  deckRaf = requestAnimationFrame(() => {
    const deck = $("#feed-list"), w = deck.children[0]?.offsetWidth || 1;
    deckIdx = Math.max(0, Math.round(deck.scrollLeft / (w + 14)));
    updateDeckNav();
  });
});
const goCard = (d) => {
  const deck = $("#feed-list"), n = deck.querySelectorAll(".post").length;
  const i = Math.max(0, Math.min(n - 1, deckIdx + d));
  const card = deck.children[i];
  if (card) deck.scrollTo({ left: card.offsetLeft - deck.offsetLeft, behavior: "smooth" });
};
$("#deck-prev").onclick = () => goCard(-1);
$("#deck-next").onclick = () => goCard(1);

$("#feed-list").addEventListener("click", async (e) => {
  const h = e.target.closest("[data-heart]");
  if (h) {
    const id = h.dataset.heart, liked = store.get("liked", []);
    if (liked.includes(id)) { toast("이미 공감했어요"); return; }
    try {
      await updateDoc(doc(db, "posts", id), { hearts: increment(1) });
      store.set("liked", [...liked, id]);
      toast("마음을 전했어요");
    } catch (err) { console.error(err); toast("공감을 보내지 못했어요"); }
    return;
  }
  const m = e.target.closest("[data-more]");
  if (m) openPostMenu(m.dataset.more);
});

/* ============ ⋯ 내 이야기 열기 (생일 4자리) / 관리자 삭제 ============ */
function openPostMenu(id) {
  const p = allPosts.find((x) => x.id === id); if (!p) return;
  if (!p.pinHash) {
    openSheet(`<h3>이 이야기는…</h3>
      <p class="muted center">예전 방식으로 올린 이야기라서 관리자만 삭제할 수 있어요.</p>
      <div class="action-list">
        <button class="btn btn-soft" id="pm-admin">관리자 삭제</button>
        <button class="btn btn-ghost" id="pm-cancel">닫기</button>
      </div>`);
    $("#pm-admin").onclick = () => openAdminDelete(id);
    $("#pm-cancel").onclick = closeSheet;
    return;
  }
  openSheet(`<h3>내 이야기 열기</h3>
    <p class="muted center">내 이야기라면 <b>생일 4자리</b>를 넣어 주세요.<br>다시 보기·수정·공개 바꾸기·삭제를 할 수 있어요.</p>
    ${pinInputHTML("pm-pin")}
    <div class="action-list">
      <button class="btn btn-primary" id="pm-open">열기</button>
      <button class="btn btn-ghost" id="pm-cancel">닫기</button>
    </div>
    <p class="center"><button type="button" class="link-btn" id="pm-admin">관리자 삭제</button></p>`);
  const input = $("#pm-pin");
  bindPinInput(input);
  const tryOpen = async () => {
    const pin = input.value;
    if (pin.length !== 4) { toast("생일 4자리를 넣어 주세요 (예: 0828)"); input.focus(); return; }
    if ((await hashPin(pin, p.pinSalt)) !== p.pinHash) { toast("생일 4자리가 맞지 않아요"); input.select(); return; }
    openOwnerSheet(p.id);
  };
  $("#pm-open").onclick = tryOpen;
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") tryOpen(); });
  $("#pm-cancel").onclick = closeSheet;
  $("#pm-admin").onclick = () => openAdminDelete(id);
  setTimeout(() => input.focus(), 50);
}
// 생일 4자리 확인을 마친 글쓴이만 여기까지 와요
function openOwnerSheet(id) {
  const p = allPosts.find((x) => x.id === id); if (!p) { closeSheet(); return; }
  const m = (p.family || [])[0] || {};
  const titles = qTitles(p);
  const story = (m.answers || []).map((a, qi) => a ? `<div class="qa"><div class="ql">${esc(titles[qi])}</div><div class="qb">${esc(a)}</div></div>` : "").join("");
  openSheet(`<h3>내 이야기</h3>
    <p class="muted center">지금은 <b>${p.private ? "비공개" : "공개"}</b> 상태예요.</p>
    <div class="my-story">${story || `<div class="no-ans">작성된 답변이 없어요</div>`}</div>
    <div class="action-list">
      <button class="btn btn-soft" id="ow-edit">수정하기</button>
      <button class="btn btn-soft" id="ow-vis">${p.private ? "공개로 바꾸기" : "비공개로 바꾸기"}</button>
      <button class="btn btn-danger" id="ow-del">삭제하기</button>
      <button class="btn btn-ghost" id="ow-close">닫기</button>
    </div>`);
  $("#ow-close").onclick = closeSheet;
  $("#ow-edit").onclick = () => { closeSheet(); startEdit(p); };
  $("#ow-vis").onclick = async () => {
    try {
      await updateDoc(doc(db, "posts", id), { private: !p.private });
      closeSheet(); toast(p.private ? "공개로 바꿨어요" : "비공개로 바꿨어요");
    } catch (err) { console.error(err); toast("바꾸지 못했어요. 다시 해 주세요"); }
  };
  armDelete($("#ow-del"), id);
}
// 삭제는 두 번 눌러야 돼요 (실수 방지)
function armDelete(btn, id) {
  let armed = false;
  btn.onclick = async () => {
    if (!armed) { armed = true; btn.textContent = "정말 삭제할까요? 한 번 더 누르세요"; return; }
    btn.disabled = true;
    try { await deleteDoc(doc(db, "posts", id)); closeSheet(); toast("삭제했어요"); }
    catch (err) { console.error(err); btn.disabled = false; toast("삭제하지 못했어요"); }
  };
}
// 관리자: 삭제만 할 수 있어요 (내용 보기·수정·공개 바꾸기 없음)
function openAdminDelete(id) {
  openSheet(`<h3>관리자 삭제</h3>
    <p class="muted center">관리자는 이야기를 <b>삭제만</b> 할 수 있어요.</p>
    <input type="password" id="ad-pw" placeholder="관리자 비밀번호" autocomplete="off">
    <div class="action-list">
      <button class="btn btn-danger" id="ad-del">삭제하기</button>
      <button class="btn btn-ghost" id="ad-cancel">닫기</button>
    </div>`);
  $("#ad-cancel").onclick = closeSheet;
  const btn = $("#ad-del");
  let armed = false;
  btn.onclick = async () => {
    if ($("#ad-pw").value !== ADMIN_PW) { toast("관리자 비밀번호가 맞지 않아요"); return; }
    if (!armed) { armed = true; btn.textContent = "정말 삭제할까요? 한 번 더 누르세요"; return; }
    btn.disabled = true;
    try { await deleteDoc(doc(db, "posts", id)); closeSheet(); toast("삭제했어요"); }
    catch (err) { console.error(err); btn.disabled = false; toast("삭제하지 못했어요"); }
  };
}

function startEdit(p) {
  const m = (p.family || [])[0] || {};
  editingPostId = p.id; specStage = null;
  me = {
    name: m.name || "", avatar: normAv(m.avatar), pos: memberPos(m),
    answers: [0, 1, 2, 3].map((k) => m.answers?.[k] || "")
  };
  showTab("journey");
  goWrite();
  toast("고친 다음 아래 '수정한 이야기 올리기'를 눌러 주세요");
}

/* ============ 🔐 관리자 전체 삭제 ============ */
$("#del-all").onclick = async () => {
  if ($("#admin-pw").value !== ADMIN_PW) { toast("관리자 비밀번호가 맞지 않아요"); return; }
  if (!confirm("모든 이야기를 지울까요? 되돌릴 수 없어요.")) return;
  try {
    const s = await getDocs(postsCol);
    await Promise.all(s.docs.map((d) => deleteDoc(doc(db, "posts", d.id))));
    $("#admin-pw").value = "";
    toast("전체 삭제를 마쳤어요");
  } catch (err) { console.error(err); toast("삭제 중 오류가 났어요"); }
};

/* ============ 📲 앱 설치 (PWA) ============ */
if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(console.error);
const INSTALL_KEY = "install-asked-v2";
const CAN_AUTO_INSTALL = "onbeforeinstallprompt" in window && !IS_IOS;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault(); deferredInstall = e;
  $("#install-btn").classList.remove("hidden");
});
window.addEventListener("appinstalled", () => {
  deferredInstall = null;
  $("#install-btn").classList.add("hidden");
  toast("설치됐어요! 홈 화면의 ✈️ 아이콘으로 열어 주세요");
});
async function runInstall() {
  if (!deferredInstall) return false;
  const ev = deferredInstall;
  ev.prompt();
  const { outcome } = await ev.userChoice;
  deferredInstall = null;
  $("#install-btn").classList.add("hidden");
  if (outcome === "accepted") toast("설치하고 있어요!");
  return true;
}
$("#install-btn").onclick = runInstall;

function manualInstallSheet(next) {
  openSheet(`
    <div class="slide">
      <div class="big-emo">📲</div><h2>이렇게 설치해 주세요</h2>
      ${IS_IOS
        ? `<p>아이폰은 버튼 하나로 바로 설치할 수 없어서<br>아래 순서대로 눌러 주세요.</p>
           <ol class="num-steps">
             <li>화면의 <b>공유 버튼 ⬆️</b> 누르기</li>
             <li><b>홈 화면에 추가</b> 누르기</li>
             <li>오른쪽 위 <b>추가</b> 누르기</li>
           </ol>`
        : (CAN_AUTO_INSTALL
          ? `<p>크롬이 아직 설치를 허락하지 않았어요.<br>이미 설치되어 있거나 <b>시크릿 창</b>이면 이렇게 돼요.<br>아래 방법으로도 설치할 수 있어요.</p>`
          : `<p>이 브라우저는 버튼 하나로 바로 설치할 수 없어요.<br><b>크롬(Chrome)</b>으로 열면 바로 설치돼요.</p>`)
          + `<div class="branch">
             <div><div class="branch-h">휴대폰</div><span>오른쪽 위 ⋮ 메뉴 → <b>앱 설치</b> 또는 <b>홈 화면에 추가</b></span></div>
             <div><div class="branch-h">컴퓨터</div><span>주소창 오른쪽 <b>설치 아이콘</b> 또는 ⋮ 메뉴 → <b>앱 설치</b></span></div>
           </div>`}
      <p class="muted">이미 설치했다면 홈 화면의 ✈️ 아이콘으로 열어 주세요.</p>
      <button class="btn btn-primary" id="mi-ok">알겠어요</button>
    </div>`, next);
  $("#mi-ok").onclick = closeSheet;
}
// "앱으로 설치할까요?" → 아니오: 그냥 넘어가요 / 예: 바로 설치해요
function askInstall(next) {
  openSheet(`
    <div class="slide">
      <div class="big-emo">📲</div><h2>앱으로 설치할까요?</h2>
      <p>홈 화면(컴퓨터는 바탕화면)에 ✈️ 아이콘이 생겨서<br>다음부터 바로 열 수 있어요.</p>
      <div class="ask-btns">
        <button class="btn btn-soft" id="ia-no">아니오</button>
        <button class="btn btn-primary" id="ia-yes">예</button>
      </div>
    </div>`, () => { store.set(INSTALL_KEY, true); next(); });
  $("#ia-no").onclick = closeSheet;
  $("#ia-yes").onclick = () => {
    store.set(INSTALL_KEY, true);
    if (deferredInstall) { closeSheet(); runInstall(); }
    else if (CAN_AUTO_INSTALL) waitInstallSheet(next);
    else manualInstallSheet(next);
  };
}
// 크롬은 처음 온 사람이 30초쯤 머문 뒤에야 설치를 허락해요. 그동안 진행 막대를 보여 줘요.
const WAIT_MS = 32000;
function waitInstallSheet(next) {
  openSheet(`
    <div class="slide">
      <div class="big-emo">⏳</div><h2 id="iw-title">설치를 준비하고 있어요</h2>
      <p id="iw-text">크롬이 설치를 허락할 때까지 기다리는 중이에요.<br>처음 오셨다면 <b>30초쯤</b> 걸려요. 이 화면을 그대로 두세요.</p>
      <div class="iw-bar"><i id="iw-fill"></i></div>
      <button class="btn btn-primary" id="iw-go" disabled>준비 중…</button>
      <button class="link-btn hidden" id="iw-manual" type="button">설치가 안 되나요? 직접 설치하는 방법 보기</button>
    </div>`, next);
  const btn = $("#iw-go"), t0 = Date.now();
  const tick = setInterval(() => {
    if (!btn.isConnected) { clearInterval(tick); return; }
    const ms = Date.now() - t0;
    $("#iw-fill").style.width = `${Math.min(96, (ms / WAIT_MS) * 100)}%`;
    if (ms > WAIT_MS + 8000) $("#iw-manual").classList.remove("hidden");
  }, 250);
  $("#iw-manual").onclick = () => { clearInterval(tick); manualInstallSheet(next); };
  const ready = () => {
    if (!btn.isConnected) return;
    clearInterval(tick);
    $("#iw-fill").style.width = "100%";
    $("#iw-title").textContent = "설치 준비가 끝났어요!";
    $("#iw-text").textContent = "아래 버튼을 누르면 바로 설치돼요.";
    $("#iw-manual").classList.add("hidden");
    btn.disabled = false; btn.textContent = "지금 설치하기";
    btn.onclick = () => { closeSheet(); runInstall(); };
  };
  if (deferredInstall) ready();
  else window.addEventListener("beforeinstallprompt", () => setTimeout(ready), { once: true });
}
async function isInstalled() {
  try {
    if (!navigator.getInstalledRelatedApps) return false;
    const apps = await Promise.race([navigator.getInstalledRelatedApps(), new Promise((r) => setTimeout(() => r([]), 1500))]);
    return apps.length > 0;
  } catch { return false; }
}
function maybeAskInstall() {
  if (IS_STANDALONE || store.get(INSTALL_KEY)) return;
  isInstalled().then((yes) => { if (!yes) askInstall(() => {}); });
}

/* ============ 🚀 시작 ============ */
applyLangAttrs();
renderTrSeg();
$("#guide-lang-grid").outerHTML = langGridHTML();
loadDraft();
renderBuilder();
// 처음 들어오면: ① 환영 + 편한 언어 고르기 → ② 앱으로 설치할까요?
if (!store.get("hide-guide-intro-v2")) openGuide("intro", maybeAskInstall);
else maybeAskInstall();
if (uiLang !== "ko") translatePage();
