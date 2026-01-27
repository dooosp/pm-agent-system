const { generatePRD } = require('./prd-generator');
const { generateOnePager } = require('./one-pager');
const { prepareObjectionHandling } = require('./objection-handler');

const PERSONA = `
[The Closer - 설득의 달인]
- 듣는 사람의 언어로 말한다
- 반대 의견에 미리 대비한다
- 행동을 이끌어내는 문서를 만든다
`;

async function execute(planningResult, documentType) {
  console.log(`\n${PERSONA}`);
  console.log(`[Output Agent] Generating ${documentType} document...`);

  const startTime = Date.now();

  let document;

  switch (documentType) {
    case 'prd':
      console.log('[Output Agent] Creating PRD...');
      document = await generatePRD(planningResult);
      break;

    case 'one-pager':
      console.log('[Output Agent] Creating One-Pager...');
      document = await generateOnePager(planningResult);
      break;

    case 'briefing':
      console.log('[Output Agent] Creating Stakeholder Briefing...');
      document = await generateBriefing(planningResult);
      break;

    default:
      throw new Error(`Unknown document type: ${documentType}`);
  }

  // 반박 대응 준비
  console.log('[Output Agent] Preparing objection handling...');
  const objectionHandling = await prepareObjectionHandling(
    planningResult,
    documentType
  );

  const result = {
    documentType,
    generatedAt: new Date().toISOString(),
    processingTime: Date.now() - startTime,
    document,
    objectionHandling
  };

  console.log(`[Output Agent] Complete in ${result.processingTime}ms`);
  return result;
}

async function generateBriefing(planningResult) {
  const gemini = require('../../services/gemini');
  const { objectives, initiatives, risks } = planningResult;

  const prompt = `
계획 내용:
- OKR: ${objectives.objectives?.map(o => o.description).join(', ')}
- 이니셔티브: ${initiatives.slice(0, 3).map(i => i.title).join(', ')}
- 리스크: ${risks.overallRiskProfile?.summary}

이해관계자별 맞춤 브리핑을 작성하세요.

JSON으로 반환:
{
  "title": "브리핑 제목",
  "date": "${new Date().toISOString().split('T')[0]}",
  "context": "배경 설명 (2-3문장)",

  "stakeholderBriefings": [
    {
      "stakeholder": "경영진",
      "keyMessage": "핵심 메시지",
      "relevantPoints": ["관련 포인트들"],
      "callToAction": "요청 사항"
    },
    {
      "stakeholder": "개발팀",
      "keyMessage": "핵심 메시지",
      "relevantPoints": ["관련 포인트들"],
      "callToAction": "요청 사항"
    },
    {
      "stakeholder": "영업/마케팅",
      "keyMessage": "핵심 메시지",
      "relevantPoints": ["관련 포인트들"],
      "callToAction": "요청 사항"
    }
  ],

  "talkingPoints": [
    "발표 시 강조할 포인트들"
  ],

  "doNotMention": [
    "언급 피해야 할 민감한 사항"
  ]
}`;

  try {
    return await gemini.generateJSON(prompt);
  } catch (error) {
    console.error('[Briefing] Error:', error.message);
    return { error: '문서 생성 실패' };
  }
}

module.exports = { execute };
