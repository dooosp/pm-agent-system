/**
 * 헬스체크 표준 응답 빌더
 */

function buildHealthResponse(service, version, checks) {
  const results = {};
  let hasError = false;
  let hasDegraded = false;

  for (const [name, fn] of Object.entries(checks)) {
    try {
      const val = fn();
      results[name] = typeof val === 'object' ? { status: 'ok', ...val } : { status: 'ok' };
    } catch (err) {
      results[name] = { status: 'error', message: err.message };
      if (name === 'db') hasError = true;
      else hasDegraded = true;
    }
  }

  const status = hasError ? 'error' : hasDegraded ? 'degraded' : 'ok';

  return {
    status,
    service,
    version,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    checks: results,
  };
}

module.exports = { buildHealthResponse };
