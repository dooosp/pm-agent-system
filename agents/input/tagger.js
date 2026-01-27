const gemini = require('../../services/gemini');

const SYSTEM_PROMPT = `당신은 PM/PO를 위한 뉴스 분류 전문가입니다.
각 뉴스 항목을 분석하여 적절한 태그와 관련성 점수를 부여합니다.

태그 종류:
- market_trend: 시장 동향, 성장률, 전망
- competitor: 경쟁사 동향, 신제품, 전략
- technology: 기술 발전, 혁신, R&D
- customer: 고객 니즈, 피드백, 사용 사례
- regulation: 규제, 정책, 법률
- risk: 리스크, 위기, 문제점

관련성 점수 (relevanceScore): 0.0 ~ 1.0
- PM/PO 업무에 얼마나 유용한 정보인지 판단`;

async function tagItems(items, query) {
  if (items.length === 0) return [];

  const prompt = `
원래 검색 쿼리: "${query}"

다음 뉴스 항목들을 분석하여 JSON 배열로 반환하세요.
각 항목에 tags(배열)와 relevanceScore(숫자)를 추가합니다.

뉴스 항목:
${items.map((item, i) => `${i + 1}. "${item.title}" (${item.source})`).join('\n')}

응답 형식 (JSON 배열만 반환):
[
  { "index": 0, "tags": ["market_trend"], "relevanceScore": 0.85 },
  ...
]`;

  try {
    const result = await gemini.generateJSON(prompt, SYSTEM_PROMPT);

    // 결과를 원본 items에 병합
    return items.map((item, i) => {
      const tagInfo = result.find(r => r.index === i) || {
        tags: ['unknown'],
        relevanceScore: 0.5
      };

      return {
        ...item,
        tags: tagInfo.tags,
        relevanceScore: tagInfo.relevanceScore
      };
    });

  } catch (error) {
    console.error('[Tagger] Error:', error.message);
    // 실패 시 기본값 반환
    return items.map(item => ({
      ...item,
      tags: ['untagged'],
      relevanceScore: 0.5
    }));
  }
}

module.exports = { tagItems };
