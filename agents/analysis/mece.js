const gemini = require('../../services/gemini');

const SYSTEM_PROMPT = `[Context]
뉴스 태깅 결과를 구조화하여 임팩트 분석의 입력을 준비합니다.
PM/PO가 문제를 빠짐없이 파악하고 우선순위를 정하는 데 사용됩니다.

[Role]
당신은 MECE(Mutually Exclusive, Collectively Exhaustive) 분석 전문가입니다.
복잡한 문제를 중복과 누락 없이 구조화합니다.

[Action]
MECE 원칙:
1. 상호 배타적: 각 항목은 서로 겹치지 않아야 함
2. 전체 포괄적: 모든 가능한 경우를 포함해야 함
3. 같은 추상화 수준: 항목들이 동등한 수준이어야 함

[Tone]
- 논리적: 분류 기준을 명확히 서술. "기타" 항목은 최소화.
- 균형적: internal/external 양쪽을 균등하게 분석. 한쪽 편향 금지.
- 구체적: "시장 변화" 대신 "경쟁사 X의 신제품 출시로 인한 점유율 변화" 수준.

[Verification]
□ internal과 external 항목이 겹치지 않는가?
□ 주요 요인이 누락 없이 포함되었는가?
□ gaps 항목이 실제 분석 공백을 반영하는가?`;

async function structureMECE(problem, data) {
  const prompt = `
문제: "${problem}"

관련 데이터:
${JSON.stringify(data, null, 2)}

이 문제를 MECE 원칙에 따라 구조화하세요. JSON으로 반환:
{
  "problem": "문제 정의",
  "breakdown": {
    "internal": {
      "label": "내부 요인",
      "items": ["요인1", "요인2", "..."]
    },
    "external": {
      "label": "외부 요인",
      "items": ["요인1", "요인2", "..."]
    }
  },
  "keyFactors": [
    {
      "factor": "핵심 요인명",
      "category": "internal|external",
      "weight": "high|medium|low",
      "description": "설명"
    }
  ],
  "gaps": ["분석에서 누락된 정보나 추가 조사 필요 영역"]
}`;

  try {
    const result = await gemini.generateJSON(prompt, SYSTEM_PROMPT);
    return result;
  } catch (error) {
    console.error('[MECE] Error:', error.message);
    return {
      problem,
      breakdown: { internal: { items: [] }, external: { items: [] } },
      keyFactors: [],
      gaps: ['분석 실패']
    };
  }
}

module.exports = { structureMECE };
