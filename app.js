import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCO9ZM-CM4rDIizZPHxo_Tx0ST89fADrgc",
  authDomain: "maum-project-f249b.firebaseapp.com",
  projectId: "maum-project-f249b",
  storageBucket: "maum-project-f249b.firebasestorage.app",
  messagingSenderId: "638023840601",
  appId: "1:638023840601:web:c55ce7b2a80e6d6018d248"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const postsCol = collection(db, "posts");

let members = [];
let selectedChar = "🧑‍🌾";
let currentLang = "ko";
let allPosts = [];
let currentPage = 1;
const postsPerPage = 5;

// 1. 250+ 언어 지원 및 번역 사전
const i18n = {
    ko: {
        title: "문화적응 여정", add: "멤버 추가", start: "START", share: "공유하기", feed: "우리들의 이야기",
        namePh: "이름", rolePh: "역할 (예: 아들)",
        stones: ["주변화", "분리", "동화", "통합"],
        descs: ["주변화: 양쪽 어디에도 속하지 못한 상태", "분리: 고유 문화만 고수", "동화: 새 문화에 맞춤", "통합: 두 문화의 조화"],
        qs: ["한국에 오게 된 이유", "나를 버티게 해준 것", "가장 힘이 되는 말", "그만두고 싶었던 순간"],
        opts: [
            ["가족과 함께하려고", "공부/일을 위해서", "더 나은 환경을 찾아", "새로운 도전"],
            ["가족의 응원", "고향 친구들", "새로운 취미", "꿈에 대한 희망"],
            ["할 수 있어", "사랑해/고마워", "함께하자", "오늘도 고생했어"],
            ["외로울 때", "말이 안 통할 때", "음식이 그리울 때", "차별을 느낄 때"]
        ]
    },
    en: {
        title: "Cultural Journey", add: "Add Member", start: "START", share: "Share", feed: "Our Stories",
        namePh: "Name", rolePh: "Role (e.g. Son)",
        stones: ["Margin", "Separation", "Assimilation", "Integration"],
        descs: ["Marginalization: Belonging nowhere", "Separation: Roots only", "Assimilation: Fitting in", "Integration: Harmonious balance"],
        qs: ["Reason for coming", "My support system", "Most helpful words", "Hardest moments"],
        opts: [
            ["With Family", "For Study/Work", "Better Environment", "New Challenge"],
            ["Family Support", "Hometown Friends", "New Hobbies", "Hope for Future"],
            ["You can do it", "Love/Thank you", "Let's be together", "Good job today"],
            ["Loneliness", "Language barrier", "Missing food", "Discrimination"]
        ]
    },
    ja: {
        title: "文化適応の旅", add: "メンバー追加", start: "スタート", share: "共有する", feed: "私たちの物語",
        namePh: "名前", rolePh: "役割 (例: 息子)",
        stones: ["周辺化", "分離", "同化", "統合"],
        descs: ["周辺化: どこにも属さない状態", "分離: 固有文化の固守", "同化: 新しい文化への適応", "統合: 二つの文化の調和"],
        qs: ["来国の理由", "支えになったもの", "力になる言葉", "辞めたかった瞬間"],
        opts: [
            ["家族と一緒に", "勉強/仕事のため", "より良い環境を求めて", "新しい挑戦"],
            ["家族の応援", "故郷の友人", "新しい趣味", "未来への希望"],
            ["できるよ", "愛してる/ありがとう", "一緒にいよう", "お疲れ様"],
            ["孤独な時", "言葉が通じない時", "料理が恋しい時", "差別を感じる時"]
        ]
    }
};

// 언어 목록 생성 (Intl API 활용)
const langCodes = ["ko", "en", "ja", "zh", "vi", "th", "tl", "fr", "es", "ru"];
const langSelect = document.getElementById('lang-select');
langCodes.forEach(code => {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = new Intl.DisplayNames([code], {type: 'language'}).of(code);
    langSelect.appendChild(opt);
});

function updateUI(lang) {
    currentLang = lang;
    const t = i18n[lang] || i18n['en'];
    document.getElementById('ui-title').innerText = t.title;
    document.getElementById('add-btn').innerText = t.add;
    document.getElementById('start-btn').innerText = t.start;
    document.getElementById('share-btn').innerText = t.share;
    document.getElementById('ui-feed-title').innerText = t.feed;
    document.getElementById('user-name').placeholder = t.namePh;
    document.getElementById('role-in').placeholder = t.rolePh;
    if(members.length > 0) renderSurvey();
    renderFeed();
}

langSelect.addEventListener('change', (e) => updateUI(e.target.value));

