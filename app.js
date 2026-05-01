// ==========================================
// 1. 설정 (Configuration)
// ==========================================

// TODO: 아래 YOUR_GEMINI_API_KEY 부분에 발급받은 Gemini API 키를 넣으세요.
const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY";

// TODO: Firebase 콘솔에서 프로젝트 설정 -> 웹 앱 추가 후 아래 정보를 덮어쓰세요.
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// ==========================================
// 2. Firebase 초기화 및 모듈 로드
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const postsCollection = collection(db, "posts");

// 전역 상태
let currentUser = { name: "", avatar: "😊" };

// ==========================================
// 3. UI 로직 (온보딩 및 스펙트럼)
// ==========================================

// 이모지 선택 로직
document.querySelectorAll('.emoji').forEach(el => {
    el.addEventListener('click', (e) => {
        document.querySelectorAll('.emoji').forEach(em => em.classList.remove('selected'));
        e.target.classList.add('selected');
        currentUser.avatar = e.target.textContent;
    });
});

// 시작하기 버튼 로직
document.getElementById('start-btn').addEventListener('click', () => {
    const nameInput = document.getElementById('nickname-input').value.trim();
    if (!nameInput) {
        alert("닉네임을 입력해주세요! (Please enter a nickname)");
        return;
    }
    currentUser.name = nameInput;
    document.getElementById('user-avatar').textContent = currentUser.avatar;
    document.getElementById('user-name').textContent = currentUser.name;
    
    // 화면 전환
    document.getElementById('onboarding-screen').classList.remove('active');
    document.getElementById('main-screen').classList.add('active');
    document.getElementById('main-screen').classList.remove('hidden');
});

// 스펙트럼 슬라이더 위치 계산
const slider = document.getElementById('acculturation-slider');
const stageDisplay = document.getElementById('current-stage-display');

function getStageText(value) {
    if (value <= 25) return "Marginalization (주변화)";
    if (value <= 50) return "Separation (분리)";
    if (value <= 75) return "Assimilation (동화)";
    return "Integration (통합)";
}

slider.addEventListener('input', (e) => {
    stageDisplay.innerHTML = `현재 위치: <strong>${getStageText(e.target.value)}</strong> 구간 즈음`;
});

// ==========================================
// 4. 데이터 공유 (Firebase 연동)
// ==========================================

document.getElementById('share-btn').addEventListener('click', async () => {
    const q1 = document.getElementById('q1').value.trim();
    const q2 = document.getElementById('q2').value.trim();
    const q3 = document.getElementById('q3').value.trim();
    const q4 = document.getElementById('q4').value.trim();

    if (!q1 && !q2 && !q3 && !q4) {
        alert("하나 이상의 경험을 입력해주세요!");
        return;
    }

    try {
        await addDoc(postsCollection, {
            author: currentUser.name,
            avatar: currentUser.avatar,
            stage: getStageText(slider.value),
            answers: { q1, q2, q3, q4 },
            timestamp: new Date().getTime()
        });

        // 폼 초기화
        ['q1', 'q2', 'q3', 'q4'].forEach(id => document.getElementById(id).value = '');
        alert("소중한 경험이 공유되었습니다. 💖");
    } catch (e) {
        console.error("Error adding document: ", e);
        alert("업로드 중 오류가 발생했습니다.");
    }
});

// 피드 실시간 렌더링
const feedContainer = document.getElementById('feed-container');
const q = query(postsCollection, orderBy("timestamp", "desc"));

onSnapshot(q, (snapshot) => {
    feedContainer.innerHTML = '';
    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const docId = docSnap.id;
        
        const card = document.createElement('div');
        card.className = 'post-card';
        
        // 본인 글인 경우 삭제 버튼 활성화
        const deleteBtnHTML = data.author === currentUser.name 
            ? `<button class="action-btn delete-btn" onclick="deletePost('${docId}')"><i class="fas fa-trash"></i> 삭제</button>` 
            : '';

        card.innerHTML = `
            <div class="post-header">
                <div><span>${data.avatar}</span> ${data.author}</div>
                <div class="post-stage">${data.stage}</div>
            </div>
            <div class="post-body" id="body-${docId}">
                ${data.answers.q1 ? `<p><strong>오게 된 이유:</strong> ${data.answers.q1}</p>` : ''}
                ${data.answers.q2 ? `<p><strong>버티게 해준 것:</strong> ${data.answers.q2}</p>` : ''}
                ${data.answers.q3 ? `<p><strong>힘이 되는 말:</strong> ${data.answers.q3}</p>` : ''}
                ${data.answers.q4 ? `<p><strong>그만두고 싶었던 순간:</strong> ${data.answers.q4}</p>` : ''}
            </div>
            <div class="post-actions">
                <button class="action-btn translate-btn" onclick="translatePost('${docId}')"><i class="fas fa-language"></i> 번역 (Translate)</button>
                ${deleteBtnHTML}
            </div>
        `;
        feedContainer.appendChild(card);
    });
});

// 게시글 삭제 함수 (전역 스코프 노출)
window.deletePost = async (docId) => {
    if(confirm("정말 이 글을 삭제하시겠습니까?")) {
        await deleteDoc(doc(db, "posts", docId));
    }
};

// ==========================================
// 5. 다국어 번역 (Gemini API 연동)
// ==========================================

window.translatePost = async (docId) => {
    const bodyElement = document.getElementById(`body-${docId}`);
    const originalText = bodyElement.innerText;
    
    // 사용자 브라우저 언어 감지
    const targetLang = navigator.language.startsWith('ko') ? 'Korean' : 'English';
    
    bodyElement.innerHTML = `<p style="color:#888;">Translating... ⏳</p>`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: `Translate the following text to ${targetLang} naturally. Only provide the translated text without extra comments.\n\nText:\n${originalText}` }]
                }]
            })
        });

        const data = await response.json();
        const translatedText = data.candidates[0].content.parts[0].text;
        
        // 줄바꿈 보존하여 렌더링
        bodyElement.innerHTML = `<p>${translatedText.replace(/\n/g, '<br>')}</p>`;
    } catch (error) {
        console.error("Translation Error:", error);
        bodyElement.innerHTML = `<p style="color:red;">번역에 실패했습니다. (API Key 설정 또는 네트워크 확인)</p><p>${originalText}</p>`;
    }
};

// ==========================================
// 6. 관리자 리셋 기능 (0530)
// ==========================================
const adminInput = document.getElementById('admin-input');
adminInput.addEventListener('keyup', async (e) => {
    if (e.key === 'Enter' && adminInput.value === '0530') {
        if(confirm("🚨 경고: 모든 데이터베이스를 초기화하시겠습니까?")) {
            const querySnapshot = await getDocs(postsCollection);
            querySnapshot.forEach(async (documentSnap) => {
                await deleteDoc(doc(db, "posts", documentSnap.id));
            });
            alert("✅ 초기화가 완료되었습니다.");
            adminInput.value = '';
        }
    }
});
