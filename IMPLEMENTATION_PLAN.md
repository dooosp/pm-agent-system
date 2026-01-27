# PM Agent System - Implementation Plan

> **Status**: ✅ 구현 완료
> **Author**: Claude Code (Staff Engineer)
> **Date**: 2026-01-27
> **Completed**: 2026-01-27

---

## 1. Executive Summary

PM/PO 업무 프로세스를 4단계 독립 에이전트로 모듈화한 Multi-Agent Orchestration 시스템.

```
Input Agent → Analysis Agent → Planning Agent → Output Agent
(The Scout)   (The Brain)      (The Architect)  (The Closer)
```

**핵심 가치**:
- 토큰 효율성: 단계별 필요한 프롬프트만 로드
- 전문성 강화: 에이전트별 페르소나 부여
- 디버깅 용이: 문제 단계 즉시 파악 가능

---

## 2. Architecture Overview

### 2.1 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Web UI (Express)                        │
│                     http://localhost:3002                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Orchestrator                             │
│              (Pipeline Controller)                           │
└─────────────────────────────────────────────────────────────┘
          │              │              │              │
          ▼              ▼              ▼              ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Input     │  │  Analysis   │  │  Planning   │  │   Output    │
│   Agent     │──▶│   Agent     │──▶│   Agent     │──▶│   Agent     │
│ (The Scout) │  │ (The Brain) │  │(The Architect)│ │(The Closer) │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
      │                │                │                │
      ▼                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Gemini API Service                        │
│                   (Shared AI Provider)                       │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Directory Structure

```
/home/taeho/pm-agent-system/
├── package.json
├── config.js                     # 환경설정 + API 키
├── server.js                     # Express 서버
│
├── services/
│   └── gemini.js                 # Gemini API 래퍼 (재사용)
│
├── agents/
│   ├── input/                    # 1. The Scout
│   │   ├── index.js              # 에이전트 메인
│   │   ├── sources/
│   │   │   ├── google-news.js    # Google News RSS
│   │   │   └── rss-parser.js     # 범용 RSS 파서
│   │   ├── noise-filter.js       # 노이즈 제거
│   │   └── tagger.js             # 데이터 태깅 (AI)
│   │
│   ├── analysis/                 # 2. The Brain
│   │   ├── index.js              # 에이전트 메인
│   │   ├── rca.js                # Root Cause Analysis
│   │   ├── mece.js               # MECE 구조화
│   │   └── impact-calculator.js  # 비즈니스 임팩트 계산
│   │
│   ├── planning/                 # 3. The Architect
│   │   ├── index.js              # 에이전트 메인
│   │   ├── prioritizer.js        # RICE 우선순위
│   │   ├── roadmap.js            # 로드맵 생성
│   │   └── risk-analyzer.js      # 리스크 분석
│   │
│   └── output/                   # 4. The Closer
│       ├── index.js              # 에이전트 메인
│       ├── prd-generator.js      # PRD 문서 생성
│       ├── one-pager.js          # 경영진용 요약
│       └── objection-handler.js  # 반박 대응 준비
│
├── orchestrator/
│   └── pipeline.js               # 에이전트 체이닝 로직
│
├── public/                       # 웹 UI
│   ├── index.html
│   ├── app.js
│   └── style.css
│
└── data/
    ├── sessions/                 # 세션 저장 (JSON)
    └── cache/                    # RSS 캐시
```

---

## 3. Agent Specifications

### 3.1 Input Agent (The Scout)

**역할**: 뉴스/RSS에서 PM 관련 정보 수집 및 구조화

**Input**: 사용자 쿼리 (예: "반도체 장비 시장 동향", "SaaS 고객 이탈")

**Output**:
```json
{
  "query": "반도체 장비 시장",
  "collectedAt": "2026-01-27T07:00:00Z",
  "items": [
    {
      "title": "ASML, 2026년 EUV 장비 수주 급증",
      "source": "한국경제",
      "url": "https://...",
      "content": "기사 본문 요약...",
      "tags": ["market_trend", "competitor", "technology"],
      "relevanceScore": 0.85
    }
  ],
  "summary": {
    "total": 15,
    "filtered": 8,
    "byTag": { "market_trend": 3, "competitor": 2, "technology": 3 }
  }
}
```

