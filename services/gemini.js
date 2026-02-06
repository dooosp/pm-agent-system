/**
 * Gemini service — thin wrapper over lib/llm-client
 * Preserves existing API: generate(prompt, systemInstruction), generateJSON(prompt, systemInstruction)
 */
const { createLLMClient } = require('../lib/llm-client');
const config = require('../config');

const llm = createLLMClient({
  provider: 'gemini',
  apiKey: config.GEMINI_API_KEY,
  model: config.GEMINI_MODEL,
  timeout: 30000,
  maxRetries: 3
});

/**
 * Generate text response (backward-compatible API)
 * @param {string} prompt
 * @param {string} [systemInstruction] - prepended as "System: ..." to prompt
 * @returns {Promise<string>}
 */
async function generate(prompt, systemInstruction = '') {
  const fullPrompt = systemInstruction
    ? `System: ${systemInstruction}\n\n${prompt}`
    : prompt;

  return llm.chat(fullPrompt, { label: 'Gemini' });
}

/**
 * Generate and parse JSON response (backward-compatible API)
 * @param {string} prompt
 * @param {string} [systemInstruction] - prepended as "System: ..." to prompt
 * @returns {Promise<any>} parsed JSON
 */
async function generateJSON(prompt, systemInstruction = '') {
  const fullPrompt = systemInstruction
    ? `System: ${systemInstruction}\n\n${prompt}`
    : prompt;

  return llm.chatJSON(fullPrompt, { label: 'Gemini' });
}

module.exports = { generate, generateJSON };
