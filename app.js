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
let currentEmoji = "👨";
let currentLang = "ko";

// 다국어 사전 (주요 언어 중심, 확장이 쉬운 구조)
const translations = {
    ko: {
        title: "문화적응 여정", add: "멤버 추가", start: "여정 시작", share: "이야기 공유하기", feed: "우리들의 이야기 💌",
        namePh: "이름", rolePh: "역할 (예: 아들/딸)",
        stones: ["주변화", "분리", "동화", "통합"],
        descs: [
            "주변화: 양쪽 문화 모두에서 소외감을 느끼며 어디에도 속하지 못한 상태입니다.",
            "분리: 자신의 뿌리 문화를 고수하며 새로운 문화와는 거리를 두는 방식입니다.",
            "동화: 새로운 사회에 적응하기 위해 자신의 문화를 변화시키려 노력합니다.",
            "통합: 고유의 문화를 유지하며 새로운 문화의 장점을 조화롭게 받아들인 상태입니다."
        ],
        qs: ["한국에 오게 된 이유", "나를 버티게 해준 것", "나에게 힘이 되는 말", "그만두고 싶었던 순간"]
    },
    en: {
        title: "CULTURAL ADAPTATION", add: "Add Member", start: "Start Journey", share: "Share Story", feed: "Our Stories 💌",
        namePh: "Name", rolePh: "Role (e.g. Son/Daughter)",
        stones: ["Margin", "Separation", "Assimilation", "Integration"],
        descs: [
            "Marginalization: Feeling alienated from both cultures, belonging nowhere.",
            "Separation: Holding onto roots while keeping a distance from the new culture.",
            "Assimilation: Trying to change one's culture to fit into the new society.",
            "Integration: Keeping roots while harmoniously embracing the new culture."
        ],
        qs: ["Reason for coming", "What keeps me going", "Words of strength", "Moments I wanted to quit"]
    },
    ja: {
        title: "文化適応の旅", add: "メンバー追加", start: "旅を始める", share: "物語を共有", feed: "私たちの物語 💌",
        namePh: "名前", rolePh: "役割 (例: 息子/娘)",
        stones: ["周辺化", "分離", "同化", "統合"],
        descs: [
            "周辺화: 両方の文化から疎外感を感じ、どこにも属していない状態です。",
            "分離: 自分のルーツ를 固守し、新しい文化とは距離を置く方法です。",
            "同化: 新しい社会に適응するため、自分の文化を変化させようとします。",
            "統合: 固有の文化を維持しながら、新しい文化を調和して受け入린 状態です。"
        ],
        qs: ["来た理由", "私を支えてくれたもの", "力になる言葉", "辞めたくなった瞬間"]
    }
    // 다른 언어들도 이와 같은 구조로 계속 추가 가능합니다.
};

// UI 언어 업데이트
function updateUI(lang) {
    currentLang = lang;
    const t = translations[lang] || translations['en']; // 해당 언어 없으면 영어로
    document.getElementById('main-title').innerText = t.title;
    document.getElementById('add-btn').innerText = t.add;
    document.getElementById('start-btn').innerText = t.start;
    document.getElementById('share-btn').innerText = t.share;
    document.getElementById('feed-title').innerText = t.feed;
    document.getElementById('member-name').placeholder = t.namePh;
    document.getElementById('role-input').placeholder = t.rolePh;
    if(members.length > 0 && !document.getElementById('survey-section').classList.contains('hidden')) renderCards();
}

document.getElementById('lang-select').addEventListener('change', (e) => updateUI(e.target.value));

// 캐릭터 선택 로직
document.querySelectorAll('.emoji-opt').forEach(el => {
    el.addEventListener('click', (e) => {
        document.querySelectorAll('.emoji-opt').forEach(o => o.classList.remove('selected'));
        e.target.classList.add('selected');
        currentEmoji = e.target.dataset.emoji;
        document.getElementById('family-extra').classList.toggle('hidden', currentEmoji !== "👨‍👩‍👧‍👦");
    });
});

