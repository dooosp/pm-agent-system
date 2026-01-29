const inputAgent = require('../agents/input');
const analysisAgent = require('../agents/analysis');
const planningAgent = require('../agents/planning');
const outputAgent = require('../agents/output');
const config = require('../config');

class Pipeline {
  constructor() {
    this.sessions = new Map();

    // 주기적 세션 정리 (15분마다)
    this._cleanupTimer = setInterval(() => this.cleanupExpiredSessions(), 15 * 60 * 1000);
    this._cleanupTimer.unref();
  }

  cleanupExpiredSessions() {
    const now = Date.now();
    const ttl = config.session.ttl;
    let removed = 0;

    for (const [id, session] of this.sessions) {
      if (now - new Date(session.createdAt).getTime() > ttl) {
        this.sessions.delete(id);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`[Pipeline] Cleaned up ${removed} expired sessions`);
    }
  }

  async runFullPipeline(query, sessionId) {
    this.cleanupExpiredSessions();
    console.log(`[Pipeline] Starting full pipeline for: "${query}"`);

    // Step 1: Input Agent
    console.log('[Pipeline] Step 1: Input Agent');
    const inputResult = await inputAgent.execute(query);

    // Step 2: Analysis Agent
    console.log('[Pipeline] Step 2: Analysis Agent');
    const analysisResult = await analysisAgent.execute(inputResult);

    // Step 3: Planning Agent
    console.log('[Pipeline] Step 3: Planning Agent');
    const planningResult = await planningAgent.execute(analysisResult);

    // Save session
    const session = {
      id: sessionId,
      query,
      createdAt: new Date().toISOString(),
      inputResult,
      analysisResult,
      planningResult,
      outputResult: null
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  async generateDocument(sessionId, documentType) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    console.log(`[Pipeline] Generating ${documentType} document`);
    const outputResult = await outputAgent.execute(
      session.planningResult,
      documentType
    );

    session.outputResult = outputResult;
    return outputResult;
  }

  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session && Date.now() - new Date(session.createdAt).getTime() > config.session.ttl) {
      this.sessions.delete(sessionId);
      return undefined;
    }
    return session;
  }
}

module.exports = new Pipeline();
