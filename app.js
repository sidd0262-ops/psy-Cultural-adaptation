// ======================================================
// 1. 설정 (Configuration) - 선생님의 열쇠들을 꽂는 곳
// ======================================================

// [필독] Gemini API 키 (이미 입력됨)
const GEMINI_API_KEY = "AIzaSyCO9ZM-CM4rDIizZPHxo_Tx0ST89fADrgc";

// [필독] Firebase 설정 (선생님의 창고 주소)
const firebaseConfig = {
  apiKey: "AIzaSyCO9ZM-CM4rDIizZPHxo_Tx0ST89fADrgc",
  authDomain: "maum-project-f249b.firebaseapp.com",
  projectId: "maum-project-f249b",
  storageBucket: "maum-project-f249b.firebasestorage.app",
  messagingSenderId: "638023840601",
  appId: "1:638023840601:web:c55ce7b2a80e6d6018d248",
  measurementId: "G-QWLY7S3MK0"
};

// ======================================================
// 2. 외부 라이브러리 및 시스템 초기화
// ======================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const postsCollection = collection(db, "posts");

// 전역 상태 변수
let members = [];
let currentEmoji = "👨🏽";
let currentLang = "ko";

// ======================================================
// 3. 다국어 텍스트 데이터 (말풍선 설명 포함)
// ======================================================
const translations = {
    ko: {
        m: "주변화: 어디에도 속하지 못한 '외딴섬'. 양쪽 모두에서 소외된 상태입니다.",
        s: "분리: 익숙함이 편안한 '우리만의 울타리'. 한국 문화는 피하고 고향 방식만 고집합니다.",
        a: "동화: 한국식에 맞추려는 '열심 모드'. 한국 사회에 섞이기 위해 최선을 다합니다.",
        i: "통합: 두 문화가 어우러진 '반반 치킨'. 뿌리를 유지하며 조화롭게 적응했습니다.",
        q1: "한국에 오게 된 이유",
        q2: "나를 버티게 해준 것",
        q3: "나에게 힘이 되는 말",
        q4: "모두 그만두고 싶었던 순간",
        shareBtn: "우리들의 이야기 공유하기",
        deleteConfirm: "정말 모두 삭제하시겠습니까?"
    },
    en: {
        m: "Marginalization: A lonely island. Feeling isolated from both cultures.",
        s: "Separation: A comfortable fence. Sticking only to the original culture.",
        a: "Assimilation: Hardworking mode. Trying best to blend into Korean society.",
        i: "Integration: Perfect harmony. Maintaining roots while adapting well.",
        q1: "Reason for coming to Korea",
        q2: "What keeps me going",
        q3: "Words that give me strength",
        q4: "Moments I wanted to quit",
        shareBtn: "Share Our Stories",
        deleteConfirm: "Are you sure you want to delete all?"
    }
};

// ======================================================
// 4. 주요 기능 로직 (이벤트 리스너)
// ======================================================

// (1) 이모지 선택 효과
document.querySelectorAll('.emoji-opt').forEach(el => {
    el.addEventListener('click', (e) => {
        document.querySelectorAll('.emoji-opt').forEach(opt => opt.classList.remove('selected'));
        e.target.classList.add('selected');
        currentEmoji = e.target.dataset.emoji;
    });
});

// (2) 멤버 추가 버튼
document.getElementById('add-member-btn').addEventListener('click', () => {
    const nameInput = document.getElementById('new-name');
    const name = nameInput.value.trim();
    if(!name) return;

    members.push({ name, emoji: currentEmoji });
    renderMemberChips();
    nameInput.value = "";
    document.getElementById('start-btn').classList.remove('hidden');
});

function renderMemberChips() {
    const container = document.getElementById('member-chips');
    container.innerHTML = members.map(m => `<span class="chip">${m.emoji} ${m.name}</span>`).join('');
}

