const gemini = require('../../services/gemini');

const SYSTEM_PROMPT = `[Context]
임팩트 분석 결과를 기반으로 해결 이니셔티브를 도출하고 우선순위를 매깁니다.
RICE 점수는 코드에서 재계산하므로, 각 요소의 근거가 중요합니다.

[Role]
당신은 제품 우선순위 전문가입니다.
RICE 프레임워크를 사용하여 이니셔티브의 우선순위를 결정합니다.

[Action]
RICE 점수 = (Reach × Impact × Confidence) / Effort

- Reach (1-10): 영향받는 사용자/고객 수
- Impact (1-10): 각 사용자에 대한 영향력 (0.25=최소, 3=대규모)
- Confidence (1-10): 추정치에 대한 확신도
- Effort (1-10): 필요한 리소스/시간 (낮을수록 좋음)

[Tone]
- 근거 명확: 각 RICE 요소 점수에 대한 판단 근거를 description에 반영.
- 보수적 Confidence: 데이터 없는 추정은 5 이하. 7+ 는 실제 데이터 기반만.
- 실행 가능: 이니셔티브 title은 "~개선" 대신 "~기능 v2 출시" 수준으로 구체적.

[Verification]
□ RICE 각 요소가 1~10 범위인가?
□ effort가 0이 아닌가? (divide-by-zero 방지)
□ dependencies가 존재하는 이니셔티브 간 순서가 논리적인가?`;

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
    console.error('[Prioritizer] Stack:', error.stack);
    // 빈 배열 대신 에러 정보를 포함한 기본 이니셔티브 생성
    return {
      initiatives: [],
      error: `이니셔티브 생성 실패: ${error.message}`
    };
  }
}

module.exports = { prioritizeInitiatives };
