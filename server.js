const express = require('express');
const path = require('path');
const config = require('./config');

const app = express();

// CORS
const ALLOWED_ORIGINS = [
  'https://dooosp.github.io',
  'http://localhost:3002',
  'http://127.0.0.1:3002'
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Rate Limiting (10 req/min per IP for API routes)
const rateLimitMap = new Map();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60 * 1000;

app.use('/api', (req, res, next) => {
  if (req.method === 'OPTIONS') return next();
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now - entry.start > RATE_WINDOW) {
    rateLimitMap.set(ip, { start: now, count: 1 });
    return next();
  }

  entry.count++;
  if (entry.count > RATE_LIMIT) {
    return res.status(429).json({ error: 'Too many requests. Try again later.' });
  }
  next();
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// UUID 생성
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Routes
app.post('/api/analyze', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const pipeline = require('./orchestrator/pipeline');
    const sessionId = generateId();
    const result = await pipeline.runFullPipeline(query, sessionId);

    res.json({ success: true, sessionId, ...result });
  } catch (error) {
    console.error('Analyze error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/generate-document', async (req, res) => {
  try {
    const { sessionId, planningResult, documentType } = req.body;
    if (!documentType || (!sessionId && !planningResult)) {
      return res.status(400).json({ error: 'documentType and (sessionId or planningResult) required' });
    }

    const pipeline = require('./orchestrator/pipeline');
    const result = sessionId
      ? await pipeline.generateDocument(sessionId, documentType)
      : await pipeline.generateDocumentDirect(planningResult, documentType);

    res.json({ success: true, document: result });
  } catch (error) {
    console.error('Generate document error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Demo Mode
app.get('/api/demo', (req, res) => {
  try {
    const demoData = require('./data/demo-preset.json');
    const pipeline = require('./orchestrator/pipeline');
    const sessionId = 'demo-' + Date.now().toString(36);

    const session = {
      id: sessionId,
      ...demoData,
      createdAt: new Date().toISOString(),
      outputResult: null
    };

    pipeline.sessions.set(sessionId, session);
    res.json({ success: true, sessionId, ...session });
  } catch (error) {
    console.error('Demo error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Markdown Export
app.get('/api/export/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const pipeline = require('./orchestrator/pipeline');
    const { toMarkdown } = require('./services/markdown-exporter');

    const session = pipeline.getSession(sessionId);
    if (!session || !session.outputResult) {
      return res.status(404).json({ error: 'Session not found or no document generated' });
    }

    const { documentType, document } = session.outputResult;
    const md = toMarkdown(documentType, document);
    const filename = `${documentType}-${sessionId}.md`;

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(md);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug: API Key 상태 확인 (배포 후 삭제)
app.get('/api/debug/env', (req, res) => {
  const key = config.GEMINI_API_KEY || '';
  res.json({
    keyLength: key.length,
    keyPrefix: key.substring(0, 4),
    keySuffix: key.slice(-4),
    model: config.GEMINI_MODEL,
    hasKey: key.length > 0
  });
});

// Start server
const apiKey = config.GEMINI_API_KEY || '';
console.log(`[Config] GEMINI_API_KEY: length=${apiKey.length}, prefix="${apiKey.substring(0, 4)}...", suffix="...${apiKey.slice(-4)}"`);

app.listen(config.PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║         PM Agent System v1.0.0                    ║
║         http://localhost:${config.PORT}                    ║
╠═══════════════════════════════════════════════════╣
║  Agents:                                          ║
║    1. Input Agent (The Scout)                     ║
║    2. Analysis Agent (The Brain)                  ║
║    3. Planning Agent (The Architect)              ║
║    4. Output Agent (The Closer)                   ║
╚═══════════════════════════════════════════════════╝
  `);
});
