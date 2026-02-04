
// 제외할 키워드 (광고, 스팸 등)
const NOISE_KEYWORDS = [
  '광고', '협찬', '이벤트', '프로모션', '할인',
  '무료', '경품', '추첨', '응모'
];

// 중복 판단용 유사도 임계값
const SIMILARITY_THRESHOLD = 0.6;

function filterNoise(items) {
  return items.filter(item => {
    const text = (item.title + ' ' + item.content).toLowerCase();

    // 노이즈 키워드 필터링
    const hasNoise = NOISE_KEYWORDS.some(kw => text.includes(kw));
    if (hasNoise) {
      console.log(`[NoiseFilter] Removed (noise): ${item.title.slice(0, 30)}...`);
      return false;
    }

    // 너무 짧은 제목 제외
    if (item.title.length < 10) {
      console.log(`[NoiseFilter] Removed (short): ${item.title}`);
      return false;
    }

    return true;
  });
}

function removeDuplicates(items) {
  const unique = [];

  for (const item of items) {
    const isDuplicate = unique.some(existing =>
      calculateSimilarity(existing.title, item.title) > SIMILARITY_THRESHOLD
    );

    if (!isDuplicate) {
      unique.push(item);
    } else {
      console.log(`[NoiseFilter] Removed (dup): ${item.title.slice(0, 30)}...`);
    }
  }

  return unique;
}

function calculateSimilarity(str1, str2) {
  const words1 = new Set(str1.toLowerCase().split(/\s+/));
  const words2 = new Set(str2.toLowerCase().split(/\s+/));

  const intersection = [...words1].filter(w => words2.has(w)).length;
  const union = new Set([...words1, ...words2]).size;

  return union > 0 ? intersection / union : 0;
}

module.exports = { filterNoise, removeDuplicates };
