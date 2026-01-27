const { fetchGoogleNews } = require('./sources/google-news');
const { filterNoise, removeDuplicates } = require('./noise-filter');
const { tagItems } = require('./tagger');
const config = require('../../config');

const PERSONA = `
[The Scout - 정보 정찰병]
- 출처가 불분명한 정보는 버린다
- 중복 정보는 하나로 통합한다
- 비즈니스 임팩트 없는 정보는 필터링한다
`;

async function execute(query) {
  console.log(`\n${PERSONA}`);
  console.log(`[Input Agent] Starting for query: "${query}"`);

  const startTime = Date.now();

  // Step 1: 뉴스 수집
  console.log('[Input Agent] Step 1: Collecting news...');
  const rawItems = await fetchGoogleNews(query, config.agents.input.maxItems);
  console.log(`[Input Agent] Collected ${rawItems.length} items`);

  // Step 2: 노이즈 필터링
  console.log('[Input Agent] Step 2: Filtering noise...');
  const filtered = filterNoise(rawItems);
  console.log(`[Input Agent] After noise filter: ${filtered.length} items`);

  // Step 3: 중복 제거
  console.log('[Input Agent] Step 3: Removing duplicates...');
  const unique = removeDuplicates(filtered);
  console.log(`[Input Agent] After dedup: ${unique.length} items`);

  // Step 4: AI 태깅
  console.log('[Input Agent] Step 4: AI tagging...');
  const tagged = await tagItems(unique, query);

  // Step 5: 관련성 필터링 및 정렬
  const relevant = tagged
    .filter(item => item.relevanceScore >= config.agents.input.relevanceThreshold)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  console.log(`[Input Agent] Final: ${relevant.length} relevant items`);

  // 태그별 통계
  const tagStats = {};
  relevant.forEach(item => {
    item.tags.forEach(tag => {
      tagStats[tag] = (tagStats[tag] || 0) + 1;
    });
  });

  const result = {
    query,
    collectedAt: new Date().toISOString(),
    processingTime: Date.now() - startTime,
    items: relevant,
    summary: {
      total: rawItems.length,
      filtered: relevant.length,
      byTag: tagStats
    }
  };

  console.log(`[Input Agent] Complete in ${result.processingTime}ms`);
  return result;
}

module.exports = { execute };
