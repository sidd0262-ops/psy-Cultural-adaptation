// [1] Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyCO9ZM-CM4rDIizZPHxo_Tx0ST89fADrgc",
  authDomain: "maum-project-f249b.firebaseapp.com",
  projectId: "maum-project-f249b",
  storageBucket: "maum-project-f249b.firebasestorage.app",
  messagingSenderId: "638023840601",
  appId: "1:638023840601:web:c55ce7b2a80e6d6018d248",
  measurementId: "G-QWLY7S3MK0"
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const postsCollection = collection(db, "posts");

let members = [];
let currentAvatar = "👨";

// [2] 문화적응 유형 설명 (요청하신 순서: 주변화 -> 분리 -> 동화 -> 통합)
const typesDesc = {
    m: "주변화(Marginalization): 양쪽 문화 모두에서 소외감을 느끼며 어디에도 속하지 못한 상태입니다.",
    s: "분리(Separation): 자신의 뿌리 문화를 고수하며 새로운 문화와는 거리를 두는 방식입니다.",
    a: "동화(Assimilation): 새로운 사회에 적응하기 위해 자신의 문화를 맞추거나 변화시키려 노력합니다.",
    i: "통합(Integration): 고유의 문화를 유지하면서도 새로운 문화의 장점을 조화롭게 받아들인 상태입니다."
};

// [3] 아바타 선택 및 상세 입력 제어
document.querySelectorAll('.emoji-opt').forEach(el => {
    el.addEventListener('click', (e) => {
        document.querySelectorAll('.emoji-opt').forEach(opt => opt.classList.remove('selected'));
        e.target.classList.add('selected');
        currentAvatar = e.target.dataset.emoji;
        
        // 가족 아이콘(👨‍👩‍👧‍👦) 선택 시에만 성별/역할 입력창 노출
        const detailArea = document.getElementById('family-detail-area');
        detailArea.style.display = (currentAvatar === "👨‍👩‍👧‍👦") ? "block" : "none";
    });
});

// [4] 멤버 추가
document.getElementById('add-member-btn').addEventListener('click', () => {
    const name = document.getElementById('new-name').value.trim();
    const gender = document.getElementById('gender-select').value;
    const role = document.getElementById('role-input').value.trim(); // 아들, 딸, 몇째 자녀 등

    if(!name) return alert("이름을 입력해주세요.");

    let displayRole = (currentAvatar === "👨‍👩‍👧‍👦") ? `${gender} / ${role}` : gender;
    
    members.push({ name, avatar: currentAvatar, role: displayRole });
    renderChips();
    
    document.getElementById('new-name').value = "";
    document.getElementById('role-input').value = "";
});

function renderChips() {
    const container = document.getElementById('member-chips');
    container.innerHTML = members.map(m => `
        <div class="chip"><strong>${m.avatar} ${m.name}</strong> (${m.role})</div>
    `).join('');
    if(members.length > 0) document.getElementById('start-btn').classList.remove('hidden');
}

// [5] 스펙트럼 슬라이더 (순서 반영: 0~25 주변화 / 26~50 분리 / 51~75 동화 / 76~100 통합)
document.getElementById('start-btn').addEventListener('click', () => {
    document.getElementById('question-section').classList.remove('hidden');
    const container = document.getElementById('dynamic-cards');

    container.innerHTML = members.map((m, idx) => `
        <div class="member-card">
            <h3>${m.avatar} ${m.name} (${m.role})님의 스펙트럼</h3>
            <input type="range" class="spectrum-slider" data-idx="${idx}" min="0" max="100" value="50">
            <div class="speech-bubble" id="bubble-${idx}">${typesDesc.s}</div>
            <div class="input-area">
                <textarea class="ans-box" data-idx="${idx}" placeholder="한국에 오게 된 이유"></textarea>
                <textarea class="ans-box" data-idx="${idx}" placeholder="나를 버티게 해준 것"></textarea>
                <textarea class="ans-box" data-idx="${idx}" placeholder="나에게 힘이 되는 말"></textarea>
                <textarea class="ans-box" data-idx="${idx}" placeholder="그만두고 싶었던 순간"></textarea>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.spectrum-slider').forEach(slider => {
        slider.addEventListener('input', (e) => {
            const val = e.target.value;
            const bubble = document.getElementById(`bubble-${e.target.dataset.idx}`);
            if(val <= 25) bubble.innerText = typesDesc.m;
            else if(val <= 50) bubble.innerText = typesDesc.s;
            else if(val <= 75) bubble.innerText = typesDesc.a;
            else bubble.innerText = typesDesc.i;
        });
    });
});

// [6] 데이터 저장 및 실시간 게시판
document.getElementById('share-btn').addEventListener('click', async () => {
    try {
        const familyData = members.map((m, idx) => ({
            name: m.name, avatar: m.avatar, role: m.role,
            type: document.getElementById(`bubble-${idx}`).innerText,
            answers: Array.from(document.querySelectorAll(`.ans-box[data-idx="${idx}"]`)).map(a => a.value)
        }));
        await addDoc(postsCollection, { timestamp: new Date(), family: familyData });
        alert("공유되었습니다! 🎉");
        location.reload();
    } catch (e) {
        alert("저장 실패! 파이어베이스 규칙 게시 버튼을 눌렀는지 확인하세요.");
    }
});

onSnapshot(query(postsCollection, orderBy("timestamp", "desc")), (snapshot) => {
    const feed = document.getElementById('feed-container');
    feed.innerHTML = snapshot.docs.map(doc => {
        const data = doc.data();
        return `<div class="post-group">
            ${data.family.map(m => `
                <div class="post-card">
                    <strong>${m.avatar} ${m.name}</strong> (${m.role}) | <small>${m.type}</small>
                    <p>${m.answers.filter(a => a).join(' / ')}</p>
                </div>
            `).join('')}
        </div><hr>`;
    }).join('');
});
