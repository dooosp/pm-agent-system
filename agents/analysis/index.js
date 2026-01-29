const { analyzeRootCause } = require('./rca');
const { structureMECE } = require('./mece');
const { calculateImpact } = require('./impact-calculator');
const gemini = require('../../services/gemini');

const PERSONA = `
[The Brain - 냉철한 분석가]
- 현상이 아닌 원인을 찾는다 (5-Why)
- 중복과 누락 없이 쪼갠다 (MECE)
- 숫자로 임팩트를 증명한다
`;

async function execute(inputResult) {
  console.log(`\n${PERSONA}`);
  console.log('[Analysis Agent] Starting analysis...');

  const startTime = Date.now();
  const { query, items } = inputResult;

  // Step 1: 핵심 문제 추출
  console.log('[Analysis Agent] Step 1: Extracting key problems...');
  const problems = await extractProblems(query, items);
  console.log(`[Analysis Agent] Found ${problems.length} key problems`);

  // Step 2: 각 문제에 대해 RCA + MECE + Impact 분석
  console.log('[Analysis Agent] Step 2: Deep analysis...');
  const analyses = [];

  for (const problem of problems.slice(0, 3)) {
    console.log(`[Analysis Agent] Analyzing: ${problem.slice(0, 50)}...`);

    const context = items.map(i => `- ${i.title}`).join('\n');

    const [rca, mece, impact] = await Promise.all([
      analyzeRootCause(problem, context),
      structureMECE(problem, items.slice(0, 5)),
      calculateImpact(problem, context)
    ]);

    analyses.push({
      id: `P${analyses.length + 1}`,
      problem,
      rca,
      mece,
      impact
    });
  }

  // Step 3: 종합 인사이트 도출
  console.log('[Analysis Agent] Step 3: Generating insights...');
  const insights = await generateInsights(analyses);

  const result = {
    query,
    analyzedAt: new Date().toISOString(),
    processingTime: Date.now() - startTime,
    problems: analyses,
    insights,
    summary: {
      totalProblems: analyses.length,
      criticalCount: analyses.filter(a => a.impact.urgency === 'critical').length,
      avgImpactScore: Math.round(
        analyses.reduce((sum, a) => sum + (a.impact.overallScore || 5), 0) / Math.max(analyses.length, 1)
      )
    }
  };

  console.log(`[Analysis Agent] Complete in ${result.processingTime}ms`);
  return result;
}

async function extractProblems(query, items) {
  const prompt = `
분석 주제: "${query}"

수집된 뉴스:
${items.slice(0, 10).map(i => `- ${i.title} [${i.tags?.join(', ')}]`).join('\n')}

이 정보에서 PM/PO 관점에서 해결해야 할 핵심 문제 3~5개를 추출하세요.
각 문제는 구체적이고 실행 가능한 수준이어야 합니다.

JSON 배열로만 반환:
["문제1", "문제2", "문제3"]`;

  try {
    const result = await gemini.generateJSON(prompt);
    return Array.isArray(result) ? result : [];
  } catch {
    return [`${query} 관련 시장 동향 분석 필요`];
  }
}

async function generateInsights(analyses) {
  const prompt = `
다음 분석 결과를 바탕으로 핵심 인사이트 3~5개를 도출하세요:

${analyses.map(a => `
문제: ${a.problem}
근본 원인: ${a.rca.rootCauseSummary}
임팩트: ${a.impact.summary}
긴급도: ${a.impact.urgency}
`).join('\n---\n')}

JSON 배열로만 반환 (각 인사이트는 실행 가능한 제안 포함):
["인사이트1: ...", "인사이트2: ...", ...]`;

  try {
    const result = await gemini.generateJSON(prompt);
    return Array.isArray(result) ? result : [];
  } catch {
    return ['추가 분석이 필요합니다'];
  }
}

module.exports = { execute };
