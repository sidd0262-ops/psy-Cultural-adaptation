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
let isDeleteMode = false; // ✨ 개별 삭제 모드 상태 변수

const stones = ["주변화", "분리", "동화", "통합"];
const descs = [
    "주변화(Marginalization): 고유의 문화와 새로운 문화 양쪽 모두에서 소외감을 느끼며, 어디에도 속하지 못해 혼란을 겪는 상태입니다.",
    "분리(Separation): 자신의 뿌리 문화를 강하게 고수하며, 새로운 사회의 문화와는 의도적으로 거리를 두는 적응 방식입니다.",
    "동화(Assimilation): 새로운 사회에 완전히 적응하기 위해 자신의 고유 문화를 버리거나 맞추려 노력하는 상태입니다.",
    "통합(Integration): 자신의 고유한 문화를 소중히 유지하면서도, 새로운 문화의 장점을 조화롭게 받아들인 이상적인 상태입니다."
];
const questions = ["한국에 오게 된 이유", "나를 버티게 해준 것", "나에게 힘이 되는 말", "그만두고 싶었던 순간"];

document.querySelectorAll('.char-opt').forEach(opt => {
    opt.onclick = (e) => {
        document.querySelectorAll('.char-opt').forEach(o => o.classList.remove('selected'));
        e.target.classList.add('selected');
        selectedChar = e.target.dataset.char;
        document.getElementById('family-form').classList.toggle('hidden', selectedChar !== "가족");
    };
});

document.getElementById('add-btn').onclick = () => {
    const name = document.getElementById('user-name').value.trim();
    if(!name) { alert("이름을 입력해주세요."); return; }
    let role = "";
    if (selectedChar === "가족") {
        const gender = document.getElementById('gender-sel').value;
        const roleInput = document.getElementById('role-in').value.trim();
        role = `${gender} / ${roleInput}`;
    }
    members.push({ name, char: selectedChar, role, typeIdx: 1 });
    document.getElementById('member-chips').innerHTML = members.map(m => 
        `<span style="display:inline-block; padding:8px 12px; background:#eee; border:2px solid #333; margin:5px; border-radius:4px;">
            ${m.char} - <strong>${m.name}</strong> ${m.role ? '('+m.role+')' : ''}
        </span>`
    ).join('');
    document.getElementById('start-btn').classList.remove('hidden');
    document.getElementById('user-name').value = "";
    document.getElementById('role-in').value = "";
};

document.getElementById('start-btn').onclick = () => {
    document.getElementById('survey-area').classList.remove('hidden');
    renderSurvey();
};

function renderSurvey() {
    document.getElementById('member-cards').innerHTML = members.map((m, mIdx) => `
        <div class="post-card">
            <h3 style="margin-top: 0;">[${m.char}] ${m.name} ${m.role ? '('+m.role+')' : ''}</h3>
            <div class="stones" data-midx="${mIdx}">
                ${stones.map((s, sIdx) => `<div class="stone ${m.typeIdx === sIdx ? 'active' : ''}" data-sidx="${sIdx}">${s}</div>`).join('')}
            </div>
            <div class="speech-bubble">${descs[m.typeIdx]}</div>
            <div class="input-area">
                ${questions.map((q, qIdx) => `
                    <p style="font-weight:bold; margin:15px 0 5px;">Q${qIdx + 1}. ${q}</p>
                    <textarea class="ans-box" data-midx="${mIdx}" data-qidx="${qIdx}" placeholder="이곳에 솔직한 마음을 적어주세요."></textarea>
                `).join('')}
            </div>
        </div>
    `).join('');
    
    document.querySelectorAll('.stone').forEach(st => {
        st.onclick = (e) => {
            const midx = e.target.parentElement.dataset.midx;
            members[midx].typeIdx = parseInt(e.target.dataset.sidx);
            const textareas = document.querySelectorAll(`.ans-box[data-midx="${midx}"]`);
            const savedAnswers = Array.from(textareas).map(t => t.value);
            renderSurvey();
            const newTextareas = document.querySelectorAll(`.ans-box[data-midx="${midx}"]`);
            newTextareas.forEach((t, i) => t.value = savedAnswers[i] || "");
        };
    });
}

