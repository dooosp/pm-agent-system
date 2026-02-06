/**
 * Google News redirect URL -> original URL resolution (DuckDuckGo search)
 */
const axios = require('axios');
const cheerio = require('cheerio');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function resolveOriginalUrl(title, { timeout = 8000 } = {}) {
  const cleanTitle = title.replace(/\s*-\s*[^-]+$/, '').trim();

  // 1st: DuckDuckGo full title search
  try {
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanTitle)}`;
    const res = await axios.get(ddgUrl, { headers: { 'User-Agent': UA }, timeout });
    const $ = cheerio.load(res.data);
    const href = $('.result__a').first().attr('href') || '';
    const match = href.match(/uddg=([^&]+)/);
    if (match) {
      const url = decodeURIComponent(match[1]);
      if (!url.includes('google.com')) return url;
    }
  } catch {}

  // 2nd: first 8 words + "news"
  try {
    const shortTitle = cleanTitle.split(' ').slice(0, 8).join(' ');
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(shortTitle + ' news')}`;
    const res = await axios.get(ddgUrl, { headers: { 'User-Agent': UA }, timeout });
    const $ = cheerio.load(res.data);
    let foundUrl = null;
    $('.result__a').slice(0, 3).each((i, el) => {
      const href = $(el).attr('href') || '';
      const match = href.match(/uddg=([^&]+)/);
      if (match && !foundUrl) {
        const url = decodeURIComponent(match[1]);
        if (!url.includes('google.com') && !url.includes('youtube.com') && !url.includes('wikipedia')) {
          foundUrl = url;
        }
      }
    });
    if (foundUrl) return foundUrl;
  } catch {}

  return null;
}

module.exports = { resolveOriginalUrl };
