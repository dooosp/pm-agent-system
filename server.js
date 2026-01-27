const express = require('express');
const path = require('path');
const config = require('./config');

const app = express();

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
    const { sessionId, documentType } = req.body;
    if (!sessionId || !documentType) {
      return res.status(400).json({ error: 'sessionId and documentType required' });
    }

    const pipeline = require('./orchestrator/pipeline');
    const result = await pipeline.generateDocument(sessionId, documentType);

    res.json({ success: true, document: result });
  } catch (error) {
    console.error('Generate document error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
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
