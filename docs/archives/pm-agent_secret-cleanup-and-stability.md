---
date: 2026-01-29
tags: [#security, #git-history, #api-key, #stability, #gemini]
project: pm-agent-system
---

## 해결 문제 (Context)
- 이전 세션에서 수정한 5개 파일(보안+안정성) 커밋/배포 + git 히스토리에 노출된 Gemini API 키 완전 제거

## 최종 핵심 로직 (Solution)

### 1. 커밋된 5개 파일 변경사항
- `worker/index.js` - 하드코딩 API 키 → `env.GEMINI_API_KEY`
- `services/gemini.js` - JSON 파서: object + array 추출 지원
- `orchestrator/pipeline.js` - 세션 TTL 정리 (lazy + interval with unref)
- `agents/analysis/index.js` - 빈 배열 avgImpactScore 안전 처리
- `agents/input/index.js` - 30분 TTL 입력 캐시 + 쿼리 정규화

### 2. Git 히스토리 API 키 제거
```bash
# mirror clone → filter-repo로 키 치환 → force push
git clone --mirror https://github.com/dooosp/pm-agent-system.git pm-agent-system-mirror
cd pm-agent-system-mirror
python3 ~/git-filter-repo --replace-text <(echo '***REMOVED***==>***REMOVED***') --force
git remote add origin https://github.com/dooosp/pm-agent-system.git
git push --force --all origin
```

### 3. 새 API 키 등록
- 로컬: `~/.secrets/.env`
- Cloudflare Worker: Dashboard → Variables에서 `GEMINI_API_KEY` 업데이트

## 핵심 통찰 (Learning & Decision)
- **Problem:** git 히스토리에 Gemini API 키가 평문으로 남아 있어 키 재생성만으로는 불완전
- **Decision:** `git-filter-repo`로 전체 히스토리에서 키 문자열을 `***REMOVED***`로 치환 후 force push. 로컬 repo는 `git reset --hard origin/main`으로 동기화
- **Next Step:** 새 프로젝트 시 시크릿 하드코딩 원천 차단. Render/GitHub Actions 환경변수도 새 키로 업데이트 필요 (해당 서비스 사용 시)
