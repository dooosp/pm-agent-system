const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');

const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: config.GEMINI_MODEL });

async function generate(prompt, systemInstruction = '') {
  try {
    const fullPrompt = systemInstruction
      ? `${systemInstruction}\n\n${prompt}`
      : prompt;

    const result = await model.generateContent(fullPrompt);
    return result.response.text();
  } catch (error) {
    console.error('Gemini API 오류:', error.message);
    throw error;
  }
}

async function generateJSON(prompt, systemInstruction = '') {
  const response = await generate(prompt, systemInstruction);

  // JSON 추출 (마크다운 코드 블록 제거)
  const jsonStr = response
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  // JSON 객체 또는 배열 추출 시도
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }

  return JSON.parse(jsonStr);
}

module.exports = { generate, generateJSON };
