---
date: 2026-01-29
tags: [#render, #migration, #cors, #gemini, #deploy]
project: pm-agent-system
---

## 해결 문제 (Context)
- Cloudflare Worker에서 Gemini API 지역 차단 → Express 서버를 Render에 배포하여 우회

## 최종 핵심 로직 (Solution)

### 아키텍처 변경
```
[Before] GitHub Pages → Cloudflare Worker → Gemini API (지역 차단)
[After]  GitHub Pages → Render (Express) → Gemini API
```

### 수정/생성 파일 (6개)
| 파일 | 변경 |
|------|------|
| `render.yaml` | 신규 — Render 배포 설정, `GEMINI_API_KEY` sync:false |
| `.env.example` | 신규 — 환경변수 문서화 |
| `server.js` | CORS 미들웨어 추가 (dooosp.github.io, localhost 허용) |
| `services/gemini.js` | generateJSON 에러 핸들링 (빈 응답/JSON 추출 실패 → 명시적 에러) |
| `orchestrator/pipeline.js` | generateDocumentDirect 메서드 추가 (세션 유실 fallback) |
| `public/app.js` | API_BASE를 Worker URL → Render URL로 변경 |

### CORS 미들웨어 (server.js)
```javascript
const ALLOWED_ORIGINS = [
  'https://dooosp.github.io',
  'http://localhost:3002',
  'http://127.0.0.1:3002'
];
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
```

### Gemini 에러 핸들링 (services/gemini.js)
```javascript
// 빈 응답 → 명시적 에러
if (!response || response.trim().length === 0) {
  throw new Error('Gemini가 빈 응답을 반환했습니다.');
}
// JSON 추출 실패 → 응답 앞 200자 포함 에러
if (!jsonMatch) {
  throw new Error(`JSON 추출 불가. 응답: ${jsonStr.substring(0, 200)}`);
}
```

## 핵심 통찰 (Learning & Decision)
- **Problem:** Render 배포 후 Gemini API `API_KEY_INVALID` 에러 지속
- **Decision:** curl로 로컬 키 직접 테스트 → 키 자체가 만료/무효 상태 확인. 코드 문제 아님
- **Root Cause:** `~/.secrets/.env`의 GEMINI_API_KEY가 무효화된 상태 (403 PERMISSION_DENIED)
- **Next Step:**
  1. Google AI Studio에서 새 API 키 발급
  2. `~/.secrets/.env` + Render 대시보드 환경변수 모두 교체
  3. `server.js`의 디버그 로그 (`[Config] GEMINI_API_KEY...`) 제거
  4. E2E 검증 (GitHub Pages → Render → Gemini 정상 응답 확인)
