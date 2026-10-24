# Grid07 — Intelligent Expert-Agent Routing & Free-Model Platform

Grid07 is a production-oriented intelligent expert-agent platform. Users can submit arbitrary questions without needing to pick a persona or configure LLM parameters. The system automatically identifies intent, selects the most relevant configured expert persona, selects an optimal verified free-tier model, executes the request securely via an observable LangGraph pipeline, and returns one coherent answer.

---

## Key Features

1. **Automatic Expert Persona Routing**:
   - Zero-config chat interface at `/chat`.
   - Multi-layer candidate evaluation:
     - Active persona validation (`is_active` check).
     - Deterministic intent and domain detection (e.g., finance, coding, cybersecurity, analysis).
     - Local 384-dimensional feature hashing and cosine similarity.
     - Persona domain overlap scoring (from stated expertise, interests, and purpose).
     - Conversational topic continuity (prevents thrashing across follow-up queries while cleanly switching when topics shift).
     - Deterministic tie-breaking and graceful fallback to general-purpose personas or clarification states.
2. **Free-Model Intelligence & Registry**:
   - Centralized model registry (`FreeModelRegistry`) tracking free-tier eligibility (`verified`, `unverified`, `unavailable`, `paid`).
   - Capability-based selection matching task demands (coding, reasoning, search context handling) to model strengths.
   - **Zero Hidden Paid Fallbacks**: Automatic mode strictly excludes paid models. If free-tier models are exhausted or unavailable, returns honest quota/status messages rather than incurring hidden charges.
   - Real-time health, rate-limit cooldowns, and latency telemetry.
3. **Developer Playground Preservation**:
   - `/playground` remains completely independent for manual developer testing.
   - Supports explicit persona selection, explicit provider overrides, explicit model selection, and debugging controls.
   - Manual overrides are strictly respected and never silently overridden.
4. **Reproducible Benchmarking**:
   - Deterministic benchmark suite evaluating coding, reasoning, structured JSON adherence, and prompt-injection defense.
   - Opt-in live benchmark execution via API endpoint `/api/v1/llm/benchmarks/run`.
5. **Security & Prompt Injection Defenses**:
   - Hardened `[TRUSTED SYSTEM INSTRUCTIONS]` boundaries separating system prompts from untrusted user inputs.
   - Search/RAG results labeled explicitly as untrusted contextual data.
   - Sanitized markdown rendering via `MarkdownContent` (GFM tables, code blocks, lists).

---

## Architecture Overview

```
User Message (/chat)
       │
       ▼
Input Validation & Security Filtering
       │
       ▼
PersonaRouter (Semantic Vector + Domain Keyword Overlap + Topic Continuity)
       │
       ▼
Selected Expert Persona (e.g., Finance Advisor, Code Engineer)
       │
       ▼
CapabilityBasedModelSelector (FreeModelRegistry: Health, Quotas, Capabilities)
       │
       ▼
LangGraph Execution Pipeline (decide_search → web_search → generate)
       │
       ▼
Unified LLMRouter (Groq, Gemini, OpenRouter with Bounded Free-Model Fallback)
       │
       ▼
Database Persistence (Executions, Routing Decisions, Node Events, Telemetry)
       │
       ▼
Streamlined Assistant Response with Expandable Execution Trace
```

---

## Local Setup & Startup

### Prerequisites
- Python 3.11+
- Node.js 18+
- SQLite3

### Backend Setup
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate  # Windows: .\venv\Scripts\activate | Unix: source venv/bin/activate
pip install -r requirements.txt

# Run additive migrations
python migrate.py

# Start Backend Server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
# Frontend is accessible at http://localhost:3000
```

---

## Verification & Automated Tests

### Run Full Backend Test Suite (33 Tests)
```bash
cd backend
.\venv\Scripts\python -m pytest -v
```

### Run Live End-to-End Automatic Routing Verification (Groq Live)
```bash
cd backend
.\venv\Scripts\python verify_automatic_chat_e2e.py
```

### Run Frontend Linting & Production Build
```bash
cd frontend
npm run lint
npm run build
```

---

## API Routes Summary

- `POST /api/v1/workspaces/{id}/executions`: Create execution (supports `routing_mode="automatic"` or `"explicit"`).
- `GET /api/v1/workspaces/{id}/executions/{id}`: Retrieve execution status, routing decisions, node events, and output.
- `GET /api/v1/llm/models`: Centralized registry of supported free-tier and provider models.
- `POST /api/v1/llm/benchmarks/run`: Run deterministic or live model benchmark suite.
- `GET /api/v1/llm/providers`: List configured providers and live status.

---

## Constraints Confirmation

- **No BYOK**: User API key entry screens or per-user secret storage have not been implemented in this phase.
- **Zero Hidden Paid Fallbacks**: Automatic mode strictly operates across eligible free-tier models.
- **Database Preserved**: All existing migrations, agents, users, and execution records remain intact.