// 2. 캐릭터 선택 & 멤버 추가
document.querySelectorAll('.char-opt').forEach(opt => {
    opt.onclick = (e) => {
        document.querySelectorAll('.char-opt').forEach(o => o.classList.remove('selected'));
        e.target.classList.add('selected');
        selectedChar = e.target.dataset.char;
        document.getElementById('family-form').classList.toggle('hidden', selectedChar !== "👨‍👩‍👧‍👦");
    };
});

document.getElementById('add-btn').onclick = () => {
    const name = document.getElementById('user-name').value;
    if(!name) return;
    const role = document.getElementById('role-in').value || document.getElementById('gender-sel').value;
    members.push({ name, char: selectedChar, role, typeIdx: 1, ans: [0,0,0,0] });
    document.getElementById('member-chips').innerHTML = members.map(m => `<span class="chip">${m.char} ${m.name}</span>`).join('');
    document.getElementById('start-btn').classList.remove('hidden');
    document.getElementById('user-name').value = "";
};

// 3. 여정 시작 & 사지선다 렌더링
document.getElementById('start-btn').onclick = () => {
    document.getElementById('survey-area').classList.remove('hidden');
    renderSurvey();
};

function renderSurvey() {
    const t = i18n[currentLang] || i18n['en'];
    document.getElementById('member-cards').innerHTML = members.map((m, mIdx) => `
        <div class="post-card">
            <h3>${m.char} ${m.name} (${m.role})</h3>
            <div class="stones" data-midx="${mIdx}">
                ${t.stones.map((s, sIdx) => `<div class="stone ${m.typeIdx === sIdx ? 'active' : ''}" data-sidx="${sIdx}">${s}</div>`).join('')}
            </div>
            <div class="speech-bubble">${t.descs[m.typeIdx]}</div>
            <div class="quiz-area">
                ${t.qs.map((q, qIdx) => `
                    <div class="quiz-card">
                        <p><strong>Q${qIdx+1}. ${q}</strong></p>
                        ${t.opts[qIdx].map((opt, oIdx) => `
                            <button class="option-btn ${m.ans[qIdx] === oIdx ? 'selected' : ''}" 
                                    onclick="window.setAns(${mIdx}, ${qIdx}, ${oIdx})">${opt}</button>
                        `).join('')}
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
    
    document.querySelectorAll('.stone').forEach(st => {
        st.onclick = (e) => {
            members[e.target.parentElement.dataset.midx].typeIdx = parseInt(e.target.dataset.sidx);
            renderSurvey();
        };
    });
}

window.setAns = (mIdx, qIdx, oIdx) => {
    members[mIdx].ans[qIdx] = oIdx;
    renderSurvey();
};

// 4. 공유 및 게시판 (페이지네이션 포함)
document.getElementById('share-btn').onclick = async () => {
    await addDoc(postsCol, { family: members, timestamp: new Date() });
    alert("공유 완료!"); location.reload();
};

onSnapshot(query(postsCol, orderBy("timestamp", "desc")), (snap) => {
    allPosts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderFeed();
});

function renderFeed() {
    const t = i18n[currentLang] || i18n['en'];
    const start = (currentPage - 1) * postsPerPage;
    const paginated = allPosts.slice(start, start + postsPerPage);

    document.getElementById('feed-list').innerHTML = paginated.map(post => `
        <div class="post-card">
            <button class="eraser" onclick="window.delPost('${post.id}')">🧽</button>
            ${post.family.map(m => `
                <div>
                    <strong>${m.char} ${m.name}</strong> (${t.stones[m.typeIdx] || 'Type'})
                    <p style="font-size:0.85rem; color:#555;">
                        ${m.ans.map((aIdx, qIdx) => `${t.qs[qIdx]}: ${t.opts[qIdx][aIdx]}`).join(' / ')}
                    </p>
                </div>
            `).join('<hr style="border:1px dashed #eee">')}
        </div>
    `).join('');
    renderPageNav();
}

function renderPageNav() {
    const total = Math.ceil(allPosts.length / postsPerPage);
    let html = '';
    for(let i=1; i<=total; i++) html += `<button class="page-btn ${i===currentPage?'active':''}" onclick="window.setPage(${i})">${i}</button>`;
    document.getElementById('page-nav').innerHTML = html;
}

window.setPage = (p) => { currentPage = p; renderFeed(); };
window.delPost = async (id) => {
    if(document.getElementById('admin-pw').value === '0530') {
        if(confirm("지울까요?")) await deleteDoc(doc(db, "posts", id));
    } else alert("비밀번호가 틀렸습니다.");
};

document.getElementById('del-all').onclick = async () => {
    if(document.getElementById('admin-pw').value === '0530') {
        const s = await getDocs(postsCol);
        s.forEach(async d => await deleteDoc(doc(db, "posts", d.id)));
    }
};

updateUI('ko');
