# Grid07 — Intelligent Expert-Agent Routing & Multi-LLM Orchestration Platform

Grid07 is a production-oriented intelligent multi-agent platform providing two distinct operational modes:
- **Automatic Routing Mode (`/chat`)**: Users submit arbitrary questions without picking a persona or tuning LLM parameters. The system automatically identifies intent, selects the most relevant configured expert persona, selects an optimal verified free-tier model, and executes the request securely via an observable LangGraph pipeline with zero hidden paid fallbacks.
- **Explicit Developer Mode (`/playground`)**: Developers manually choose a specific persona, override the provider (Groq, Gemini, OpenRouter, OpenAI, xAI, or custom OpenAI-compatible endpoints), and select specific models. Explicit selections are strictly respected and executed as requested without automatic redirection.

---

## Key Features

1. **Automatic Expert Persona Routing**:
   - Zero-config chat interface at `/chat` with continuous conversation scroll history.
   - Multi-layer candidate evaluation:
     - Active persona validation (`is_active` check).
     - Deterministic intent and domain detection (finance, coding, cybersecurity, analysis, strategy).
     - Local 384-dimensional feature hashing and cosine similarity matching.
     - Persona domain overlap scoring (from stated expertise, interests, and purpose).
     - Conversational topic continuity (prevents thrashing across follow-up queries while cleanly switching when topics shift).
     - Deterministic tie-breaking and graceful fallback to general-purpose personas or clarification states.

2. **Multi-LLM Provider Engine**:
   - Native integration with **Groq**, **Google Gemini**, **OpenRouter**, **OpenAI**, **xAI**, and **OpenAI-Compatible** endpoints.
   - Centralized model registry (`FreeModelRegistry`) tracking free-tier eligibility (`verified`, `unverified`, `unavailable`, `paid`).
   - Capability-based selection matching task demands (coding, reasoning, search context handling) to model strengths.
   - **Zero Hidden Paid Fallbacks**: Automatic mode strictly operates across verified free-tier models. If free-tier models are exhausted or unavailable, returns honest quota/status messages rather than incurring hidden charges.

3. **Dynamic OpenRouter Model Catalog & Free Models Router**:
   - Live synchronization with OpenRouter's official catalog endpoint (`GET https://openrouter.ai/api/v1/models`).
   - Dynamically ingests available models with automated TTL caching and graceful fallback resilience.
   - Automated modality filtering: chat/code/multimodal models retained; image-only diffusions excluded.
   - **Accessible Searchable Combobox**: Compact trigger, bounded-height scrolling popover, keyboard navigation (`ArrowUp`/`ArrowDown`/`Enter`/`Escape`), search by name/ID, and `100% Free` vs `All Models` filter tabs.
   - **Dynamic Free Router (`openrouter/free`)**: Auto-selects high-uptime free models with actual model resolution reported in execution traces (`data["model"]`).

4. **User API Key Vault (BYOK)**:
   - Configure personal API keys directly during persona creation/editing (`/agents/new` and `/agents/[id]`) for providers not configured globally.
   - Authenticated **Fernet** symmetric encryption (AES-128-CBC + HMAC-SHA256) at rest in `UserCredential`.
   - Masked client returns (`••••••••abcd`) preventing secret leakage in the DOM, logs, or traces.
   - **SSRF Protection**: Strict RFC-1918 private IP blocking (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, loopback 127.0.0.1, AWS link-local 169.254.169.254) for custom endpoints.

5. **Autonomous Neural Web Search**:
   - Dedicated reasoning node evaluates query ambiguity and factual requirements.
   - Primary: **Exa Neural Search** (`api.exa.ai`) with live web scraping and content extraction.
   - Fallback: **Tavily Search API** (`api.tavily.com`) for automated verification if primary search is throttled.

