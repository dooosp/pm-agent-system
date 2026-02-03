# pm-agent-system

Multi-agent orchestration system for PM/PO workflows. Automates market analysis, problem structuring, and document generation through a 4-stage pipeline.

## Pipeline

```
Stage 1: Market Research    → RSS + web scraping
Stage 2: Problem Analysis   → RCA + MECE decomposition
Stage 3: Strategy           → OKR + RICE prioritization
Stage 4: Document           → PRD generation
```

## Architecture

```
Express server (:3002)
  ├─ orchestrator/
  │   └─ pipeline.js    → 4-stage sequential execution
  ├─ worker/
  │   └─ index.js       → task execution engine
  ├─ services/
  │   └─ gemini.js      → Gemini API integration
  └─ public/            → web UI
```

## Frameworks Used

| Framework | Purpose |
|-----------|---------|
| RCA (Root Cause Analysis) | Problem diagnosis |
| MECE | Exhaustive problem decomposition |
| OKR | Goal-setting and alignment |
| RICE | Feature prioritization scoring |

## Stack

- **Runtime**: Node.js + Express
- **AI**: Gemini API
- **Data**: RSS Parser, Axios

## Setup

```bash
cp .env.example .env   # Add GEMINI_API_KEY
npm install
npm start              # http://localhost:3002
```
