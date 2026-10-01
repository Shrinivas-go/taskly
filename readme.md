# Todoist-Style Task Management Application

An engineering-learning project building a production-grade task management system with rigorous software engineering discipline, following a Scrum of One workflow.

## Architecture

The system is designed following the Phase 4 System Design Package:

```text
User
  ↓
Next.js (App Router, TypeScript)
  ↓
REST / OpenAPI API (/api/v1)
  ↓
NestJS Modular Monolith
  ↓
PostgreSQL 16
```

## Repository Structure

```text
todolist/
├── .env.example                     # Environment variables template
├── .gitignore                       # Git ignore configuration
├── docker-compose.yml               # Local PostgreSQL container configuration
├── package.json                     # Monorepo root workspace configuration
├── readme.md                        # Project documentation
├── backend/                         # NestJS backend application
│   ├── package.json
│   ├── tsconfig.json
│   ├── nest-cli.json
│   ├── prisma/                      # Prisma schema and migrations
│   └── src/
│       ├── app.module.ts            # Root application module
│       ├── main.ts                  # NestJS bootstrap with Swagger & validation
│       ├── common/                  # Cross-cutting guards, filters, decorators
│       ├── health/                  # Health check endpoint
│       ├── auth/                    # Authentication module (JWT + bcrypt)
│       └── tasks/                   # Task CRUD and subtask hierarchy module
└── frontend/                        # Next.js frontend application
    ├── package.json
    ├── tsconfig.json
    ├── next.config.js
    └── app/                         # App Router root layout and test page
```

## Getting Started

### Prerequisites

- **Node.js**: v20+ (Tested on v24)
- **npm**: v10+ (Tested on v11)
- **PostgreSQL**: v16+ (via Docker or local installation)

### 1. Environment Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### 2. Start PostgreSQL

Using Docker Compose:

```bash
docker compose up -d
```

Or connect to an existing PostgreSQL instance running on port 5432 with credentials configured in `.env`.

### 3. Install Dependencies

From the repository root:

```bash
npm install
```

### 4. Run Database Migrations

```bash
npm run prisma:migrate --workspace=backend
```

### 5. Start Backend

```bash
npm run dev:backend
```

- Backend API: `http://localhost:4000/api/v1`
- Health Endpoint: `http://localhost:4000/api/v1/health`
- Swagger / OpenAPI: `http://localhost:4000/api/docs`

### 6. Start Frontend

```bash
npm run dev:frontend
```

- Frontend Application: `http://localhost:3000`

### 7. AI Microservice (FastAPI)

```bash
# Setup Python virtual environment
cd ai-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt

# Start FastAPI AI Service
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- AI Service API: `http://localhost:8000`
- AI Health Endpoint: `http://localhost:8000/health`
- OpenAPI Documentation: `http://localhost:8000/docs`

---

## AI Service Architecture & Security

### Flow & Security Boundary

```text
Browser Client (Next.js)
   ↓ (JWT Authenticated, CORS restricted)
NestJS Backend (:4000/api/v1/ai/tasks/breakdown)
   ↓ (Internal HTTP, Private Network)
FastAPI AI Service (:8000/ai/tasks/breakdown)
   ↓ (AIProvider Abstraction)
MockProvider / OpenAIProvider (OpenAI / Groq API)
```

**Security Controls**:
1. **No Direct Browser Access**: The browser client never connects directly to the LLM provider or FastAPI. All requests must be authenticated via NestJS JWT bearer tokens.
2. **No Secret Leakage**: `AI_API_KEY` exists strictly on the server side in `.env`. It is never returned in API responses, never logged, and never included in frontend builds.
3. **No Direct Database Access**: FastAPI has zero database access or write permissions. Task suggestions are purely preview data and are never automatically committed as tasks.
4. **Prompt Injection Defense**: User input is treated strictly as passive structured DATA (serialized in JSON delimiters). Model instructions reject code execution, database commands, and system prompt leakage.
5. **Output Sanitization**: Model outputs are strictly validated against Pydantic/class-validator schemas. Shell commands, SQL queries, HTML/scripts, and markdown artifacts are sanitized before returning suggestions.
6. **Timeouts**: Finite timeouts are enforced at both boundaries (35s on NestJS proxy, 30s on FastAPI provider) to prevent hanging requests.

### Configuration & Environment Variables

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `AI_SERVICE_URL` | `http://localhost:8000` | Downstream URL called by NestJS proxy |
| `AI_SERVICE_TIMEOUT` | `35000` | NestJS proxy timeout in milliseconds |
| `AI_PROVIDER` | `mock` | Selected provider: `mock` (deterministic) or `openai` (real LLM) |
| `AI_API_KEY` | *(None)* | Real provider API key (OpenAI or Groq) |
| `AI_MODEL` | `gpt-4o-mini` | Model name override (e.g. `gpt-4o-mini`, `qwen/qwen3.8-27b`) |
| `AI_BASE_URL` | *(None)* | OpenAI-compatible endpoint override (e.g. `https://api.openai.com/v1`) |
| `AI_TIMEOUT_SECONDS`| `30.0` | FastAPI provider HTTP timeout in seconds |

### Mock vs. Real Provider

- **Mock Provider (`AI_PROVIDER=mock`)**: Generates deterministic, predictable subtasks without external network calls. Ideal for unit tests, local offline development, and CI environments.
- **Real Provider (`AI_PROVIDER=openai`)**: Connects to OpenAI-compatible LLM providers (OpenAI, Groq, local vLLM). Enforces structured JSON output mode, prompt injection resistance, and title sanitization.

### Task Breakdown API

**Endpoint**: `POST /api/v1/ai/tasks/breakdown` (Protected by `JwtAuthGuard`)

**Request**:
```json
{
  "task": "Prepare for my Java exam",
  "description": "Optional context notes",
  "maxSubtasks": 3
}
```

**Response**:
```json
{
  "originalTitle": "Prepare for my Java exam",
  "suggestions": [
    { "title": "Review core OOP concepts and inheritance", "priority": "P4" },
    { "title": "Practice Java Collections and Generics", "priority": "P4" },
    { "title": "Study multithreading and exception handling", "priority": "P4" }
  ],
  "subtasks": [ ... ],
  "provider": "openai",
  "reasoning": "Breakdown covering key preparation domains"
}
```

### Running Tests

```bash
# Run FastAPI unit and evaluation tests
cd ai-service
.venv\Scripts\pytest -v

# Run NestJS backend tests (including AI integration)
cd ../backend
npm test

# Run full project build and linting
cd ../frontend
npm run build
```

---

## Authoritative Documentation

1. `02_Product_Requirements_Final.pdf` — Product Requirements Document (PRD)
2. `03_Engineering_Method.pdf` — Solo Engineering Methodology & Definition of Done
3. `04_Software_Requirements_Specification.pdf` — Software Requirements Specification (SRS)
4. `05_System_Design_Package_Final_Corrected.pdf` — Phase 4 System Design Package

