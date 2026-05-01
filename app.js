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
let selectedChar = "남자";
let allPosts = [];
let currentPage = 1;
const postsPerPage = 5;

// 상세한 문화적응 모델 설명
const stones = ["주변화", "분리", "동화", "통합"];
const descs = [
    "주변화(Marginalization): 고유의 문화와 새로운 문화 양쪽 모두에서 소외감을 느끼며, 어디에도 속하지 못해 혼란을 겪는 상태입니다.",
    "분리(Separation): 자신의 뿌리 문화를 강하게 고수하며, 새로운 사회의 문화와는 의도적으로 거리를 두는 적응 방식입니다.",
    "동화(Assimilation): 새로운 사회에 완전히 적응하기 위해 자신의 고유 문화를 버리거나 맞추려 노력하는 상태입니다.",
    "통합(Integration): 자신의 고유한 문화를 소중히 유지하면서도, 새로운 문화의 장점을 조화롭게 받아들인 이상적인 상태입니다."
];
const questions = ["한국에 오게 된 이유", "나를 버티게 해준 것", "나에게 힘이 되는 말", "그만두고 싶었던 순간"];

// 캐릭터 선택
document.querySelectorAll('.char-opt').forEach(opt => {
    opt.onclick = (e) => {
        document.querySelectorAll('.char-opt').forEach(o => o.classList.remove('selected'));
        e.target.classList.add('selected');
        selectedChar = e.target.dataset.char;
        document.getElementById('family-form').classList.toggle('hidden', selectedChar !== "가족");
    };
});

// 멤버 추가
document.getElementById('add-btn').onclick = () => {
    const name = document.getElementById('user-name').value.trim();
    if(!name) { alert("이름을 입력해주세요."); return; }
    
    let role = "";
    if (selectedChar === "가족") {
        const gender = document.getElementById('gender-sel').value;
        const roleInput = document.getElementById('role-in').value.trim();
        role = `${gender} / ${roleInput}`;
    }

    members.push({ name, char: selectedChar, role, typeIdx: 1 }); // 기본값 '분리'
    
    document.getElementById('member-chips').innerHTML = members.map(m => 
        `<span style="display:inline-block; padding:5px 10px; background:#eee; border:2px solid #333; margin:5px;">
            ${m.char} 캐릭터 - <strong>${m.name}</strong> ${m.role ? '('+m.role+')' : ''}
        </span>`
    ).join('');
    
    document.getElementById('start-btn').classList.remove('hidden');
    document.getElementById('user-name').value = "";
    document.getElementById('role-in').value = "";
};

// 여정 시작 (직접 입력 창 렌더링)
document.getElementById('start-btn').onclick = () => {
    document.getElementById('survey-area').classList.remove('hidden');
    renderSurvey();
};

function renderSurvey() {
    document.getElementById('member-cards').innerHTML = members.map((m, mIdx) => `
        <div class="post-card">
            <h3>[${m.char}] ${m.name} ${m.role ? '('+m.role+')' : ''}</h3>
            
            <div class="stones" data-midx="${mIdx}">
                ${stones.map((s, sIdx) => `<div class="stone ${m.typeIdx === sIdx ? 'active' : ''}" data-sidx="${sIdx}">${s}</div>`).join('')}
            </div>
            <div class="speech-bubble">${descs[m.typeIdx]}</div>
            
            <div class="input-area">
                ${questions.map((q, qIdx) => `
                    <p><strong>Q${qIdx + 1}. ${q}</strong></p>
                    <textarea class="ans-box" data-midx="${mIdx}" data-qidx="${qIdx}" placeholder="이곳에 직접 답변을 적어주세요."></textarea>
                `).join('')}
            </div>
        </div>
    `).join('');
    
    // 징검다리 클릭 이벤트
    document.querySelectorAll('.stone').forEach(st => {
        st.onclick = (e) => {
            const midx = e.target.parentElement.dataset.midx;
            members[midx].typeIdx = parseInt(e.target.dataset.sidx);
            
            // 답변 내용 백업 (리렌더링 시 날아가는 것 방지)
            const textareas = document.querySelectorAll(`.ans-box[data-midx="${midx}"]`);
            const savedAnswers = Array.from(textareas).map(t => t.value);
            
            renderSurvey();
            
            // 답변 내용 복구
            const newTextareas = document.querySelectorAll(`.ans-box[data-midx="${midx}"]`);
            newTextareas.forEach((t, i) => t.value = savedAnswers[i] || "");
        };
    });
}

