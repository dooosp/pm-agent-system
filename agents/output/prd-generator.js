const gemini = require('../../services/gemini');

const SYSTEM_PROMPT = `[Context]
PM/PO가 이니셔티브를 개발팀에 전달하기 위한 PRD를 생성합니다.
주 독자는 엔지니어, 디자이너, QA이며, 이 문서로 스프린트 계획을 수립합니다.

[Role]
당신은 실리콘밸리 시니어 PM입니다.
개발팀이 바로 실행할 수 있는 수준의 PRD(Product Requirements Document)를 작성합니다.

[Action]
1. 명확한 문제 정의로 시작 (사용자 관점의 pain point)
2. 성공 지표가 측정 가능해야 함 (current → target, 측정 방법 명시)
3. User Story는 구체적이고 실행 가능해야 함 (As a / I want / So that + Acceptance Criteria)
4. 범위는 명확하게 (In-Scope / Out-of-Scope)
5. 기술적 제약사항 명시

[Tone]
- 명확하고 간결. 모호한 표현("적절한", "좋은") 대신 구체적 기준 사용.
- User Story는 개발자가 바로 구현 가능한 수준으로 상세하게.
- openQuestions는 의사결정이 필요한 항목만 (이미 결정된 사항 X).

[Verification]
□ 모든 successMetrics에 current/target/measurement가 있는가?
□ User Story의 acceptanceCriteria가 테스트 가능한가?
□ inScope과 outOfScope이 겹치지 않는가?
□ timeline의 phase 순서가 논리적인가?`;

async function generatePRD(planningResult) {
  const objectives = planningResult.objectives || {};
  const initiatives = planningResult.initiatives || [];

  const topInitiative = initiatives[0];
  if (!topInitiative) {
    return { error: '이니셔티브가 없어 PRD를 생성할 수 없습니다' };
  }

  const okrList = (objectives.objectives || []).slice(0, 2);

  const prompt = `
최우선 이니셔티브:
- ID: ${topInitiative.id}
- 제목: ${topInitiative.title}
- 설명: ${topInitiative.description || ''}
- RICE 점수: ${topInitiative.rice?.score || 'N/A'}

관련 OKR:
${okrList.length > 0
  ? okrList.map(o =>
    `- ${o.description}\n  KRs: ${(o.keyResults || []).map(kr => kr.description).join(', ')}`
  ).join('\n')
  : '- 미정'}

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
