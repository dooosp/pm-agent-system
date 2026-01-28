module.exports = {
  // Server
  PORT: process.env.PORT || 3002,

  // Gemini API
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: 'gemini-3-flash-preview',

  // Agent Settings
  agents: {
    input: {
      maxItems: 15,
      relevanceThreshold: 0.5,
      cacheTTL: 30 * 60 * 1000  // 30분
    },
    analysis: {
      maxProblems: 5,
      whyDepth: 5  // 5-Why
    },
    planning: {
      maxInitiatives: 10
    },
    output: {
      documentTypes: ['prd', 'one-pager', 'briefing']
    }
  },

  // Session
  session: {
    ttl: 24 * 60 * 60 * 1000  // 24시간
  }
};