**페르소나**: 비판적 정보 정찰병
- "출처가 불분명한 정보는 버린다"
- "중복 정보는 하나로 통합한다"
- "비즈니스 임팩트 없는 정보는 필터링한다"

**재사용 코드**:
- `b2b-lead-agent/scout.js` → 멀티소스 수집 로직
- `news-scraper` → Google News RSS 파싱

---

### 3.2 Analysis Agent (The Brain)

**역할**: 수집된 데이터에서 근본 원인과 인사이트 도출

**Input**: Input Agent의 output

**Output**:
```json
{
  "problems": [
    {
      "id": "P001",
      "statement": "EUV 장비 리드타임 증가로 고객사 생산 차질",
      "rootCauses": [
        {
          "level": 1,
          "cause": "글로벌 공급망 병목"
        },
        {
          "level": 2,
          "cause": "핵심 부품(광학계) 단일 공급사 의존"
        }
      ],
      "meceBreakdown": {
        "internal": ["생산 Capa 부족", "품질 이슈"],
        "external": ["공급망", "규제", "경쟁"]
      },
      "businessImpact": {
        "revenue": "-15% (Q2 예상)",
        "customer": "3개 Tier-1 고객 이탈 리스크",
        "market": "경쟁사 점유율 확대 가능성"
      }
    }
  ],
  "insights": [
    "단일 공급사 리스크 → 이중화 전략 필요",
    "고객 커뮤니케이션 강화로 이탈 방지 가능"
  ]
}
```

**페르소나**: 냉철한 분석가
- "현상이 아닌 원인을 찾는다 (5-Why)"
- "중복과 누락 없이 쪼갠다 (MECE)"
- "숫자로 임팩트를 증명한다"

**재사용 코드**:
- `anti-echo-chamber/perspective-generator.js` → Gemini 분석 패턴

---

### 3.3 Planning Agent (The Architect)

**역할**: 분석 결과를 실행 가능한 전략으로 변환

**Input**: Analysis Agent의 output

**Output**:
```json
{
  "objectives": [
    {
      "id": "O001",
      "description": "EUV 장비 리드타임 30% 단축",
      "keyResults": [
        "KR1: 대체 공급사 2곳 확보 (Q2)",
        "KR2: 내부 생산 Capa 20% 확대 (Q3)",
        "KR3: 고객 조기 경보 시스템 구축 (Q2)"
      ]
    }
  ],
  "initiatives": [
    {
      "id": "I001",
      "title": "공급망 이중화 프로젝트",
      "rice": {
        "reach": 8,
        "impact": 9,
        "confidence": 7,
        "effort": 6,
        "score": 84
      },
      "priority": "P0",
      "owner": "Supply Chain Team",
      "timeline": "2026-Q2 ~ Q3"
    }
  ],
  "risks": [
    {
      "id": "R001",
      "description": "대체 공급사 품질 미달",
      "probability": "Medium",
      "impact": "High",
      "mitigation": "3개월 시범 생산 후 단계적 확대"
    }
  ],
  "roadmap": {
    "Q2": ["I001 착수", "KR3 완료"],
    "Q3": ["I001 완료", "KR2 완료"],
    "Q4": ["성과 측정 및 보고"]
  }
}
```

**페르소나**: 실리콘밸리 시니어 PM
- "가장 적은 리소스로 최대 효과"
- "리스크는 미리 대비한다"
- "실행 가능한 계획만 세운다"

**재사용 코드**:
- `topdown-learner/agents/` → 페르소나 기반 프롬프트 구조

---

### 3.4 Output Agent (The Closer)

**역할**: 이해관계자별 맞춤 문서 생성

**Input**: Planning Agent의 output + 문서 타입 선택

**Output Types**:

1. **PRD (Product Requirements Document)**
   - 개발팀용 상세 요구사항
   - User Story, Acceptance Criteria 포함

