# 🚀 Antigravity 제재 우회 (Vercel 릴레이)

제재 및 지역 제한 국가에서 Google Antigravity 및 Gemini 모델에 오류 없이 원활하게 접속할 수 있도록 지원하는 Antigravity 공식 플러그인입니다.

---

## ✨ 주요 기능
- **제재 국가 자동 감지**: IP 위치를 확인하여 제한 지역인 경우 Vercel Edge 릴레이를 통해 자동으로 트래픽을 전달합니다.
- **403 / Region Not Supported 오류 제거**: 글로벌 엣지 네트워크를 통해 미국 및 유럽 데이터센터에서 안전하게 요청을 처리합니다.
- **DNS 변조 방지**: 로컬 통신사의 DNS 오류 발생 시 Vercel Anycast 직결 IP로 자동 전환됩니다.
- **무료 개인 릴레이 지원**: 누구나 1분 안에 무료 Vercel 계정에서 개인 릴레이를 배포할 수 있습니다.

---

## 🛠️ 터미널 명령어 (`agy-relay`)
```bash
agy-relay status          # 상태 및 핑 테스트 확인
agy-relay set <url>       # 새 릴레이 URL 설정
agy-relay test            # Gemini 연결 테스트
agy-relay start           # 백그라운드 브릿지 시작
agy-relay restart         # 브릿지 재시작
agy-relay stop            # 브릿지 중지
agy-relay lang ko         # 기본 언어를 한국어로 설정
agy-relay guide           # 무료 개인 릴레이 배포 가이드
```
