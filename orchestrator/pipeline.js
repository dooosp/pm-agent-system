const inputAgent = require('../agents/input');
const analysisAgent = require('../agents/analysis');
const planningAgent = require('../agents/planning');
const outputAgent = require('../agents/output');
const config = require('../config');
const sessionDb = require('../lib/session-db');

class Pipeline {
  constructor() {
    // Proxy object for backward-compat with server.js `pipeline.sessions.set()`
    this.sessions = {
      set: (id, data) => sessionDb.saveSession(id, data),
      get: (id) => sessionDb.getSession(id),
      delete: (id) => sessionDb.deleteSession(id),
      get size() { return sessionDb.count(); },
    };

    // Clean up expired sessions on startup + every 15 minutes
    this.cleanupExpiredSessions();
    this._cleanupTimer = setInterval(() => this.cleanupExpiredSessions(), 15 * 60 * 1000);
    this._cleanupTimer.unref();

    const total = sessionDb.count();
    if (total > 0) {
      console.log(`[Pipeline] SQLite DB has ${total} sessions`);
    }
  }

  cleanupExpiredSessions() {
    const ttl = config.session.ttl;
    const cutoff = new Date(Date.now() - ttl).toISOString();
    const removed = sessionDb.deleteExpired(cutoff);
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

    sessionDb.saveSession(sessionId, session);
    return session;
  }

  async generateDocument(sessionId, documentType) {
    const session = sessionDb.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (!session.planningResult) {
      throw new Error('Planning phase not completed - no planningResult available');
    }
    console.log(`[Pipeline] Generating ${documentType} document`);
    const outputResult = await outputAgent.execute(
      session.planningResult,
      documentType
    );

    session.outputResult = outputResult;
    sessionDb.saveSession(sessionId, session);
    return outputResult;
  }

  async generateDocumentDirect(planningResult, documentType) {
    console.log(`[Pipeline] Generating ${documentType} document (direct)`);
    return await outputAgent.execute(planningResult, documentType);
  }

  _validateSessionId(sessionId) {
    if (typeof sessionId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(sessionId)) {
      throw new Error(`Invalid session ID: ${sessionId}`);
    }
  }

  async getSession(sessionId) {
    this._validateSessionId(sessionId);
    const session = sessionDb.getSession(sessionId);
    if (session && Date.now() - new Date(session.createdAt).getTime() > config.session.ttl) {
      sessionDb.deleteSession(sessionId);
      return undefined;
    }
    return session;
  }
}

module.exports = new Pipeline();