2. **One-Pager (경영진 요약)**
   - 1장 분량 핵심 요약
   - 문제-해결책-기대효과-리스크

3. **Stakeholder Briefing**
   - 이해관계자별 맞춤 메시지
   - 예상 질문 및 답변 준비

```json
{
  "documentType": "one-pager",
  "content": {
    "title": "EUV 장비 공급망 안정화 프로젝트",
    "problem": "리드타임 증가로 Q2 매출 15% 감소 예상",
    "solution": "공급망 이중화 + 내부 Capa 확대",
    "expectedOutcome": "리드타임 30% 단축, 고객 이탈 방지",
    "investment": "$2M (6개월)",
    "risks": "대체 공급사 품질 리스크 → 시범 생산으로 완화",
    "askForApproval": "Q2 착수 승인 요청"
  },
  "objectionHandling": [
    {
      "question": "왜 지금 해야 하나요?",
      "answer": "Q2 이후 경쟁사 대응 시 시장 점유율 회복 불가"
    }
  ]
}
```

**페르소나**: 설득의 달인
- "듣는 사람의 언어로 말한다"
- "반대 의견에 미리 대비한다"
- "행동을 이끌어내는 문서를 만든다"

---

## 4. Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                        User Query                                 │
│              "반도체 장비 시장 동향 분석해줘"                      │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  [1] Input Agent                                                  │
│  - Google News RSS 검색                                           │
│  - 15개 기사 수집 → 8개 필터링                                    │
│  - 태깅: market_trend(3), competitor(2), technology(3)           │
└──────────────────────────────────────────────────────────────────┘
                              │
                    { items: [...], summary: {...} }
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  [2] Analysis Agent                                               │
│  - 핵심 문제 3개 도출                                             │
│  - 각 문제별 5-Why RCA                                            │
│  - MECE 구조화 + 비즈니스 임팩트 계산                             │
└──────────────────────────────────────────────────────────────────┘
                              │
                    { problems: [...], insights: [...] }
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  [3] Planning Agent                                               │
│  - OKR 수립                                                       │
│  - RICE 기반 이니셔티브 우선순위                                  │
│  - 리스크 분석 + 로드맵 생성                                      │
└──────────────────────────────────────────────────────────────────┘
                              │
                    { objectives: [...], initiatives: [...], roadmap: {...} }
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  [4] Output Agent                                                 │
│  - 사용자 선택: PRD / One-Pager / Briefing                        │
│  - 맞춤 문서 생성                                                 │
│  - 예상 질문 및 반박 대응 준비                                    │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                        Final Document                             │
│              (Markdown / HTML / PDF)                              │
└──────────────────────────────────────────────────────────────────┘
```

---

## 5. Tech Stack

| 구분 | 기술 | 이유 |
|------|------|------|
| Runtime | Node.js 18+ | 기존 프로젝트 호환 |
| Server | Express.js | topdown-learner 구조 재사용 |
| AI | Gemini API (gemini-2.0-flash) | 기존 API 키 활용 |
| RSS | rss-parser | 검증된 라이브러리 |
| HTTP | axios | 뉴스 크롤링용 |
| UI | Vanilla JS + CSS | 경량화, 빠른 개발 |

---

## 6. API Endpoints

### 6.1 Main Flow

```
POST /api/analyze
Body: { query: "반도체 장비 시장 동향" }
Response: { sessionId, inputResult, analysisResult, planningResult }

POST /api/generate-document
Body: { sessionId, documentType: "one-pager" | "prd" | "briefing" }
Response: { document: { ... } }
```

### 6.2 Individual Agents (선택적 실행)

```
POST /api/agents/input
Body: { query: "..." }
Response: { items: [...], summary: {...} }

POST /api/agents/analysis
Body: { inputData: {...} }
Response: { problems: [...], insights: [...] }

POST /api/agents/planning
Body: { analysisData: {...} }
Response: { objectives: [...], initiatives: [...], roadmap: {...} }

POST /api/agents/output
Body: { planningData: {...}, documentType: "..." }
Response: { document: {...} }
```

### 6.3 Session Management

```
GET /api/sessions
Response: [{ id, query, createdAt, status }]

