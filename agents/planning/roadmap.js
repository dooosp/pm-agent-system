const gemini = require('../../services/gemini');

const SYSTEM_PROMPT = `[Context]
우선순위화된 이니셔티브를 분기별 실행 계획으로 변환합니다.
이 로드맵은 경영진 보고 및 팀 간 조율에 사용됩니다.

[Role]
당신은 제품 로드맵 전문가입니다.
우선순위화된 이니셔티브를 시간순으로 배치하여 실행 가능한 로드맵을 만듭니다.

[Action]
로드맵 원칙:
1. 의존성 고려: 선행 작업이 먼저 배치
2. 리소스 균형: 한 분기에 너무 많은 작업 X
3. 빠른 성과: Quick Win을 앞에 배치
4. 리스크 분산: 고위험 작업 분산 배치

[Tone]
- 실행 중심: 각 분기에 구체적 마일스톤 명시. "개선한다" 대신 "v2 출시".
- 의존성 명확: criticalPath에서 병목이 되는 이니셔티브를 강조.
- 현실적: 분기당 2~4개 이니셔티브. 과도한 병렬 실행 금지.

[Verification]
□ 의존성이 있는 이니셔티브가 선행 작업 이후에 배치되었는가?
□ 분기별 이니셔티브 수가 균형적인가?
□ quickWins가 Q1에 포함되었는가?`;

async function generateRoadmap(initiatives, analysisResult) {
  const currentQuarter = getCurrentQuarter();

  const prompt = `
현재 분기: ${currentQuarter}

우선순위화된 이니셔티브:
${initiatives.map(i => `
- ${i.id}: ${i.title}
  우선순위: ${i.priority}, RICE: ${i.rice.score}
  의존성: ${i.dependencies?.join(', ') || '없음'}
`).join('\n')}

분석 요약:
- 총 문제 수: ${analysisResult.summary.totalProblems}
- Critical 문제: ${analysisResult.summary.criticalCount}
- 평균 임팩트: ${analysisResult.summary.avgImpactScore}/10

이니셔티브들을 분기별 로드맵으로 배치하세요.

JSON으로 반환:
{
  "timeframe": "2026 Q1 ~ Q4",
  "quarters": {
    "Q1": {
      "theme": "분기 테마",
      "initiatives": ["I001", "I002"],
      "keyMilestones": ["마일스톤1", "마일스톤2"],
      "resources": "예상 리소스"
    },
    "Q2": { ... },
    "Q3": { ... },
    "Q4": { ... }
  },
  "criticalPath": ["가장 중요한 순차적 의존성 경로"],
  "quickWins": ["빠르게 달성 가능한 성과들"]
}`;

  try {
    return await gemini.generateJSON(prompt, SYSTEM_PROMPT);
  } catch (error) {
    console.error('[Roadmap] Error:', error.message);
    return {
      timeframe: `${currentQuarter} ~`,
      quarters: {},
      criticalPath: [],
      quickWins: []
    };
  }
}

function getCurrentQuarter() {
  const now = new Date();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  return `${now.getFullYear()} Q${quarter}`;
}

module.exports = { generateRoadmap };
