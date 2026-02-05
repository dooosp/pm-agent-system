// API 엔드포인트 (로컬이면 localhost, 아니면 Worker)
const API_BASE = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
  ? `${location.protocol}//${location.host}`
  : 'https://pm-agent-system.onrender.com';

let currentSession = null;
let currentTab = 'input'; // eslint-disable-line no-unused-vars
let analyzeController = null;

// Analyze
async function analyze() { // eslint-disable-line no-unused-vars
  const query = document.getElementById('query').value.trim();
  if (!query) return alert('주제를 입력해주세요');

  const btn = document.getElementById('analyzeBtn');
  const demoBtn = document.getElementById('demoBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  btn.disabled = true;
  btn.textContent = '분석 중...';
  if (demoBtn) demoBtn.disabled = true;
  if (cancelBtn) cancelBtn.classList.remove('hidden');

  analyzeController = new AbortController();

  showProgress();
  setStep(1);

  // 3초 간격으로 step 1→2→3→1→2→3... 순환 (API 응답 전까지)
  let currentStepNum = 1;
  const stepTimer = setInterval(() => {
    currentStepNum = (currentStepNum % 3) + 1;
    setStep(currentStepNum);
  }, 3000);

  try {
    const response = await fetch(`${API_BASE}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      signal: analyzeController.signal
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'API 오류');

    clearInterval(stepTimer);
    currentSession = data;
    setStep(4);
    showResults();
    renderTab('input');

  } catch (error) {
    clearInterval(stepTimer);
    if (error.name !== 'AbortError') {
      alert('오류: ' + error.message);
    }
    hideProgress();
    document.getElementById('feature-preview').classList.remove('hidden');
  } finally {
    analyzeController = null;
    btn.disabled = false;
    btn.textContent = '분석 시작';
    if (demoBtn) demoBtn.disabled = false;
    if (cancelBtn) cancelBtn.classList.add('hidden');
  }
}

// Cancel
function cancelAnalysis() { // eslint-disable-line no-unused-vars
  if (analyzeController) analyzeController.abort();
}

// Progress
function showProgress() {
  document.getElementById('feature-preview').classList.add('hidden');
  document.getElementById('progress').classList.remove('hidden');
  document.getElementById('results').classList.add('hidden');
}

function hideProgress() {
  document.getElementById('progress').classList.add('hidden');
}

const STEP_STATUS = {
  1: { active: '수집 중...', done: '수집 완료' },
  2: { active: '분석 중...', done: '분석 완료' },
  3: { active: '계획 수립 중...', done: '계획 완료' },
  4: { active: '문서 생성 중...', done: '완료' }
};

function setStep(step) {
  document.querySelectorAll('.progress-step').forEach((el, i) => {
    const stepNum = i + 1;
    const statusText = el.querySelector('.status-text');
    el.classList.remove('active', 'done');
    if (stepNum < step) {
      el.classList.add('done');
      if (statusText) statusText.textContent = STEP_STATUS[stepNum]?.done || '';
    } else if (stepNum === step) {
      el.classList.add('active');
      if (statusText) statusText.textContent = STEP_STATUS[stepNum]?.active || '';
    } else {
      if (statusText) statusText.textContent = '';
    }
  });
}

// Results
function showResults() {
  document.getElementById('results').classList.remove('hidden');
  document.getElementById('doc-gen').classList.remove('hidden');
}

function renderTab(tab) {
  currentTab = tab;

  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });

  const content = document.getElementById('tab-content');
  let data;

  switch (tab) {
    case 'input':
      data = currentSession?.inputResult;
      break;
    case 'analysis':
      data = currentSession?.analysisResult;
      break;
    case 'planning':
      data = currentSession?.planningResult;
      break;
    case 'output':
      data = currentSession?.outputResult;
      break;
  }

  if (data) {
    content.innerHTML = formatData(tab, data);
  } else {
    content.textContent = '데이터 없음';
  }
}

// 데이터 포맷팅 (가독성 개선)
function formatData(tab, data) {
  if (tab === 'input' && data.items) {
    return `<div class="formatted">
      <h4>📊 수집 결과: ${data.items.length}개 뉴스</h4>
      <ul>${data.items.map(item => `
        <li>
          <strong>${item.title}</strong>
          <span class="tags">${(item.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}</span>
          <span class="score">관련도: ${(item.relevanceScore * 100).toFixed(0)}%</span>
        </li>
      `).join('')}</ul>
    </div>`;
  }

  if (tab === 'analysis' && data.problems) {
    return `<div class="formatted">
      <h4>🧠 분석된 문제: ${data.problems.length}개</h4>
      ${data.problems.map(p => `
        <div class="problem-card">
          <strong>${p.id}: ${p.problem}</strong>
          <p><em>근본 원인:</em> ${p.rootCause || 'N/A'}</p>
          <p><em>긴급도:</em> ${p.impact?.urgency || 'N/A'} | <em>점수:</em> ${p.impact?.score || 'N/A'}/10</p>
        </div>
      `).join('')}
      <h4>💡 인사이트</h4>
      <ul>${(data.insights || []).map(i => `<li>${i}</li>`).join('')}</ul>
    </div>`;
  }

  if (tab === 'planning' && data.initiatives) {
    return `<div class="formatted">
      <h4>📐 이니셔티브: ${data.initiatives.length}개</h4>
      ${data.initiatives.map(i => `
        <div class="initiative-card ${i.priority}">
          <strong>${i.priority} | ${i.title}</strong>
          <p>${i.description || ''}</p>
          <span class="rice">RICE: ${i.rice?.score || 'N/A'}</span>
        </div>
      `).join('')}
      <h4>🗓 로드맵</h4>
      <pre>${JSON.stringify(data.roadmap || {}, null, 2)}</pre>
    </div>`;
  }

  if (tab === 'output' && data.document) {
    const doc = data.document;
    return `<div class="formatted document">
      <h3>${doc.title || '문서'}</h3>
      ${doc.executiveSummary ? `<p class="summary">${doc.executiveSummary}</p>` : ''}
      <pre>${JSON.stringify(doc, null, 2)}</pre>
    </div>`;
  }

  return `<pre>${JSON.stringify(data, null, 2)}</pre>`;
}

// Tab clicks
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => renderTab(tab.dataset.tab));
});

// Document Generation
async function generateDoc(type) { // eslint-disable-line no-unused-vars
  if (!currentSession) return alert('먼저 분석을 실행하세요');

  const btn = event.target.closest('button');
  const allDocBtns = document.querySelectorAll('.doc-buttons button');
  allDocBtns.forEach(b => b.disabled = true);
  const originalTitle = btn.querySelector('.doc-card-title');
  if (originalTitle) originalTitle.textContent = '생성 중...';

  try {
    const body = currentSession.sessionId
      ? { sessionId: currentSession.sessionId, documentType: type }
      : { planningResult: currentSession.planningResult, documentType: type };

    const response = await fetch(`${API_BASE}/api/generate-document`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error);

    // 로컬 서버: { success, document: { documentType, document, ... } }
    // Worker: { documentType, document, ... }
    currentSession.outputResult = data.success ? data.document : data;
    renderTab('output');

    // Export 버튼 표시
    const exportBar = document.getElementById('export-bar');
    if (exportBar) exportBar.classList.remove('hidden');

  } catch (error) {
    alert('문서 생성 오류: ' + error.message);
  } finally {
    allDocBtns.forEach(b => b.disabled = false);
    const typeNames = { prd: 'PRD', 'one-pager': 'One-Pager', briefing: 'Briefing' };
    if (originalTitle) originalTitle.textContent = typeNames[type] || type.toUpperCase();
  }
}

// Demo Mode
async function loadDemo() { // eslint-disable-line no-unused-vars
  const btn = document.querySelector('.demo-btn');
  btn.disabled = true;
  btn.textContent = 'Loading...';

  try {
    const response = await fetch(`${API_BASE}/api/demo`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Demo load failed');

    currentSession = data;
    document.getElementById('query').value = data.query;
    document.getElementById('feature-preview').classList.add('hidden');
    showResults();
    renderTab('input');
  } catch (error) {
    alert('Demo load error: ' + error.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Demo';
  }
}

// Markdown Export
function exportMarkdown() { // eslint-disable-line no-unused-vars
  if (!currentSession?.sessionId) return alert('먼저 분석 후 문서를 생성하세요');
  if (!currentSession?.outputResult) return alert('먼저 문서를 생성하세요');

  window.open(`${API_BASE}/api/export/${currentSession.sessionId}`, '_blank');
}
