// API 엔드포인트 (로컬이면 localhost, 아니면 Worker)
const API_BASE = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
  ? `${location.protocol}//${location.host}`
  : 'https://pm-agent-system.onrender.com';

let currentSession = null;
let currentTab = 'input';

// Analyze
async function analyze() {
  const query = document.getElementById('query').value.trim();
  if (!query) return alert('주제를 입력해주세요');

  const btn = document.getElementById('analyzeBtn');
  btn.disabled = true;
  btn.textContent = '분석 중...';

  showProgress();
  setStep(1);

  try {
    // 단계별 프로그레스 시뮬레이션
    setTimeout(() => setStep(2), 2000);
    setTimeout(() => setStep(3), 5000);

    const response = await fetch(`${API_BASE}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'API 오류');

    currentSession = data;
    setStep(4);
    showResults();
    renderTab('input');

  } catch (error) {
    alert('오류: ' + error.message);
    hideProgress();
  } finally {
    btn.disabled = false;
    btn.textContent = '분석 시작';
  }
}

// Progress
function showProgress() {
  document.getElementById('progress').classList.remove('hidden');
  document.getElementById('results').classList.add('hidden');
}

function hideProgress() {
  document.getElementById('progress').classList.add('hidden');
}

function setStep(step) {
  document.querySelectorAll('.progress-step').forEach((el, i) => {
    el.classList.remove('active', 'done');
    if (i + 1 < step) el.classList.add('done');
    if (i + 1 === step) el.classList.add('active');
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
async function generateDoc(type) {
  if (!currentSession) return alert('먼저 분석을 실행하세요');

  const btn = event.target;
  btn.disabled = true;
  btn.textContent = '생성 중...';

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

  } catch (error) {
    alert('문서 생성 오류: ' + error.message);
  } finally {
    btn.disabled = false;
    btn.textContent = btn.textContent.replace('생성 중...', type.toUpperCase() + ' 생성');
  }
}
