/**
 * news-fetcher -- shared news collection module (inline copy)
 *
 * Sources: Google News RSS, Korean RSS, Custom RSS
 * Utils: Jaccard deduplication, Cheerio content scraping, Google News URL resolution
 */

const { fetchGoogleNews, fetchGoogleNewsBatch } = require('./sources/google-news');
const { fetchRSSFeed, fetchCustomRSS, fetchAllKoreanRSS, FEEDS } = require('./sources/korean-rss');
const { removeDuplicates, calculateSimilarity } = require('./utils/deduplication');
const { fetchArticleContent } = require('./utils/content-scraper');
const { resolveOriginalUrl } = require('./utils/url-resolver');
const { withRetry } = require('./utils/retry');

/**
 * Batch article content enrichment (parallel in batches)
 * Google News URLs are automatically resolved to original URLs
 */
async function enrichArticles(articles, { batchSize = 3, delayMs = 300, resolveUrls = true } = {}) {
  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);
    await Promise.allSettled(batch.map(async (article) => {
      if (resolveUrls && article.link.includes('news.google.com')) {
        const originalUrl = await resolveOriginalUrl(article.title);
        if (originalUrl) {
          article.link = originalUrl;
          article.resolvedUrl = true;
        } else {
          const q = article.title.replace(/\s*-\s*[^-]+$/, '').trim();
          article.link = `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(q)}`;
          article.resolvedUrl = false;
        }
      }
      if (!article.content || article.content.length < 50) {
        article.content = await fetchArticleContent(article.link);
      }
    }));
    if (i + batchSize < articles.length) await new Promise(r => setTimeout(r, delayMs));
  }
  return articles;
}

/**
 * Unified news fetching -- Google News + Korean RSS in parallel, deduplicate, enrich
 */
async function fetchNews(queries, { maxItems = 5, enrichContent = true, koreanRSS = false } = {}) {
  const tasks = [fetchGoogleNewsBatch(queries, { maxItems })];
  if (koreanRSS) tasks.push(fetchAllKoreanRSS({ maxItems }));

  const settled = await Promise.allSettled(tasks);
  let allArticles = settled
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);

  allArticles = removeDuplicates(allArticles);

  if (enrichContent) {
    await enrichArticles(allArticles);
  }

  return allArticles;
}

module.exports = {
  // Unified
  fetchNews,
  enrichArticles,
  // Sources
  fetchGoogleNews,
  fetchGoogleNewsBatch,
  fetchRSSFeed,
  fetchCustomRSS,
  fetchAllKoreanRSS,
  FEEDS,
  // Utils
  removeDuplicates,
  calculateSimilarity,
  fetchArticleContent,
  resolveOriginalUrl,
  withRetry
};
