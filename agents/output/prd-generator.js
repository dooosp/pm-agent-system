const gemini = require('../../services/gemini');

const SYSTEM_PROMPT = `당신은 실리콘밸리 시니어 PM입니다.
개발팀이 바로 실행할 수 있는 수준의 PRD(Product Requirements Document)를 작성합니다.

PRD 작성 원칙:
1. 명확한 문제 정의로 시작
2. 성공 지표가 측정 가능해야 함
3. User Story는 구체적이고 실행 가능해야 함
4. 범위는 명확하게 (In-Scope / Out-of-Scope)
5. 기술적 제약사항 명시`;

async function generatePRD(planningResult) {
  const { objectives, initiatives, roadmap: _roadmap } = planningResult;

  const topInitiative = initiatives[0];
  if (!topInitiative) {
    return { error: 'No initiative to create PRD' };
  }

  const prompt = `
최우선 이니셔티브:
- ID: ${topInitiative.id}
- 제목: ${topInitiative.title}
- 설명: ${topInitiative.description}
- RICE 점수: ${topInitiative.rice.score}

관련 OKR:
${objectives.objectives?.slice(0, 2).map(o =>
  `- ${o.description}\n  KRs: ${o.keyResults?.map(kr => kr.description).join(', ')}`
).join('\n')}

이 이니셔티브에 대한 PRD를 작성하세요.

JSON으로 반환:
{
  "title": "PRD 제목",
  "version": "1.0",
  "author": "PM Agent",
  "date": "${new Date().toISOString().split('T')[0]}",
  "status": "Draft",

  "overview": {
    "problem": "해결하려는 문제 (2-3문장)",
    "solution": "제안 솔루션 요약",
    "goals": ["목표1", "목표2"]
  },

  "successMetrics": [
    {
      "metric": "지표명",
      "current": "현재값",
      "target": "목표값",
      "measurement": "측정 방법"
    }
  ],

  "userStories": [
    {
      "id": "US001",
      "persona": "사용자 유형",
      "story": "As a [persona], I want [goal] so that [benefit]",
      "acceptanceCriteria": ["조건1", "조건2"],
      "priority": "P0|P1|P2"
    }
  ],

  "scope": {
    "inScope": ["포함 범위"],
    "outOfScope": ["제외 범위"],
    "assumptions": ["가정 사항"]
  },

  "technicalRequirements": {
    "architecture": "고수준 아키텍처 설명",
    "integrations": ["연동 필요 시스템"],
    "constraints": ["기술적 제약사항"],
    "securityConsiderations": ["보안 고려사항"]
  },

  "timeline": {
    "phases": [
      {
        "phase": "Phase 1",
        "description": "설명",
        "deliverables": ["산출물"],
        "duration": "예상 기간"
      }
    ]
  },

  "openQuestions": ["해결 필요한 미결 사항"]
}`;

  try {
    return await gemini.generateJSON(prompt, SYSTEM_PROMPT);
  } catch (error) {
    console.error('[PRD] Error:', error.message);
    return { error: '문서 생성 실패' };
  }
}

module.exports = { generatePRD };