6. **Fully Animated Authentication Experience**:
   - Linear-inspired dark aesthetic (`#090A0D` canvas, warm gold `#C7A66A` highlights, graphite perspective grid).
   - **Connected Agent Network**: Live SVG + DOM visual network with Research, Coding, Data, and Custom personas connected to a central Grid07 core with traveling light packets and organic 3.4s task routing cycle.
   - Coordinated continuous 3D perspective grid travel, ambient drifting light fields, and floating particles.
   - Dedicated pages: `/login` (with password visibility toggle and remember me), `/register`, `/forgot-password`, `/reset-password`.
   - Accessible footer links:
     - `/security`: Security Architecture Overview (Prompt Injection Defense, Fernet encrypted vault, SSRF quarantine, Tenant isolation).
     - `/routing-specs`: Model Routing & Execution Specifications.
     - `/status`: Live system status with real-time `/health` telemetry and upstream status portal links.

7. **Developer Playground & Reproducible Benchmarking**:
   - `/playground` remains completely independent for manual developer testing.
   - Supports explicit persona selection, explicit provider overrides, explicit model selection, and debugging controls.
   - Deterministic benchmark suite evaluating coding, reasoning, structured JSON adherence, and prompt-injection defense (`POST /api/v1/llm/benchmarks/run`).

---

## Architecture Overview

```
User Message (/chat)
       │
       ▼
Input Validation & Prompt Injection Defense (Delimiter Quarantine)
       │
       ▼
PersonaRouter (Semantic Vector + Domain Keyword Overlap + Topic Continuity)
       │
       ▼
Selected Expert Persona (e.g., Risk Analyst, Code Specialist, Researcher)
       │
       ▼
CapabilityBasedModelSelector (FreeModelRegistry: Health, Quotas, Capabilities)
       │
       ▼
LangGraph Execution Pipeline (decide_search → exa_search/tavily → generate)
       │
       ▼
Unified LLMRouter (Groq, Gemini, OpenRouter, OpenAI, xAI, Custom Endpoints)
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

### Run Full Backend Test Suite (84 Tests)
```bash
cd backend
.\venv\Scripts\python -m pytest -v
```

### Run Frontend Linting & Production Build
```bash
cd frontend
npm run lint
npm run build
```

---

## API Routes Summary

### System Health
- `GET /health`: Core backend health probe returning operational status and service identifier.

### LLM & Routing Registry
- `GET /api/v1/llm/models`: Centralized registry of supported free-tier and provider models.
- `GET /api/v1/llm/openrouter/models`: Dynamic OpenRouter catalog with modality filtering and `free_only` filter.
- `GET /api/v1/llm/providers`: List configured providers and live status.
- `POST /api/v1/llm/benchmarks/run`: Run deterministic or live model benchmark suite.

### User Credential Vault (BYOK)
- `POST /api/v1/llm/credentials`: Save and validate encrypted user API key (Fernet authenticated encryption).
- `GET /api/v1/llm/credentials`: List saved user credentials with masked keys (`••••••••abcd`).
- `DELETE /api/v1/llm/credentials/{provider}`: Delete user personal API key.
- `POST /api/v1/llm/credentials/test`: Validate provider credential without saving.

### Workspaces, Personas & Executions
- `POST /api/v1/workspaces/{workspace_id}/executions`: Create execution (supports `routing_mode="automatic"` or `"explicit"`).
- `GET /api/v1/workspaces/{workspace_id}/executions`: List executions within the workspace.
- `GET /api/v1/workspaces/{workspace_id}/executions/{execution_id}`: Retrieve execution status, routing decisions, node events, and output.
- `GET /api/v1/workspaces/{workspace_id}/agents`: List workspace personas.
- `POST /api/v1/workspaces/{workspace_id}/agents`: Create custom persona with model & provider configuration.
- `POST /api/v1/workspaces/{workspace_id}/agents/{agent_id}/test`: Test persona generation directly with optional provider/model overrides.
- `GET /api/v1/workspaces/{workspace_id}/conversations`: Retrieve workspace conversation threads and message history.

---

## Constraints Confirmation

- **Zero Hidden Paid Fallbacks**: Automatic mode strictly operates across eligible free-tier models.
- **Database Preserved**: All existing migrations, agents, users, encrypted credentials, and execution records remain intact.
- **Full Key Security**: Personal API keys are encrypted at rest with authenticated Fernet encryption; client returns are masked.
- **Accessibility & Reduced Motion**: Full adherence to `prefers-reduced-motion` and keyboard accessibility across all animated surfaces.
