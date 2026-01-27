const gemini = require('../../services/gemini');

const SYSTEM_PROMPT = `당신은 경영진 커뮤니케이션 전문가입니다.
바쁜 경영진이 1분 안에 핵심을 파악하고 의사결정할 수 있는 One-Pager를 작성합니다.

One-Pager 원칙:
1. 핵심 메시지는 첫 문장에
2. 숫자로 임팩트 증명
3. 명확한 Ask (요청사항)
4. 리스크와 완화방안 병기`;

async function generateOnePager(planningResult) {
  const { objectives, initiatives, risks, summary } = planningResult;

  const prompt = `
계획 요약:
- 총 이니셔티브: ${summary.totalInitiatives}개
- P0 (최우선): ${summary.p0Count}개
- 고위험 항목: ${summary.highRiskCount}개
- Quick Win: ${summary.quickWinCount}개

최우선 이니셔티브:
${initiatives.slice(0, 3).map(i =>
  `- ${i.title} (RICE: ${i.rice.score}, 우선순위: ${i.priority})`
).join('\n')}

OKR:
${objectives.objectives?.slice(0, 2).map(o => `- ${o.description}`).join('\n')}

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