// 멤버 추가 로직
document.getElementById('add-btn').addEventListener('click', () => {
    const name = document.getElementById('member-name').value.trim();
    const role = document.getElementById('role-input').value.trim();
    const gender = document.getElementById('gender-select').value;
    if(!name) return;

    let info = (currentEmoji === "👨‍👩‍👧‍👦") ? `${gender}/${role}` : gender;
    members.push({ name, emoji: currentEmoji, info, typeIdx: 1 });
    
    document.getElementById('member-list').innerHTML = members.map(m => `<span class="chip">${m.emoji} ${m.name}</span>`).join('');
    document.getElementById('start-btn').classList.remove('hidden');
    document.getElementById('member-name').value = ""; document.getElementById('role-input').value = "";
});

// 여정 시작
document.getElementById('start-btn').addEventListener('click', () => {
    document.getElementById('survey-section').classList.remove('hidden');
    renderCards();
});

function renderCards() {
    const t = translations[currentLang] || translations['en'];
    document.getElementById('cards-container').innerHTML = members.map((m, mIdx) => `
        <div class="post-card">
            <h3>${m.emoji} ${m.name} (${m.info})</h3>
            <div class="stepping-stones" data-midx="${mIdx}">
                ${t.stones.map((s, sIdx) => `<div class="stone ${m.typeIdx === sIdx ? 'active' : ''}" data-sidx="${sIdx}">${s}</div>`).join('')}
            </div>
            <div class="speech-bubble" id="bubble-${mIdx}">${t.descs[m.typeIdx]}</div>
            ${t.qs.map((q, qIdx) => `<textarea class="ans" data-midx="${mIdx}" data-qidx="${qIdx}" placeholder="${q}"></textarea>`).join('')}
        </div>
    `).join('');

    document.querySelectorAll('.stone').forEach(st => {
        st.addEventListener('click', (e) => {
            const midx = e.target.parentElement.dataset.midx;
            const sidx = parseInt(e.target.dataset.sidx);
            members[midx].typeIdx = sidx;
            renderCards();
        });
    });
}

// 공유하기
document.getElementById('share-btn').addEventListener('click', async () => {
    const t = translations[currentLang] || translations['en'];
    const finalData = members.map((m, mIdx) => ({
        name: m.name, emoji: m.emoji, info: m.info,
        type: t.stones[m.typeIdx],
        answers: Array.from(document.querySelectorAll(`.ans[data-midx="${mIdx}"]`)).map(a => a.value)
    }));
    await addDoc(postsCol, { family: finalData, timestamp: new Date(), lang: currentLang });
    alert("공유 완료! 🎉"); location.reload();
});

// 피드 및 삭제 (지우개 아이콘 🧽)
onSnapshot(query(postsCol, orderBy("timestamp", "desc")), (snap) => {
    document.getElementById('feed-list').innerHTML = snap.docs.map(doc => {
        const d = doc.data();
        return `
            <div class="post-card">
                <button class="eraser-btn" onclick="window.deleteSingle('${doc.id}')">🧽</button>
                ${d.family.map(m => `
                    <p><strong>${m.emoji} ${m.name}</strong> (${m.type})</p>
                    <small>${m.answers.filter(a => a).join(' / ')}</small>
                `).join('<hr>')}
            </div>
        `;
    }).join('');
});

// 개별 삭제 (암호 0530)
window.deleteSingle = async (id) => {
    if(document.getElementById('admin-pw').value === '0530') {
        if(confirm("이 기록을 지울까요?")) await deleteDoc(doc(db, "posts", id));
    } else alert("암호가 틀렸습니다.");
};

// 전체 삭제
document.getElementById('delete-all-btn').addEventListener('click', async () => {
    if(document.getElementById('admin-pw').value === '0530') {
        if(confirm("모든 기록을 삭제하시겠습니까?")) {
            const s = await getDocs(postsCol);
            s.forEach(async (d) => await deleteDoc(doc(db, "posts", d.id)));
        }
    } else alert("암호가 틀렸습니다.");
});

updateUI('ko');
