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

// 다국어 데이터베이스
const langPack = {
    ko: {
        title: "문화적응 여정", add: "멤버 추가", start: "여정 시작", share: "이야기 공유", feed: "우리들의 이야기 💌",
        namePh: "이름", rolePh: "역할 (예: 첫째 아들)",
        stones: ["주변화", "분리", "동화", "통합"],
        descs: [
            "주변화(Marginalization): 양쪽 문화 모두에서 소외감을 느끼며 어디에도 속하지 못한 상태입니다.",
            "분리(Separation): 자신의 뿌리 문화를 고수하며 새로운 문화와는 거리를 두는 방식입니다.",
            "동화(Assimilation): 새로운 사회에 적응하기 위해 자신의 문화를 맞추거나 변화시키려 노력합니다.",
            "통합(Integration): 고유의 문화를 유지하면서도 새로운 문화의 장점을 조화롭게 받아들인 상태입니다."
        ],
        qs: ["한국에 오게 된 이유", "나를 버티게 해준 것", "나에게 힘이 되는 말", "그만두고 싶었던 순간"]
    },
    en: {
        title: "CULTURAL ADAPTATION", add: "Add Member", start: "Start Journey", share: "Share Story", feed: "Our Stories 💌",
        namePh: "Name", rolePh: "Role (e.g., First Son)",
        stones: ["Margin", "Separated", "Assimilated", "Integrated"],
        descs: [
            "Marginalization: Feeling alienated from both cultures, belonging nowhere.",
            "Separation: Holding onto roots while keeping a distance from the new culture.",
            "Assimilation: Trying to fit in or change oneself to adapt to the new society.",
            "Integration: Harmoniously embracing the new culture while maintaining roots."
        ],
        qs: ["Reason for coming", "What keeps me going", "Words of strength", "Moments I wanted to quit"]
    },
    ja: {
        title: "文化適応の旅", add: "メンバー追加", start: "旅を始める", share: "物語を共有", feed: "私たちの物語 💌",
        namePh: "名前", rolePh: "役割 (例: 長男)",
        stones: ["周辺化", "分離", "同化", "統合"],
        descs: [
            "周辺化: 両方の文化から疎外感を感じ、どこにも属していない状態です。",
            "分離: 自分のルーツを固守し、新しい文化とは距離を置く方法です。",
            "同화: 新しい社会に適応するため、自分の文化を変化させようとします。",
            "統合: 固有の文化を維持しながら、新しい文化を調和して受け入れた状態です。"
        ],
        qs: ["来た理由", "私を支えてくれたもの", "力になる言葉", "辞めたくなった瞬間"]
    }
};

// 언어 업데이트 함수
function setLang(l) {
    currentLang = l;
    const t = langPack[l];
    document.getElementById('main-title').innerText = t.title;
    document.getElementById('add-btn').innerText = t.add;
    document.getElementById('start-btn').innerText = t.start;
    document.getElementById('share-btn').innerText = t.share;
    document.getElementById('feed-title').innerText = t.feed;
    document.getElementById('member-name').placeholder = t.namePh;
    document.getElementById('role-input').placeholder = t.rolePh;
    if(members.length > 0) renderCards();
}

document.getElementById('lang-select').addEventListener('change', (e) => setLang(e.target.value));

// 아바타 선택
document.querySelectorAll('.emoji-opt').forEach(el => {
    el.addEventListener('click', (e) => {
        document.querySelectorAll('.emoji-opt').forEach(o => o.classList.remove('selected'));
        e.target.classList.add('selected');
        currentEmoji = e.target.dataset.emoji;
        document.getElementById('family-extra').classList.toggle('hidden', currentEmoji !== "👨‍👩‍👧‍👦");
    });
});

// 멤버 추가
document.getElementById('add-btn').addEventListener('click', () => {
    const name = document.getElementById('member-name').value.trim();
    const role = document.getElementById('role-input').value.trim();
    const gender = document.getElementById('gender-select').value;
    if(!name) return;

    let info = (currentEmoji === "👨‍👩‍👧‍👦") ? `${gender}/${role}` : gender;
    members.push({ name, emoji: currentEmoji, info, typeIdx: 1 }); // 기본값 분리(1)
    
    document.getElementById('member-list').innerHTML = members.map(m => `<span class="chip">${m.emoji} ${m.name}</span>`).join('');
    document.getElementById('start-btn').classList.remove('hidden');
    document.getElementById('member-name').value = ""; document.getElementById('role-input').value = "";
});

// 여정 시작 (징검다리 카드 생성)
document.getElementById('start-btn').addEventListener('click', () => {
    document.getElementById('survey-section').classList.remove('hidden');
    renderCards();
});

function renderCards() {
    const t = langPack[currentLang];
    document.getElementById('cards-container').innerHTML = members.map((m, mIdx) => `
        <div class="post-card" style="background:#fff">
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
            renderCards(); // 상태 업데이트 후 재렌더링
        });
    });
}

// 공유하기
document.getElementById('share-btn').addEventListener('click', async () => {
    const t = langPack[currentLang];
    const finalData = members.map((m, mIdx) => ({
        name: m.name, emoji: m.emoji, info: m.info,
        type: t.stones[m.typeIdx],
        answers: Array.from(document.querySelectorAll(`.ans[data-midx="${mIdx}"]`)).map(a => a.value)
    }));
    await addDoc(postsCol, { family: finalData, timestamp: new Date() });
    alert("Shared! 🎉"); location.reload();
});

// 피드 및 삭제 로직
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

// 전역 삭제 함수
window.deleteSingle = async (id) => {
    const pw = document.getElementById('admin-pw').value;
    if(pw === '0530') {
        if(confirm("이 글을 지울까요?")) await deleteDoc(doc(db, "posts", id));
    } else {
        alert("비밀번호가 틀렸습니다.");
    }
};

document.getElementById('delete-all-btn').addEventListener('click', async () => {
    const pw = document.getElementById('admin-pw').value;
    if(pw === '0530') {
        if(confirm("모든 데이터를 삭제하시겠습니까?")) {
            const s = await getDocs(postsCol);
            s.forEach(async (d) => await deleteDoc(doc(db, "posts", d.id)));
        }
    } else {
        alert("비밀번호가 틀렸습니다.");
    }
});

setLang('ko');
