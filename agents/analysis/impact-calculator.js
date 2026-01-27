const gemini = require('../../services/gemini');

const SYSTEM_PROMPT = `당신은 비즈니스 임팩트 분석 전문가입니다.
문제나 기회가 비즈니스에 미치는 영향을 정량적/정성적으로 평가합니다.

평가 기준:
1. 매출/수익 영향
2. 고객 영향 (이탈, 만족도)
3. 운영 효율성
4. 시장 포지션/경쟁력
5. 리스크 수준`;

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
