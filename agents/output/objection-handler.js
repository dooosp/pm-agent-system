const gemini = require('../../services/gemini');

const SYSTEM_PROMPT = `[Context]
PM/PO가 경영진/이해관계자에게 제안을 발표하기 전 예상 반론을 준비합니다.
이 결과는 One-Pager와 함께 발표 준비 자료로 활용됩니다.

[Role]
당신은 이해관계자 관리 전문가입니다.
제안에 대한 예상 반대 의견과 질문을 미리 준비하여 설득력을 높입니다.

[Action]
반박 대응 원칙:
1. 상대방의 관점을 먼저 인정
2. 데이터와 논리로 대응
3. 대안 제시
4. Win-Win 프레이밍

[Tone]
- 공감적: acknowledge는 진심으로 우려를 인정. 형식적 문구 금지.
- 데이터 기반: counter에 구체적 수치/사례 포함. 감정적 설득 금지.
- 현실적: fallbackPositions는 실제 실행 가능한 대안만. 이상적 시나리오 금지.

[Verification]
□ 최소 3개 이상의 stakeholder 유형이 커버되었는가?
□ 각 response에 acknowledge/counter/alternative/benefit이 모두 있는가?
□ negotiationTips가 실전에서 사용 가능한 수준인가?`;

async function prepareObjectionHandling(planningResult, documentType) {
  const initiatives = planningResult.initiatives || [];
  const risks = planningResult.risks || {};
  const summary = planningResult.summary || {};

  const prompt = `
제안 내용:
- 이니셔티브 수: ${summary.totalInitiatives || initiatives.length}
- 최우선 과제: ${initiatives[0]?.title || 'N/A'}
- 리스크 수준: ${risks.overallRiskProfile?.level || 'medium'}

문서 유형: ${documentType}

이 제안에 대해 예상되는 반대 의견과 질문을 준비하세요.

JSON으로 반환:
{
  "stakeholderConcerns": [
    {
      "stakeholder": "이해관계자 유형 (예: CFO, CTO, 영업팀장)",
      "concern": "예상 우려사항",
      "perspective": "그들의 관점에서 왜 우려하는가",
      "response": {
        "acknowledge": "우려 인정하는 문구",
        "counter": "데이터 기반 반박",
        "alternative": "대안 제시",
        "benefit": "그들에게 돌아가는 이익"
      }
    }
  ],
  "commonQuestions": [
    {
      "question": "예상 질문",
      "shortAnswer": "간결한 답변 (1문장)",
      "detailedAnswer": "상세 답변",
      "supportingData": "뒷받침 데이터/근거"
    }
  ],
  "negotiationTips": [
    "협상 팁 1",
    "협상 팁 2"
  ],
  "fallbackPositions": [
    {
      "scenario": "만약 ~한다면",
      "fallback": "대안적 제안",
      "tradeoff": "트레이드오프"
    }
  ]
}`;

  try {
    return await gemini.generateJSON(prompt, SYSTEM_PROMPT);
  } catch (error) {
    console.error('[Objection] Error:', error.message);
    return {
      stakeholderConcerns: [],
      commonQuestions: [],
      negotiationTips: [],
      fallbackPositions: []
    };
  }
}

module.exports = { prepareObjectionHandling };
