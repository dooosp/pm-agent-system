/**
 * Prometheus 메트릭 모듈 (prom-client)
 */
const client = require('prom-client');

client.collectDefaultMetrics({ prefix: 'pm_agent_' });

const httpRequestsTotal = new client.Counter({
  name: 'pm_agent_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

const httpDuration = new client.Histogram({
  name: 'pm_agent_http_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5, 10],
});

const sessionsTotal = new client.Counter({
  name: 'pm_agent_sessions_total',
  help: 'Total analysis sessions created',
});

const geminiCallsTotal = new client.Counter({
  name: 'pm_agent_gemini_calls_total',
  help: 'Total Gemini API calls',
  labelNames: ['status'],
});

function httpMetricsMiddleware(req, res, next) {
  if (req.path === '/metrics' || req.path === '/health') return next();

  const end = httpDuration.startTimer();
  res.on('finish', () => {
    const route = req.route?.path || req.path;
    const labels = { method: req.method, route, status: res.statusCode };
    httpRequestsTotal.inc(labels);
    end(labels);
  });
  next();
}

module.exports = {
  client,
  httpMetricsMiddleware,
  sessionsTotal,
  geminiCallsTotal,
};
