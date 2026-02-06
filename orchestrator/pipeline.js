const fs = require('fs');
const path = require('path');
const inputAgent = require('../agents/input');
const analysisAgent = require('../agents/analysis');
const planningAgent = require('../agents/planning');
const outputAgent = require('../agents/output');
const config = require('../config');

const SESSIONS_DIR = path.join(__dirname, '..', 'data', 'sessions');
const fsp = fs.promises;

class Pipeline {
  constructor() {
    this.sessions = new Map();
    this._ready = this._init();
  }

  async _init() {
    await fsp.mkdir(SESSIONS_DIR, { recursive: true });
    await this._loadSessions();

    // 주기적 세션 정리 (15분마다)
    this._cleanupTimer = setInterval(() => this.cleanupExpiredSessions(), 15 * 60 * 1000);
    this._cleanupTimer.unref();
  }

  async _loadSessions() {
    try {
      const files = (await fsp.readdir(SESSIONS_DIR)).filter(f => f.endsWith('.json'));
      const now = Date.now();
      for (const file of files) {
        try {
          const data = JSON.parse(await fsp.readFile(path.join(SESSIONS_DIR, file), 'utf-8'));
          if (now - new Date(data.createdAt).getTime() < config.session.ttl) {
            this.sessions.set(data.id, data);
          } else {
            await fsp.unlink(path.join(SESSIONS_DIR, file)).catch(() => {});
          }
        } catch (e) {
          console.warn(`[Pipeline] Failed to load session file ${file}:`, e.message);
        }
      }
      if (this.sessions.size > 0) {
        console.log(`[Pipeline] Loaded ${this.sessions.size} sessions from disk`);
      }
    } catch (err) {
      if (err.code !== 'ENOENT') console.warn('[Pipeline] Session load error:', err.message);
    }
  }

  async _saveSession(session) {
    try {
      const filePath = path.join(SESSIONS_DIR, `${session.id}.json`);
      await fsp.writeFile(filePath, JSON.stringify(session, null, 2));
    } catch (err) {
      console.warn('[Pipeline] Session save error:', err.message);
    }
  }

  async _deleteSessionFile(sessionId) {
    try {
      this._validateSessionId(sessionId);
      await fsp.unlink(path.join(SESSIONS_DIR, `${sessionId}.json`));
    } catch (_) { /* ignore */ }
  }

  async cleanupExpiredSessions() {
    const now = Date.now();
    const ttl = config.session.ttl;
    let removed = 0;

    for (const [id, session] of this.sessions) {
      if (now - new Date(session.createdAt).getTime() > ttl) {
        this.sessions.delete(id);
        await this._deleteSessionFile(id);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`[Pipeline] Cleaned up ${removed} expired sessions`);
    }
  }

  async runFullPipeline(query, sessionId) {
    await this._ready;
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
    await this._saveSession(session);
    return session;
  }

  async generateDocument(sessionId, documentType) {
    await this._ready;
    const session = this.sessions.get(sessionId);
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
    await this._saveSession(session);
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
    await this._ready;
    this._validateSessionId(sessionId);
    const session = this.sessions.get(sessionId);
    if (session && Date.now() - new Date(session.createdAt).getTime() > config.session.ttl) {
      this.sessions.delete(sessionId);
      await this._deleteSessionFile(sessionId);
      return undefined;
    }
    return session;
  }
}

module.exports = new Pipeline();
