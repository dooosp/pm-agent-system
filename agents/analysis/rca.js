const gemini = require('../../services/gemini');

const SYSTEM_PROMPT = `당신은 근본 원인 분석(RCA) 전문가입니다.
5-Why 기법을 사용하여 문제의 근본 원인을 파악합니다.

분석 원칙:
1. 현상이 아닌 원인을 찾는다
2. 각 "Why"는 이전 답변에서 논리적으로 이어져야 한다
3. 실행 가능한 수준까지 파고든다
4. 가정이 아닌 데이터 기반으로 분석한다`;

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
