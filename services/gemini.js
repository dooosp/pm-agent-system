const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');

const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: config.GEMINI_MODEL });

const MAX_RETRIES = 3;
const BASE_DELAY = 1000;

async function withRetry(fn) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isRetryable = error.status === 429 || error.status >= 500 ||
        error.message?.includes('RESOURCE_EXHAUSTED') ||
        error.message?.includes('UNAVAILABLE');

      if (attempt === MAX_RETRIES || !isRetryable) {
        throw error;
      }

      const delay = BASE_DELAY * Math.pow(2, attempt) + Math.random() * 500;
      console.warn(`[Gemini] Retry ${attempt + 1}/${MAX_RETRIES} after ${Math.round(delay)}ms: ${error.message}`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

async function generate(prompt, systemInstruction = '') {
  const fullPrompt = systemInstruction
    ? `${systemInstruction}\n\n${prompt}`
    : prompt;

  return withRetry(async () => {
    const result = await model.generateContent(fullPrompt);
    return result.response.text();
  });
}

async function generateJSON(prompt, systemInstruction = '') {
  const response = await generate(prompt, systemInstruction);

  if (!response || response.trim().length === 0) {
    throw new Error('Gemini가 빈 응답을 반환했습니다. 프롬프트를 확인하세요.');
  }

  // JSON 추출 (마크다운 코드 블록 제거)
  const jsonStr = response
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  // JSON 객체 또는 배열 추출 시도
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error(`Gemini 응답에서 JSON을 추출할 수 없습니다. 응답 앞 200자: ${jsonStr.substring(0, 200)}`);
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    throw new Error(`JSON 파싱 실패: ${e.message}. 추출된 문자열 앞 200자: ${jsonMatch[0].substring(0, 200)}`);
  }
}

module.exports = { generate, generateJSON };
