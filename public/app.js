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
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.error);

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

  content.textContent = data
    ? JSON.stringify(data, null, 2)
    : '데이터 없음';
}

// Tab clicks
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => renderTab(tab.dataset.tab));
});

// Document Generation
async function generateDoc(type) {
  if (!currentSession) return alert('먼저 분석을 실행하세요');

  try {
    const response = await fetch('/api/generate-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: currentSession.sessionId,
        documentType: type
      })
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.error);

    currentSession.outputResult = data.document;
    renderTab('output');

  } catch (error) {
    alert('문서 생성 오류: ' + error.message);
  }
}
