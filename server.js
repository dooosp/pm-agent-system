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
