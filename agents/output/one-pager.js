const gemini = require('../../services/gemini');

const SYSTEM_PROMPT = `[Context]
전체 분석 파이프라인의 최종 산출물입니다.
경영진이 1분 안에 읽고 Go/No-Go 의사결정을 내리는 데 사용됩니다.

[Role]
당신은 경영진 커뮤니케이션 전문가입니다.
바쁜 경영진이 1분 안에 핵심을 파악하고 의사결정할 수 있는 One-Pager를 작성합니다.

[Action]
One-Pager 원칙:
1. 핵심 메시지는 첫 문장에
2. 숫자로 임팩트 증명
3. 명확한 Ask (요청사항)
4. 리스크와 완화방안 병기

[Tone]
- 간결: executiveSummary는 2문장 이내. 모든 섹션은 핵심만.
- 숫자 중심: "성장했다" 대신 "+15% QoQ". 정량적 표현 우선.
- 의사결정 유도: ask.decision은 "예/아니오"로 답할 수 있는 명확한 질문.

[Verification]
□ executiveSummary에 임팩트 숫자가 포함되었는가?
□ ask.decision이 명확한 의사결정 요청인가?
□ risks.topRisk와 risks.mitigation이 쌍으로 존재하는가?`;

async function generateOnePager(planningResult) {
  const objectives = planningResult.objectives || {};
  const initiatives = planningResult.initiatives || [];
  const risks = planningResult.risks || {};
  const summary = planningResult.summary || {};

  if (initiatives.length === 0) {
    return { error: '이니셔티브가 없어 One-Pager를 생성할 수 없습니다' };
  }

  const prompt = `
계획 요약:
- 총 이니셔티브: ${summary.totalInitiatives || initiatives.length}개
- P0 (최우선): ${summary.p0Count || 0}개
- 고위험 항목: ${summary.highRiskCount || 0}개
- Quick Win: ${summary.quickWinCount || 0}개

최우선 이니셔티브:
${initiatives.slice(0, 3).map(i =>
  `- ${i.title} (RICE: ${i.rice?.score || 'N/A'}, 우선순위: ${i.priority || 'TBD'})`
).join('\n')}

OKR:
${(objectives.objectives || []).slice(0, 2).map(o => `- ${o.description}`).join('\n') || '- 미정'}

리스크:
${risks.overallRiskProfile?.summary || '분석 중'}

경영진용 One-Pager를 작성하세요.

JSON으로 반환:
{
  "title": "프로젝트/이니셔티브 제목",
  "date": "${new Date().toISOString().split('T')[0]}",
  "executiveSummary": "핵심 메시지 1-2문장 (임팩트 숫자 포함)",

  "problem": {
    "statement": "문제 정의 (1문장)",
    "impact": "비즈니스 임팩트 (숫자)",
    "urgency": "왜 지금인가"
  },

  "solution": {
    "approach": "해결 방안 요약",
    "keyActions": ["핵심 액션 1", "핵심 액션 2", "핵심 액션 3"],
    "differentiator": "왜 이 방법인가"
  },

  "expectedOutcome": {
    "shortTerm": "단기 성과 (3개월)",
    "longTerm": "장기 성과 (1년)",
    "metrics": ["KPI 1", "KPI 2"]
  },

  "investment": {
    "resources": "필요 리소스",
    "timeline": "예상 기간",
    "cost": "예상 비용 (있다면)"
  },

  "risks": {
    "topRisk": "가장 큰 리스크",
    "mitigation": "완화 방안"
  },

  "ask": {
    "decision": "요청하는 의사결정",
    "deadline": "결정 필요 시점",
    "nextSteps": ["승인 시 다음 단계"]
  }
}`;

  try {
    return await gemini.generateJSON(prompt, SYSTEM_PROMPT);
  } catch (error) {
    console.error('[OnePager] Error:', error.message);
    return { error: '문서 생성 실패' };
  }
}

module.exports = { generateOnePager };
