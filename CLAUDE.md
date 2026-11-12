# 문화적응 앱 (psy-Cultural-adaptation)

문화적응 유형을 알아보는 웹앱. 휴대폰에 설치할 수 있는 PWA 형태.

- GitHub: https://github.com/sidd0262-ops/psy-Cultural-adaptation (계정 sidd0262-ops)
- 위치(Windows): 메인 폴더 `Desktop\클로드 코드\` 안의 `문화적응앱\` 폴더 (2026-11-06에 옮김)
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

## 내 프로젝트 생태계 (모든 저장소 공통)
GitHub 계정 `sidd0262-ops` 를 기준으로 Windows PC · Mac · 아이폰(클라우드 세션)에서 같은 코드를 씁니다.

| 저장소 | 내용 |
| --- | --- |
| Short-english | 쇼츠로 배우는 영어 회화 PWA (TypeScript, Render 배포) |
| coffee-log | 카페인 조절 기록지 PWA |
| psy-Cultural-adaptation | 문화적응 여정 PWA (Firebase) |
| timebox | 나만 쓰는 한지 타임박스 PWA |
| mind-project | 마음프로젝트 소개 페이지 |

- **폴더 위치:** Windows `Desktop\클로드 코드\` · Mac `~/Desktop/클로드 코드/` (폴더 이름은 저장소 이름과 달라도 됨)
- **한 번에 최신화:** Short-english 저장소의 `workspace/sync-all.ps1`(Windows) · `workspace/sync-all.sh`(Mac). 없는 저장소는 받고, 있는 저장소는 pull
- **작업 규칙**
  1. 시작 전 `git pull` (클라우드 세션은 항상 최신으로 시작)
  2. 끝나면 커밋하고 `git push` (사용자에게 확인 후). 로컬에만 두면 다른 기기에서 안 보임
  3. 같은 저장소를 두 기기에서 동시에 수정하지 않기
  4. API 키·비밀번호는 코드와 채팅에 쓰지 않기 (`.env`, 배포 서비스 환경변수 사용)
  5. 작업이 끝나면 이 파일의 "진행 상황"을 갱신해서 다음 기기·세션이 이어받게 하기
- 사용자와는 한국어로 대화
