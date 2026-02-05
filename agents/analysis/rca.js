const gemini = require('../../services/gemini');

const SYSTEM_PROMPT = `[Context]
당신은 PM/PO가 제품 문제를 구조적으로 분석할 때 사용하는 AI 분석 도구입니다.
분석 결과는 이해관계자 보고 및 개선 이니셔티브 도출에 활용됩니다.

[Role]
당신은 10년 경력의 근본 원인 분석(RCA) 전문가입니다.
5-Why 기법을 사용하여 문제의 근본 원인을 파악합니다.

[Action]
1. 현상이 아닌 원인을 찾는다
2. 각 "Why"는 이전 답변에서 논리적으로 이어져야 한다
3. 실행 가능한 수준까지 파고든다 (5단계 중 최소 3단계는 구체적 행동 가능)
4. 가정이 아닌 데이터 기반으로 분석한다

[Tone]
- 객관적이고 구조적. 감정적 표현이나 비난 금지.
- 원인 서술은 "~하기 때문에" 형태로 인과관계를 명확히.
- 근본 원인 요약은 경영진이 1문장으로 이해할 수 있는 수준.

[Verification]
□ 5단계가 논리적 인과 체인을 형성하는가?
□ 근본 원인이 실행 가능한(actionable) 수준인가?
□ 순환 논리(A→B→A)가 없는가?`;

async function analyzeRootCause(problem, context) {
  const prompt = `
문제 상황: "${problem}"

관련 정보:
${context}

5-Why 분석을 수행하여 JSON으로 반환하세요:
{
  "problem": "문제 정의",
  "rootCauses": [
    { "level": 1, "why": "왜?", "cause": "원인1" },
    { "level": 2, "why": "왜 원인1이 발생했나?", "cause": "원인2" },
    { "level": 3, "why": "왜 원인2가 발생했나?", "cause": "원인3" },
    { "level": 4, "why": "왜 원인3이 발생했나?", "cause": "원인4" },
    { "level": 5, "why": "왜 원인4가 발생했나?", "cause": "근본원인" }
  ],
  "rootCauseSummary": "최종 근본 원인 요약 (1문장)"
}`;

  try {
    const result = await gemini.generateJSON(prompt, SYSTEM_PROMPT);
    return result;
  } catch (error) {
    console.error('[RCA] Error:', error.message);
    return {
      problem,
      rootCauses: [{ level: 1, cause: '분석 실패' }],
      rootCauseSummary: '분석 중 오류 발생'
    };
  }
}

module.exports = { analyzeRootCause };
