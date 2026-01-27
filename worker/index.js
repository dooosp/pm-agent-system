/**
 * PM Agent System - Cloudflare Worker
 * Gemini API를 통한 PM 분석 및 문서 생성
 */

const GEMINI_API_KEY = '***REMOVED***';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// CORS 헤더
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/api/analyze' && request.method === 'POST') {
        const { query } = await request.json();
        const result = await runFullPipeline(query);
        return jsonResponse(result);
      }

      if (path === '/api/generate-document' && request.method === 'POST') {
        const { planningResult, documentType } = await request.json();
        const result = await generateDocument(planningResult, documentType);
        return jsonResponse(result);
      }

      return jsonResponse({ error: 'Not found' }, 404);
    } catch (error) {
      return jsonResponse({ error: error.message }, 500);
    }
  }
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Gemini API 호출
async function callGemini(prompt, systemPrompt = '') {
  const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

  const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: fullPrompt }] }],
      generationConfig: { maxOutputTokens: 4096 }
    })
  });

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function callGeminiJSON(prompt, systemPrompt = '') {
  const response = await callGemini(prompt, systemPrompt);
  const jsonStr = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const match = jsonStr.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  return match ? JSON.parse(match[0]) : null;
}

// ========== Input Agent ==========
async function inputAgent(query) {
  // Google News RSS 수집
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`;
  const rssResponse = await fetch(rssUrl);
  const rssText = await rssResponse.text();

  // 간단한 RSS 파싱
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(rssText)) !== null && items.length < 10) {
    const itemXml = match[1];
    const title = itemXml.match(/<title>(.*?)<\/title>/)?.[1]?.replace(/ - .+$/, '') || '';
    const link = itemXml.match(/<link>(.*?)<\/link>/)?.[1] || '';
    const source = itemXml.match(/<source[^>]*>(.*?)<\/source>/)?.[1] || 'Unknown';
    if (title) items.push({ title, link, source, tags: [], relevanceScore: 0.7 });
  }

  // AI 태깅
  if (items.length > 0) {
    const tagPrompt = `다음 뉴스를 분석하여 JSON 배열로 반환. 각 항목에 tags(market_trend/competitor/technology/customer/regulation/risk 중 선택)와 relevanceScore(0-1) 추가.
뉴스: ${items.map((item, i) => `${i}. ${item.title}`).join('\n')}
형식: [{"index": 0, "tags": ["market_trend"], "relevanceScore": 0.8}, ...]`;

    try {
      const tagResult = await callGeminiJSON(tagPrompt);
      if (Array.isArray(tagResult)) {
        tagResult.forEach(t => {
          if (items[t.index]) {
            items[t.index].tags = t.tags || [];
            items[t.index].relevanceScore = t.relevanceScore || 0.5;
          }
        });
      }
    } catch (e) { /* 태깅 실패해도 계속 진행 */ }
  }

  return {
    query,
    collectedAt: new Date().toISOString(),
    items: items.sort((a, b) => b.relevanceScore - a.relevanceScore),
    summary: { total: items.length, filtered: items.length }
  };
}

// ========== Analysis Agent ==========
async function analysisAgent(inputResult) {
  const { query, items } = inputResult;
  const newsContext = items.slice(0, 8).map(i => `- ${i.title}`).join('\n');

  const analysisPrompt = `PM/PO 관점에서 분석하세요.

검색 주제: "${query}"
수집된 뉴스:
${newsContext}

JSON으로 반환:
{
  "problems": [
    {
      "id": "P1",
      "problem": "핵심 문제 정의",
      "rootCause": "5-Why 분석 결과 근본 원인",
      "impact": { "summary": "비즈니스 임팩트 요약", "urgency": "high|medium|low", "score": 1-10 }
    }
  ],
  "insights": ["인사이트1: 실행 가능한 제안 포함", "인사이트2: ..."]
}`;

  const result = await callGeminiJSON(analysisPrompt, '당신은 냉철한 비즈니스 분석가입니다. 5-Why RCA와 MECE 기법을 사용합니다.');

  return {
    query,
    analyzedAt: new Date().toISOString(),
    problems: result?.problems || [],
    insights: result?.insights || [],
    summary: {
      totalProblems: result?.problems?.length || 0,
      avgImpactScore: Math.round((result?.problems || []).reduce((sum, p) => sum + (p.impact?.score || 5), 0) / Math.max(result?.problems?.length || 1, 1))
    }
  };
}

// ========== Planning Agent ==========
async function planningAgent(analysisResult) {
  const { problems, insights } = analysisResult;

  const planningPrompt = `분석 결과를 실행 계획으로 변환하세요.

문제들:
${(problems || []).map(p => `- ${p.problem} (긴급도: ${p.impact?.urgency})`).join('\n')}

인사이트:
${(insights || []).join('\n')}

JSON으로 반환:
{
  "objectives": [{ "id": "O1", "description": "OKR 목표", "keyResults": ["KR1", "KR2"] }],
  "initiatives": [
    {
      "id": "I001",
      "title": "이니셔티브 제목",
      "description": "설명",
      "rice": { "reach": 8, "impact": 9, "confidence": 7, "effort": 5, "score": 100.8 },
      "priority": "P0|P1|P2"
    }
  ],
  "roadmap": { "Q1": ["작업1"], "Q2": ["작업2"] },
  "risks": [{ "id": "R1", "description": "리스크", "level": "high|medium|low", "mitigation": "완화방안" }]
}`;

  const result = await callGeminiJSON(planningPrompt, '당신은 실리콘밸리 시니어 PM입니다. RICE 프레임워크로 우선순위를 정합니다.');

  // RICE 점수 재계산
  if (result?.initiatives) {
    result.initiatives = result.initiatives.map(init => {
      if (init.rice) {
        const { reach, impact, confidence, effort } = init.rice;
        init.rice.score = parseFloat(((reach * impact * confidence) / Math.max(effort, 1)).toFixed(1));
      }
      return init;
    }).sort((a, b) => (b.rice?.score || 0) - (a.rice?.score || 0));
  }

  return {
    query: analysisResult.query,
    plannedAt: new Date().toISOString(),
    objectives: result?.objectives || [],
    initiatives: result?.initiatives || [],
    roadmap: result?.roadmap || {},
    risks: result?.risks || [],
    summary: {
      totalInitiatives: result?.initiatives?.length || 0,
      p0Count: (result?.initiatives || []).filter(i => i.priority === 'P0').length
    }
  };
}

// ========== Output Agent ==========
async function generateDocument(planningResult, documentType) {
  const { objectives, initiatives, risks } = planningResult;

  let prompt;
  if (documentType === 'one-pager') {
    prompt = `경영진용 One-Pager를 작성하세요.

계획 요약:
- 이니셔티브: ${(initiatives || []).slice(0, 3).map(i => i.title).join(', ')}
- OKR: ${(objectives || []).map(o => o.description).join(', ')}

JSON으로 반환:
{
  "title": "프로젝트 제목",
  "executiveSummary": "핵심 메시지 1-2문장",
  "problem": { "statement": "문제 정의", "impact": "비즈니스 임팩트", "urgency": "왜 지금인가" },
  "solution": { "approach": "해결 방안", "keyActions": ["액션1", "액션2", "액션3"] },
  "expectedOutcome": { "shortTerm": "3개월 성과", "longTerm": "1년 성과" },
  "ask": { "decision": "요청 사항", "nextSteps": ["다음 단계"] }
}`;
  } else if (documentType === 'prd') {
    prompt = `PRD(Product Requirements Document)를 작성하세요.

최우선 이니셔티브: ${initiatives?.[0]?.title || 'N/A'}
설명: ${initiatives?.[0]?.description || 'N/A'}

JSON으로 반환:
{
  "title": "PRD 제목",
  "overview": { "problem": "문제", "solution": "솔루션", "goals": ["목표1"] },
  "userStories": [{ "id": "US001", "story": "As a...", "acceptanceCriteria": ["조건1"], "priority": "P0" }],
  "scope": { "inScope": ["포함"], "outOfScope": ["제외"] },
  "timeline": [{ "phase": "Phase 1", "deliverables": ["산출물"], "duration": "2주" }]
}`;
  } else {
    prompt = `이해관계자 브리핑 문서를 작성하세요.

계획: ${JSON.stringify({ objectives, initiatives: initiatives?.slice(0, 3) })}

JSON으로 반환:
{
  "title": "브리핑 제목",
  "context": "배경 설명",
  "stakeholderBriefings": [
    { "stakeholder": "경영진", "keyMessage": "핵심 메시지", "callToAction": "요청" },
    { "stakeholder": "개발팀", "keyMessage": "핵심 메시지", "callToAction": "요청" }
  ],
  "talkingPoints": ["포인트1", "포인트2"]
}`;
  }

  const document = await callGeminiJSON(prompt, '당신은 설득력 있는 PM 문서 작성 전문가입니다.');

  return {
    documentType,
    generatedAt: new Date().toISOString(),
    document: document || { error: '문서 생성 실패' }
  };
}

// ========== Full Pipeline ==========
async function runFullPipeline(query) {
  const inputResult = await inputAgent(query);
  const analysisResult = await analysisAgent(inputResult);
  const planningResult = await planningAgent(analysisResult);

  return {
    success: true,
    query,
    inputResult,
    analysisResult,
    planningResult
  };
}
