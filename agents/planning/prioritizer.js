const gemini = require('../../services/gemini');

const SYSTEM_PROMPT = `당신은 제품 우선순위 전문가입니다.
RICE 프레임워크를 사용하여 이니셔티브의 우선순위를 결정합니다.

RICE 점수 = (Reach × Impact × Confidence) / Effort

- Reach (1-10): 영향받는 사용자/고객 수
- Impact (1-10): 각 사용자에 대한 영향력 (0.25=최소, 3=대규모)
- Confidence (1-10): 추정치에 대한 확신도
- Effort (1-10): 필요한 리소스/시간 (낮을수록 좋음)`;

async function prioritizeInitiatives(problems, insights) {
  const prompt = `
분석된 문제들:
${problems.map(p => `- ${p.problem} (긴급도: ${p.impact.urgency})`).join('\n')}

도출된 인사이트:
${insights.map(i => `- ${i}`).join('\n')}

위 문제들을 해결하기 위한 이니셔티브를 제안하고 RICE로 우선순위를 매기세요.

JSON으로 반환:
{
  "initiatives": [
    {
      "id": "I001",
      "title": "이니셔티브 제목",
      "description": "상세 설명",
      "targetProblem": "해결하려는 문제 ID (예: P1)",
      "rice": {
        "reach": 8,
        "impact": 9,
        "confidence": 7,
        "effort": 5,
        "score": 100.8
      },
      "priority": "P0|P1|P2",
      "estimatedOwner": "추천 담당 팀/역할",
      "dependencies": ["선행 조건 또는 의존성"]
    }
  ]
}`;

  try {
    const result = await gemini.generateJSON(prompt, SYSTEM_PROMPT);

    // RICE 점수 재계산 (AI가 틀릴 수 있으므로)
    if (result.initiatives) {
      result.initiatives = result.initiatives.map(init => {
        const { reach, impact, confidence, effort } = init.rice;
        const score = ((reach * impact * confidence) / effort).toFixed(1);
        return {
          ...init,
          rice: { ...init.rice, score: parseFloat(score) }
        };
      });

      // 점수순 정렬
      result.initiatives.sort((a, b) => b.rice.score - a.rice.score);
    }

    return result;
  } catch (error) {
    console.error('[Prioritizer] Error:', error.message);
    return { initiatives: [] };
  }
}

module.exports = { prioritizeInitiatives };
