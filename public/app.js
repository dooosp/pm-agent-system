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

  // 경과 시간 카운터
  const startTime = Date.now();
  const infoEl = document.getElementById('progress-info');
  const elapsedTimer = setInterval(() => {
    const sec = Math.floor((Date.now() - startTime) / 1000);
    const msg = sec < 10
      ? `분석 진행 중... ${sec}초`
      : `서버 응답 대기 중... ${sec}초 (최초 접속 시 30초 이상 소요)`;
    if (infoEl) infoEl.textContent = msg;
  }, 1000);

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
    clearInterval(elapsedTimer);
    if (infoEl) infoEl.textContent = '';
    currentSession = data;
    setStep(5);
    showResults();
    renderTab('input');

  } catch (error) {
    clearInterval(stepTimer);
    clearInterval(elapsedTimer);
    if (infoEl) infoEl.textContent = '';
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
      <div class="news-grid">${data.items.map(item => {
        const score = (item.relevanceScore * 100).toFixed(0);
        const level = score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low';
        return `
        <div class="news-card">
          <div class="news-header">
            <span class="relevance-badge ${level}">${score}%</span>
          </div>
          <h5 class="news-title">${item.title}</h5>
          <div class="tags">${(item.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}</div>
          <p class="news-source">${item.source || ''}</p>
        </div>`;
      }).join('')}</div>
    </div>`;
  }

  if (tab === 'analysis' && data.problems) {
    return `<div class="formatted">
      <h4>🧠 분석된 문제: ${data.problems.length}개</h4>
      ${data.problems.map(p => {
        const urgency = p.impact?.urgency || 'medium';
        const score = p.impact?.score || 0;
        return `
        <div class="problem-card enhanced">
          <div class="problem-header">
            <span class="problem-id">${p.id}</span>
            <span class="urgency-badge ${urgency.toLowerCase()}">${urgency}</span>
          </div>
          <h5 class="news-title">${p.problem}</h5>
          <div class="rca-chain">
            <div class="rca-node symptom">${p.problem}</div>
            <span class="rca-arrow">→</span>
            <div class="rca-node root">${p.rootCause || 'N/A'}</div>
          </div>
          <div class="impact-bar">
            <div class="impact-track"><div class="impact-fill" style="width: ${score * 10}%"></div></div>
            <span class="impact-score">${score}/10</span>
          </div>
        </div>`;
      }).join('')}
      <h4>💡 인사이트</h4>
      <ul>${(data.insights || []).map(i => `<li>${i}</li>`).join('')}</ul>
    </div>`;
  }

  if (tab === 'planning') {
    const initiatives = data.initiatives || [];
    const errors = data.errors || [];
    const roadmap = data.roadmap || {};
    const errorHtml = errors.length > 0
      ? `<div class="error-banner">⚠️ ${errors.join(', ')}</div>`
      : '';
    const initiativesHtml = initiatives.length > 0
      ? initiatives.map(i => `
        <div class="initiative-card ${i.priority}">
          <strong>${i.priority} | ${i.title}</strong>
          <p>${i.description || ''}</p>
          <span class="rice">RICE: ${i.rice?.score || 'N/A'}</span>
        </div>
      `).join('')
      : '<p class="no-data">이니셔티브가 없습니다. Gemini API 오류일 수 있습니다.</p>';

    // 로드맵: phases 배열 또는 Q1/Q2 객체 형식 지원
    const phases = roadmap.phases || [];
    const quarters = Object.keys(roadmap).filter(k => k !== 'phases' && k !== 'quickWins');
    let roadmapHtml = '';
    if (phases.length > 0) {
      roadmapHtml = `<table class="roadmap-table">
        <thead><tr><th>단계</th><th>기간</th><th>마일스톤</th></tr></thead>
        <tbody>${phases.map(p => `
          <tr>
            <td><span class="quarter-badge">${p.phase || ''}</span></td>
            <td>${p.period || ''}</td>
            <td>${Array.isArray(p.items) ? p.items.join(', ') : ''}</td>
          </tr>
        `).join('')}</tbody>
      </table>`;
    } else if (quarters.length > 0) {
      roadmapHtml = `<table class="roadmap-table">
        <thead><tr><th>분기</th><th>마일스톤</th></tr></thead>
        <tbody>${quarters.map(q => `
          <tr>
            <td><span class="quarter-badge">${q}</span></td>
            <td>${Array.isArray(roadmap[q]) ? roadmap[q].join(', ') : roadmap[q]}</td>
          </tr>
        `).join('')}</tbody>
      </table>`;
    } else {
      roadmapHtml = '<p class="no-data">로드맵 정보 없음</p>';
    }

    return `<div class="formatted">
      ${errorHtml}
      <h4>📐 이니셔티브: ${initiatives.length}개</h4>
      ${initiativesHtml}
      <h4>🗓 로드맵</h4>
      ${roadmapHtml}
    </div>`;
  }

  if (tab === 'output' && data.document) {
    const doc = data.document;
    const sections = [];

    if (doc.executiveSummary || doc.summary) {
      sections.push(`<div class="doc-section highlight">
        <h4>📋 Executive Summary</h4>
        <p>${doc.executiveSummary || doc.summary}</p>
      </div>`);
    }
    if (doc.problem) {
      sections.push(`<div class="doc-section">
        <h4>🔍 Problem</h4>
        <p>${doc.problem}</p>
      </div>`);
    }
    if (doc.goals || doc.objectives) {
      const goals = doc.goals || doc.objectives || [];
      sections.push(`<div class="doc-section">
        <h4>🎯 Goals</h4>
        <ul>${(Array.isArray(goals) ? goals : [goals]).map(g => `<li>${typeof g === 'object' ? g.description || JSON.stringify(g) : g}</li>`).join('')}</ul>
      </div>`);
    }
    if (doc.solution) {
      sections.push(`<div class="doc-section">
        <h4>💡 Solution</h4>
        <p>${doc.solution}</p>
      </div>`);
    }
    if (doc.features || doc.userStories) {
      const features = doc.features || doc.userStories || [];
      sections.push(`<div class="doc-section">
        <h4>✨ Features</h4>
        <div class="feature-grid">${(Array.isArray(features) ? features : [features]).map(f => `
          <div class="feature-item">
            <strong>${typeof f === 'object' ? (f.title || f.story || 'Feature') : f}</strong>
            <span>${typeof f === 'object' ? (f.description || f.acceptance || '') : ''}</span>
          </div>
        `).join('')}</div>
      </div>`);
    }
    if (doc.expectedOutcome || doc.investment) {
      sections.push(`<div class="doc-section">
        <h4>📈 Expected Outcome</h4>
        <p>${doc.expectedOutcome || ''}</p>
        ${doc.investment ? `<p><strong>Investment:</strong> ${doc.investment}</p>` : ''}
      </div>`);
    }
    if (doc.risks) {
      sections.push(`<div class="doc-section">
        <h4>⚠️ Risks</h4>
        <p>${typeof doc.risks === 'string' ? doc.risks : JSON.stringify(doc.risks)}</p>
      </div>`);
    }
    if (doc.objectionHandling) {
      sections.push(`<div class="doc-section">
        <h4>💬 Q&A</h4>
        <ul>${doc.objectionHandling.map(qa => `<li><strong>Q:</strong> ${qa.question}<br><strong>A:</strong> ${qa.answer}</li>`).join('')}</ul>
      </div>`);
    }

    return `<div class="formatted document">
      <h3>${doc.title || '문서'}</h3>
      <div class="doc-sections">${sections.length > 0 ? sections.join('') : `<pre>${JSON.stringify(doc, null, 2)}</pre>`}</div>
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

  // initiatives 존재 여부 확인
  const initiatives = currentSession.planningResult?.initiatives || [];
  if (initiatives.length === 0) {
    return alert('이니셔티브가 없습니다. Planning 탭에서 결과를 확인하세요.\n(Gemini API 오류로 이니셔티브 생성이 실패했을 수 있습니다)');
  }

  const btn = event.target.closest('button');
  const allDocBtns = document.querySelectorAll('.doc-buttons button');
  allDocBtns.forEach(b => b.disabled = true);
  const originalTitle = btn.querySelector('.doc-card-title');
  if (originalTitle) originalTitle.textContent = '생성 중...';

  try {
    // 항상 planningResult 직접 전달 (세션 만료 문제 방지)
    const body = { planningResult: currentSession.planningResult, documentType: type };

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
