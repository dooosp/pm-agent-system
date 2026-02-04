const { prioritizeInitiatives } = require('./prioritizer');
const { generateRoadmap } = require('./roadmap');
const { analyzeRisks } = require('./risk-analyzer');
const gemini = require('../../services/gemini');

const PERSONA = `
[The Architect - 실리콘밸리 시니어 PM]
- 가장 적은 리소스로 최대 효과
- 리스크는 미리 대비한다
- 실행 가능한 계획만 세운다
`;

async function execute(analysisResult) {
  console.log(`\n${PERSONA}`);
  console.log('[Planning Agent] Starting planning...');

  const startTime = Date.now();
  const { problems, insights } = analysisResult;

  // Step 1: OKR 수립
  console.log('[Planning Agent] Step 1: Setting OKRs...');
  const objectives = await generateOKRs(problems, insights);

  // Step 2: 이니셔티브 우선순위 (RICE)
  console.log('[Planning Agent] Step 2: Prioritizing initiatives...');
  const { initiatives } = await prioritizeInitiatives(problems, insights);
  console.log(`[Planning Agent] Generated ${initiatives.length} initiatives`);

  // Step 3: 로드맵 생성
  console.log('[Planning Agent] Step 3: Generating roadmap...');
  const roadmap = await generateRoadmap(initiatives, analysisResult);

  // Step 4: 리스크 분석
  console.log('[Planning Agent] Step 4: Analyzing risks...');
  const riskAnalysis = await analyzeRisks(initiatives, problems);

  const result = {
    query: analysisResult.query,
    plannedAt: new Date().toISOString(),
    processingTime: Date.now() - startTime,
    objectives,
    initiatives,
    roadmap,
    risks: riskAnalysis,
    summary: {
      totalInitiatives: initiatives.length,
      p0Count: initiatives.filter(i => i.priority === 'P0').length,
      highRiskCount: (riskAnalysis.risks || []).filter(r =>
        r.riskLevel === 'critical' || r.riskLevel === 'high'
      ).length,
      quickWinCount: roadmap.quickWins?.length || 0
    }
  };

  console.log(`[Planning Agent] Complete in ${result.processingTime}ms`);
  return result;
}

async function generateOKRs(problems, insights) {
  const prompt = `
분석된 문제들:
${problems.map(p => `- ${p.problem}`).join('\n')}

인사이트:
${insights.map(i => `- ${i}`).join('\n')}

위 분석 결과를 바탕으로 OKR(Objectives and Key Results)을 수립하세요.

JSON으로 반환:
{
  "objectives": [
    {
      "id": "O1",
      "description": "목표 설명 (야심차지만 달성 가능한)",
      "timeframe": "Q1 2026",
      "keyResults": [
        {
          "id": "KR1.1",
          "description": "핵심 결과 (측정 가능한)",
          "metric": "측정 지표",
          "target": "목표 수치",
          "current": "현재 상태 (추정)"
        }
      ],
      "relatedProblems": ["P1", "P2"]
    }
  ]
}`;

  try {
    return await gemini.generateJSON(prompt);
  } catch (error) {
    console.error('[OKR] Error:', error.message);
    return { objectives: [] };
  }
}

module.exports = { execute };