document.getElementById('share-btn').onclick = async () => {
    try {
        const finalData = members.map((m, mIdx) => ({
            name: m.name, char: m.char, role: m.role,
            type: stones[m.typeIdx],
            answers: Array.from(document.querySelectorAll(`.ans-box[data-midx="${mIdx}"]`)).map(a => a.value.trim())
        }));
        await addDoc(postsCol, { family: finalData, timestamp: new Date() });
        alert("성공적으로 공유되었습니다! 🎉"); 
        location.reload();
    } catch (error) { alert("오류가 발생했습니다."); }
};

onSnapshot(query(postsCol, orderBy("timestamp", "desc")), (snap) => {
    allPosts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderFeed();
});

function renderFeed() {
    if (allPosts.length === 0) {
        document.getElementById('feed-list').innerHTML = "<p style='text-align:center;'>아직 이야기가 없습니다.</p>";
        return;
    }
    const start = (currentPage - 1) * postsPerPage;
    const paginated = allPosts.slice(start, start + postsPerPage);

    // ✨ 개별 지우개 버튼 삭제 & 클릭 이벤트(window.selectPost) 추가 ✨
    document.getElementById('feed-list').innerHTML = paginated.map(post => `
        <div class="post-card" onclick="window.selectPost('${post.id}')">
            ${post.family.map(m => `
                <div style="margin-bottom: 25px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #333; padding-bottom: 8px; margin-bottom: 15px;">
                        <span style="font-size: 1.2rem;"><strong>[${m.char}] ${m.name}</strong> ${m.role ? '<span style="font-size:1rem;">('+m.role+')</span>' : ''}</span>
                        <span style="color:#e91e63; font-size:1.1rem; font-weight:bold;">${m.type}</span>
                    </div>
                    <div class="qa-list">
                        ${m.answers.map((ans, qIdx) => `
                            <div class="qa-item">
                                <span class="q-text">Q${qIdx + 1}. ${questions[qIdx]}</span>
                                <span class="a-text">${ans || "작성된 답변이 없습니다."}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('<hr style="border: 2px dashed #bbb; margin: 30px 0;">')}
        </div>
    `).join('');
    renderPageNav();
}

function renderPageNav() {
    const total = Math.ceil(allPosts.length / postsPerPage);
    let html = '';
    for(let i = 1; i <= total; i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="window.setPage(${i})">${i}</button>`;
    }
    document.getElementById('page-nav').innerHTML = html;
}

window.setPage = (p) => { currentPage = p; renderFeed(); window.scrollTo(0, document.getElementById('feed-title').offsetTop); };

// ✨ 지우개 버튼 클릭 시 모드 발동 ✨
document.getElementById('delete-mode-btn').onclick = () => {
    isDeleteMode = true;
    document.body.classList.add('delete-mode-active');
    alert("지우고 싶은 게시물을 클릭해주세요.");
};

// ✨ 게시물 클릭 시 삭제 진행 로직 (비밀번호 입력 팝업) ✨
window.selectPost = async (id) => {
    if (!isDeleteMode) return; // 삭제 모드가 아니면 클릭해도 아무 반응 없음

    // 비밀번호 입력 팝업창 (힌트 없음)
    const pwInput = prompt("이 게시물을 삭제하려면 비밀번호를 입력하세요.");

    if (pwInput === '0530') {
        await deleteDoc(doc(db, "posts", id));
        alert("삭제 완료되었습니다.");
    } else if (pwInput !== null && pwInput !== "") {
        // 취소를 누르지 않고 틀린 번호를 입력했을 때
        alert("비밀번호를 올바르게 입력해주세요.");
    }

    // 성공하든 취소하든 삭제 모드 종료 및 UI 복구
    isDeleteMode = false;
    document.body.classList.remove('delete-mode-active');
};

// 전체 삭제 로직
document.getElementById('del-all').onclick = async () => {
    const pwInput = document.getElementById('admin-pw').value;
    if(pwInput === '0530') {
        if(confirm("전체 삭제하시겠습니까? (복구 불가)")) {
            const s = await getDocs(postsCol);
            s.forEach(async d => await deleteDoc(doc(db, "posts", d.id)));
            alert("전체 삭제가 완료되었습니다.");
            document.getElementById('admin-pw').value = ""; // 비밀번호 칸 비우기
        }
    } else { 
        alert("비밀번호를 올바르게 입력해주세요."); 
    }
};
