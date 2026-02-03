---
date: 2026-01-28
tags: [#gemini, #model-upgrade, #pm-agent-system]
project: pm-agent-system
---

## 해결 문제 (Context)
- pm-agent-system에서 구버전 모델(gemini-2.0-flash) 사용 중 → 최신 모델로 업그레이드 필요

## 최종 핵심 로직 (Solution)

### 사용 가능한 Gemini 모델 (2026-01-28 기준)
```
✅ gemini-2.0-flash      - 안정 버전
✅ gemini-2.0-flash-lite - 경량 버전
✅ gemini-2.5-flash      - 최신 안정
✅ gemini-2.5-pro        - 고성능
✅ gemini-3-flash-preview - 최신 프리뷰
```

### 모델 테스트 코드
```javascript
const models = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-3-flash-preview'];
for (const modelName of models) {
  const model = genAI.getGenerativeModel({ model: modelName });
  await model.generateContent('Hi');
}
```

### config.js 변경
```javascript
// Before
GEMINI_MODEL: 'gemini-2.0-flash',

// After
GEMINI_MODEL: 'gemini-3-flash-preview',
```

## 핵심 통찰 (Learning & Decision)

- **Problem:** 구버전 모델 사용 중, 최신 모델 사용 가능 여부 불명확
- **Decision:** gemini-3-flash-preview 선택 (최신 기능, 프리뷰지만 안정적으로 작동)
- **Next Step:**
  - 프리뷰 → 정식 출시 시 모델명 업데이트 필요
  - 다른 프로젝트(news-scraper, b2b-lead-agent 등)도 업그레이드 고려
