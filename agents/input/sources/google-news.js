const Parser = require('rss-parser');
const axios = require('axios');

const parser = new Parser({
  customFields: {
    item: ['source']
  }
});

const GOOGLE_NEWS_RSS = 'https://news.google.com/rss/search';

async function fetchGoogleNews(query, maxItems = 15) {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `${GOOGLE_NEWS_RSS}?q=${encodedQuery}&hl=ko&gl=KR&ceid=KR:ko`;

    console.log(`[GoogleNews] Fetching: ${query}`);
    const feed = await parser.parseURL(url);

    const items = feed.items.slice(0, maxItems).map(item => ({
      title: item.title?.replace(/ - .+$/, '') || '',
      link: item.link || '',
      source: item.source?._ || extractSource(item.title),
      pubDate: item.pubDate || '',
      content: item.contentSnippet || ''
    }));

    console.log(`[GoogleNews] Found ${items.length} items`);
    return items;

  } catch (error) {
    console.error('[GoogleNews] Error:', error.message);
    return [];
  }
}

function extractSource(title) {
  const match = title?.match(/ - ([^-]+)$/);
  return match ? match[1].trim() : 'Unknown';
}

async function fetchContent(url, maxLength = 1500) {
  try {
    const response = await axios.get(url, {
      timeout: 5000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    // 간단한 본문 추출 (첫 번째 p 태그들)
    const text = response.data
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return text.slice(0, maxLength);
  } catch {
    return '';
  }
}

module.exports = { fetchGoogleNews, fetchContent };