// (3) 여정 시작 (동적 카드 생성)
document.getElementById('start-btn').addEventListener('click', () => {
    currentLang = document.getElementById('lang-select').value;
    document.getElementById('question-section').classList.remove('hidden');
    
    const container = document.getElementById('dynamic-cards');
    const t = translations[currentLang];

    container.innerHTML = members.map((m, idx) => `
        <div class="member-card">
            <h3>${m.emoji} ${m.name}'s Spectrum</h3>
            <input type="range" class="spectrum-slider" data-idx="${idx}" min="0" max="100" value="50">
            <div class="speech-bubble" id="bubble-${idx}">${t.s}</div>
            <div class="input-area">
                <textarea class="ans-box" data-idx="${idx}" data-q="1" placeholder="${t.q1}"></textarea>
                <textarea class="ans-box" data-idx="${idx}" data-q="2" placeholder="${t.q2}"></textarea>
                <textarea class="ans-box" data-idx="${idx}" data-q="3" placeholder="${t.q3}"></textarea>
                <textarea class="ans-box" data-idx="${idx}" data-q="4" placeholder="${t.q4}"></textarea>
            </div>
        </div>
    `).join('');

    // 슬라이더 변경 이벤트 연결
    document.querySelectorAll('.spectrum-slider').forEach(slider => {
        slider.addEventListener('input', (e) => {
            const val = e.target.value;
            const bubble = document.getElementById(`bubble-${e.target.dataset.idx}`);
            const text = translations[currentLang];
            if(val <= 25) bubble.innerText = text.m;
            else if(val <= 50) bubble.innerText = text.s;
            else if(val <= 75) bubble.innerText = text.a;
            else bubble.innerText = text.i;
        });
    });
});

// (4) 데이터 공유하기 (Firebase 저장)
document.getElementById('share-btn').addEventListener('click', async () => {
    const btn = document.getElementById('share-btn');
    btn.disabled = true;
    btn.innerText = "Sharing...";

    try {
        const postData = {
            timestamp: new Date(),
            lang: currentLang,
            family: members.map((m, idx) => {
                const bubbleText = document.getElementById(`bubble-${idx}`).innerText;
                const answers = Array.from(document.querySelectorAll(`.ans-box[data-idx="${idx}"]`)).map(a => a.value);
                return {
                    name: m.name,
                    emoji: m.emoji,
                    type: bubbleText,
                    answers: answers
                };
            })
        };

        await addDoc(postsCollection, postData);
        alert("Success! 🎉");
        location.reload(); // 등록 후 페이지 리셋
    } catch (e) {
        console.error(e);
        alert("Error saving data.");
        btn.disabled = false;
    }
});

// (5) 관리자 리셋 기능 (0530)
document.getElementById('admin-lock').addEventListener('click', () => {
    document.getElementById('admin-modal').classList.remove('hidden');
});

document.getElementById('close-admin').addEventListener('click', () => {
    document.getElementById('admin-modal').classList.add('hidden');
});

document.getElementById('del-all-btn').addEventListener('click', async () => {
    const pw = document.getElementById('admin-pw').value;
    if(pw === '0530') {
        if(confirm(translations[currentLang].deleteConfirm)) {
            const snapshot = await getDocs(postsCollection);
            const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, "posts", d.id)));
            await Promise.all(deletePromises);
            alert("Deleted All.");
            location.reload();
        }
    } else {
        alert("Wrong Password.");
    }
});

// (6) 게시판 실시간 렌더링 (Feed)
const q = query(postsCollection, orderBy("timestamp", "desc"));
onSnapshot(q, (snapshot) => {
    const feed = document.getElementById('feed-container');
    feed.innerHTML = snapshot.docs.map(doc => {
        const data = doc.data();
        return data.family.map(m => `
            <div class="post-card">
                <div class="post-header">
                    <span>${m.emoji} <strong>${m.name}</strong></span>
                    <span class="type-tag">${m.type.split(':')[0]}</span>
                </div>
                <p class="post-content">${m.answers.join(' / ')}</p>
            </div>
        `).join('');
    }).join('<hr>');
});
