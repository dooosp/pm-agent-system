const gemini = require('../../services/gemini');

const SYSTEM_PROMPT = `[Context]
MECE 분석 결과를 기반으로 각 문제/기회의 비즈니스 임팩트를 수치화합니다.
이 점수는 이니셔티브 우선순위(RICE)의 Impact 입력값으로 활용됩니다.

[Role]
당신은 비즈니스 임팩트 분석 전문가입니다.
문제나 기회가 비즈니스에 미치는 영향을 정량적/정성적으로 평가합니다.

[Action]
평가 기준:
1. 매출/수익 영향
2. 고객 영향 (이탈, 만족도)
3. 운영 효율성
4. 시장 포지션/경쟁력
5. 리스크 수준

[Tone]
- 정량적: 가능하면 숫자(%, 금액, 기간)로 표현. "크다/작다" 대신 구체적 추정.
- 보수적: 확신이 낮으면 confidence를 low로. 과대평가보다 과소평가가 안전.
- 4차원 균형: revenue/customer/operations/market 모든 차원을 빠짐없이 평가.

[Verification]
□ overallScore가 1~10 범위이고 dimensions와 일관적인가?
□ revenue.estimate에 구체적 수치/범위가 포함되었는가?
□ urgency와 overallScore가 논리적으로 정합하는가?`;

async function calculateImpact(problem, context) {
  const prompt = `
문제/기회: "${problem}"

관련 컨텍스트:
${context}

비즈니스 임팩트를 분석하여 JSON으로 반환하세요:
{
  "summary": "임팩트 요약 (1-2문장)",
  "dimensions": {
    "revenue": {
      "impact": "positive|negative|neutral",
      "magnitude": "high|medium|low",
      "estimate": "예상 수치 또는 범위 (예: -15% Q2 매출)",
      "confidence": "high|medium|low"
    },
    "customer": {
      "impact": "positive|negative|neutral",
      "magnitude": "high|medium|low",
      "description": "고객 영향 설명"
    },
    "operations": {
      "impact": "positive|negative|neutral",
      "magnitude": "high|medium|low",
      "description": "운영 영향 설명"
    },
    "market": {
      "impact": "positive|negative|neutral",
      "magnitude": "high|medium|low",
      "description": "시장/경쟁 영향 설명"
    }
  },
  "overallScore": 1~10,
  "urgency": "critical|high|medium|low",
  "recommendation": "권장 조치 방향"
}`;

  try {
    const result = await gemini.generateJSON(prompt, SYSTEM_PROMPT);
    return result;
  } catch (error) {
    console.error('[Impact] Error:', error.message);
    return {
      summary: '분석 실패',
      dimensions: {},
      overallScore: 5,
      urgency: 'medium',
      recommendation: '추가 분석 필요'
    };
  }
}

module.exports = { calculateImpact };
