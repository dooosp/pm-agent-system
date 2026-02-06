/**
 * Google News source — thin wrapper over lib/news-fetcher
 * Preserves existing API: { fetchGoogleNews, fetchContent }
 */
const { fetchGoogleNews: _fetchGoogleNews, fetchArticleContent } = require('../../../lib/news-fetcher');

/**
 * Fetch Google News (backward-compatible API)
 * Original signature: fetchGoogleNews(query, maxItems)
 * news-fetcher signature: fetchGoogleNews(query, { maxItems })
 */
async function fetchGoogleNews(query, maxItems = 15) {
  return _fetchGoogleNews(query, { maxItems });
}

/**
 * Fetch article content (backward-compatible API)
 * Maps fetchContent -> fetchArticleContent from news-fetcher
 */
async function fetchContent(url, maxLength = 1500) {
  return fetchArticleContent(url, { maxLength });
}

module.exports = { fetchGoogleNews, fetchContent };
