const gemini = require('../../services/gemini');

const SYSTEM_PROMPT = `당신은 리스크 분석 전문가입니다.
이니셔티브의 잠재적 리스크를 파악하고 완화 전략을 제안합니다.

리스크 매트릭스:
- 발생 확률: High / Medium / Low
- 영향도: High / Medium / Low
- 리스크 레벨 = 확률 × 영향도`;

async function analyzeRisks(initiatives, problems) {
  const prompt = `
이니셔티브 목록:
${initiatives.map(i => `- ${i.id}: ${i.title}`).join('\n')}

관련 문제들:
${problems.map(p => `- ${p.problem} (긴급도: ${p.impact.urgency})`).join('\n')}

각 이니셔티브의 잠재적 리스크를 분석하세요.

JSON으로 반환:
{
  "risks": [
    {
      "id": "R001",
      "relatedInitiative": "I001",
      "description": "리스크 설명",
      "category": "technical|resource|market|operational|external",
      "probability": "high|medium|low",
      "impact": "high|medium|low",
      "riskLevel": "critical|high|medium|low",
      "mitigation": {
        "strategy": "완화 전략",
        "actions": ["구체적 조치1", "조치2"],
        "owner": "담당자/팀",
        "contingency": "Plan B (리스크 발생 시 대응)"
      },
      "earlyWarningSignals": ["조기 경보 신호들"]
    }
  ],
  "overallRiskProfile": {
    "level": "high|medium|low",
    "summary": "전체 리스크 요약",
    "topRisks": ["가장 주의해야 할 리스크 Top 3"]
  }
}`;

  try {
    return await gemini.generateJSON(prompt, SYSTEM_PROMPT);
  } catch (error) {
    console.error('[RiskAnalyzer] Error:', error.message);
    return {
      risks: [],
      overallRiskProfile: {
        level: 'medium',
        summary: '분석 실패',
        topRisks: []
      }
    };
  }
}

module.exports = { analyzeRisks };