GET /api/sessions/:id
Response: { full session data }
```

---

## 7. Implementation Phases

### Phase A: 기반 구조 (예상 파일 수: 8개)
1. 프로젝트 초기화 (package.json, config.js)
2. Gemini 서비스 래퍼 (services/gemini.js)
3. Express 서버 기본 구조 (server.js)
4. 기본 웹 UI (public/*)
5. Orchestrator 뼈대 (orchestrator/pipeline.js)

### Phase B: Input Agent (예상 파일 수: 4개)
1. Google News RSS 수집 (agents/input/sources/google-news.js)
2. 범용 RSS 파서 (agents/input/sources/rss-parser.js)
3. 노이즈 필터 (agents/input/noise-filter.js)
4. AI 태거 (agents/input/tagger.js)
5. 에이전트 메인 (agents/input/index.js)

### Phase C: Analysis Agent (예상 파일 수: 4개)
1. RCA 모듈 (agents/analysis/rca.js)
2. MECE 구조화 (agents/analysis/mece.js)
3. 임팩트 계산 (agents/analysis/impact-calculator.js)
4. 에이전트 메인 (agents/analysis/index.js)

### Phase D: Planning Agent (예상 파일 수: 4개)
1. RICE 우선순위 (agents/planning/prioritizer.js)
2. 로드맵 생성 (agents/planning/roadmap.js)
3. 리스크 분석 (agents/planning/risk-analyzer.js)
4. 에이전트 메인 (agents/planning/index.js)

### Phase E: Output Agent (예상 파일 수: 4개)
1. PRD 생성 (agents/output/prd-generator.js)
2. One-Pager 생성 (agents/output/one-pager.js)
3. 반박 대응 (agents/output/objection-handler.js)
4. 에이전트 메인 (agents/output/index.js)

### Phase F: 통합 및 UI 완성 (예상 파일 수: 3개)
1. 파이프라인 완성 (orchestrator/pipeline.js)
2. 웹 UI 완성 (public/*)
3. 세션 관리 (data/sessions)

---

## 8. Edge Cases & Error Handling

| 상황 | 처리 방법 |
|------|-----------|
| RSS 수집 실패 | 캐시된 데이터 사용 또는 다른 소스 시도 |
| Gemini API 오류 | 3회 재시도 후 에러 메시지 반환 |
| 빈 검색 결과 | "관련 뉴스가 없습니다" 안내 |
| 너무 많은 결과 | 상위 15개만 처리 (relevanceScore 기준) |
| 세션 만료 | 24시간 후 자동 삭제 |

---

## 9. Security Considerations

- API 키는 환경변수로 관리 (config.js에서 process.env 참조)
- 사용자 입력 검증 (XSS, Injection 방지)
- Rate limiting (분당 10회 요청 제한)

---

## 10. Future Enhancements (C안: 포트폴리오 데모)

1. **데모 모드**: 실제 API 호출 없이 샘플 데이터로 시연
2. **export 기능**: PDF, Notion, Confluence 내보내기
3. **시각화**: 차트/다이어그램 자동 생성 (Mermaid)
4. **다국어**: 영어 PRD 생성 지원

---

## 11. Approval Checklist

- [x] 전체 아키텍처 승인 ✅
- [x] 4개 에이전트 스펙 승인 ✅
- [x] 데이터 플로우 승인 ✅
- [x] 구현 단계 순서 승인 ✅

---

## 12. Implementation Summary

**구현 완료**: 2026-01-27

| Phase | 상태 | 파일 수 |
|-------|------|---------|
| A. 기반 구조 | ✅ 완료 | 7 |
| B. Input Agent | ✅ 완료 | 4 |
| C. Analysis Agent | ✅ 완료 | 4 |
| D. Planning Agent | ✅ 완료 | 4 |
| E. Output Agent | ✅ 완료 | 4 |
| F. 통합 | ✅ 완료 | - |

**총 파일 수**: 23개 (node_modules 제외)

**실행 방법**:
```bash
cd /home/taeho/pm-agent-system
npm start
# http://localhost:3002 에서 접속
```
