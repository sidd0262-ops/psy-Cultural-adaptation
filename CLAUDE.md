# 문화적응 앱 (psy-Cultural-adaptation)

문화적응 유형을 알아보는 웹앱. 휴대폰에 설치할 수 있는 PWA 형태.

- GitHub: https://github.com/sidd0262-ops/psy-Cultural-adaptation (계정 sidd0262-ops)
- 파일: index.html, app.js, style.css, sw.js(서비스 워커), manifest.webmanifest, icons/

## 진행 상황 (2026-11-05 기준)
Mac에서 작업한 최근 커밋:
1. 설치형 이모지 스타일 앱(PWA)으로 재디자인
2. 설치 안내를 iPhone/Android 모두 Chrome 기준으로 변경
3. Chrome 번역 방식으로 전환 + 답변별 게시판 번역 추가

Windows PC에서 작업한 커밋:
4. 앱 안 번역(26개 언어, 설치한 앱에서도 동작) + 모든 안내창 왼쪽 위 ✕ 닫기 + 첫 방문 시 "앱으로 설치할까요?" 예/아니오 (b5ccff1)
   - 설치한 앱(standalone)에는 Chrome 메뉴가 없어 Chrome 번역을 못 씀 → 앱 자체 번역으로 대체
   - 아이폰은 웹에서 바로 설치 불가 → "예"를 누르면 홈 화면 추가 방법 안내

## 작업 환경
- 사용자는 Mac과 Windows PC를 오가며 작업함. 기기 간 동기화는 GitHub로 함.
  - 작업 시작 전: `git pull`
  - 작업 후: 커밋하고 `git push` (사용자에게 확인 후)
- Windows PC: Git, GitHub CLI 설치됨 (C:\Program Files\Git, C:\Program Files\GitHub CLI), gh 로그인 완료.
  - git 작성자 설정 완료 (global user.name=sidd0262-ops, user.email=sidd0262@gmail.com) — 그냥 `git commit` 하면 됨.
  - `icons/.claude/launch.json`은 로컬 미리보기 서버 설정(python http.server 8765)이라 커밋하지 않음.
- 사용자와는 한국어로 대화.
