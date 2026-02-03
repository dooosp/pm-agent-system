---
date: 2026-01-28
tags: [#security, #api-key, #governance, #secrets]
project: pm-agent-system (+ 전역 설정)
---

## 해결 문제 (Context)
- Google Cloud에서 API 키 노출 알림 수신 (pm-agent-system/config.js에 하드코딩된 키가 GitHub에 공개됨)

## 최종 핵심 로직 (Solution)

### 1. Governance 시크릿 관리 규칙 추가 (`~/.claude/CLAUDE.md`)
```markdown
## 🔐 시크릿 관리 (필수)

### 절대 금지
- 소스코드에 API 키, 토큰, 비밀번호 하드코딩 금지
- `.env` 파일 커밋 금지

### 커밋 전 시크릿 스캔 패턴
- `AIza` → Google API Key
- `ghp_` → GitHub Token
- `sk-` → OpenAI API Key
```

### 2. config.js 하드코딩 제거
```javascript
// Before (위험)
GEMINI_API_KEY: process.env.GEMINI_API_KEY || 'AIzaSy...',

// After (안전)
GEMINI_API_KEY: process.env.GEMINI_API_KEY,
```

### 3. 시크릿 저장 구조
```
~/.secrets/.env          # 로컬 환경변수 (chmod 600)
~/.bashrc                # 자동 로드 설정
GitHub Secrets           # CI/CD용
Cloudflare Secrets       # Worker용
```

## 핵심 통찰 (Learning & Decision)

- **Problem:** `config.js`에 fallback으로 API 키 하드코딩 → GitHub 스캐너에 탐지됨
- **Decision:**
  1. 모든 시크릿은 환경변수로만 관리
  2. Governance에 시크릿 관리 규칙 추가 (커밋 전 패턴 검사)
  3. CLAUDE.md에서도 평문 키 제거
- **Next Step:**
  - Google Cloud Console에서 API 제한 설정 (Generative Language API만, IP 제한)
  - 새 프로젝트 생성 시 `.env.example` 필수 포함

## 수정된 파일 목록
| 파일 | 변경 내용 |
|------|----------|
| `~/.claude/CLAUDE.md` | 시크릿 관리 규칙 추가, 평문 키 제거 |
| `pm-agent-system/config.js` | 하드코딩 fallback 제거 |
| `~/.secrets/.env` | 신규 생성 (로컬 시크릿 저장) |
| `~/.bashrc` | 환경변수 자동 로드 추가 |

## 업데이트된 시크릿 위치
| 서비스 | 위치 |
|--------|------|
| 로컬 개발 | `~/.secrets/.env` |
| pm-agent-system (Actions) | GitHub Secrets |
| news-scraper (Actions) | GitHub Secrets |
| b2b-lead-agent (Actions) | GitHub Secrets |
| topdown-learner (Actions) | GitHub Secrets |
| pm-agent (Worker) | Cloudflare Secrets |
| b2b-lead-trigger (Worker) | Cloudflare Secrets |