// 공유하기 (저장 로직 개선)
document.getElementById('share-btn').onclick = async () => {
    try {
        const finalData = members.map((m, mIdx) => ({
            name: m.name, char: m.char, role: m.role,
            type: stones[m.typeIdx],
            answers: Array.from(document.querySelectorAll(`.ans-box[data-midx="${mIdx}"]`)).map(a => a.value.trim())
        }));
        
        await addDoc(postsCol, { family: finalData, timestamp: new Date() });
        alert("성공적으로 공유되었습니다! 🎉"); 
        location.reload(); // 화면 새로고침하여 게시판에 즉시 반영
    } catch (error) {
        alert("오류가 발생했습니다. 파이어베이스 규칙을 확인해주세요.");
    }
};

// 실시간 게시판 및 블로그형 페이지네이션 렌더링
onSnapshot(query(postsCol, orderBy("timestamp", "desc")), (snap) => {
    allPosts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderFeed();
});

function renderFeed() {
    const start = (currentPage - 1) * postsPerPage;
    const paginated = allPosts.slice(start, start + postsPerPage);

    document.getElementById('feed-list').innerHTML = paginated.map(post => `
        <div class="post-card">
            <button class="eraser" onclick="window.delPost('${post.id}')">🧽</button>
            ${post.family.map(m => `
                <div style="margin-bottom: 20px;">
                    <div style="font-size: 1.1rem; border-bottom: 2px solid #333; padding-bottom: 5px; margin-bottom: 10px;">
                        <strong>[${m.char}] ${m.name}</strong> ${m.role ? '('+m.role+')' : ''} - <span style="color:#e91e63;">${m.type}</span>
                    </div>
                    ${m.answers.map((ans, qIdx) => `
                        <div class="qa-block">
                            <strong>Q. ${questions[qIdx]}</strong>
                            <span>A. ${ans || "답변 없음"}</span>
                        </div>
                    `).join('')}
                </div>
            `).join('<hr style="border: 2px dashed #ccc; margin: 20px 0;">')}
        </div>
    `).join('');
    
    renderPageNav();
}

// 5개 단위 페이지 번호 생성
function renderPageNav() {
    const total = Math.ceil(allPosts.length / postsPerPage);
    let html = '';
    for(let i = 1; i <= total; i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="window.setPage(${i})">${i}</button>`;
    }
    document.getElementById('page-nav').innerHTML = html;
}

window.setPage = (p) => { 
    currentPage = p; 
    renderFeed(); 
    // 페이지 이동 시 피드 상단으로 스크롤 부드럽게 이동
    document.getElementById('ui-feed-title').scrollIntoView({ behavior: 'smooth' });
};

// 개별 삭제 (지우개)
window.delPost = async (id) => {
    if(document.getElementById('admin-pw').value === '0530') {
        if(confirm("이 게시글을 삭제하시겠습니까?")) await deleteDoc(doc(db, "posts", id));
    } else {
        alert("비밀번호(0530)를 먼저 입력해주세요.");
    }
};

// 전체 삭제
document.getElementById('del-all').onclick = async () => {
    if(document.getElementById('admin-pw').value === '0530') {
        if(confirm("모든 데이터를 영구적으로 삭제하시겠습니까?")) {
            const s = await getDocs(postsCol);
            s.forEach(async d => await deleteDoc(doc(db, "posts", d.id)));
        }
    } else {
        alert("비밀번호(0530)를 먼저 입력해주세요.");
    }
};
