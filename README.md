# E-Rakshak AI

> **Emergency Care Resource Orchestration Platform**

E-Rakshak AI is an AI-powered system designed to coordinate emergency-care resources by intelligently connecting:

**Emergency Case → Priority → Required Capabilities → Ambulance → Hospital → Specialist → Pre-arrival Handoff**

---

## Current Phase

**Phase 5 — Emergency Resource Matching Engine**

This phase implements intelligent resource matching, evaluating Emergency Cases and Preliminary Triage to deterministically rank Ambulances, Hospitals, and Doctors. It also introduces Supabase as the managed database provider.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | Next.js 16 (App Router) |
| Language (frontend) | TypeScript |
| Styling | Tailwind CSS v4 |
| UI primitives | shadcn/ui compatible |
| Backend framework | FastAPI |
| Language (backend) | Python 3.11+ |
| API validation | Pydantic v2 |
| Database | PostgreSQL (PostGIS-ready) |
| ORM | SQLAlchemy 2 (async) |
| ASGI server | Uvicorn |

---

## Project Structure

```text
e-rakshak-ai/
│
├── frontend/                   # Next.js application (App Router)
│   ├── app/
│   │   ├── layout.tsx          # Root layout (metadata, fonts)
│   │   ├── page.tsx            # Home page shell
│   │   └── globals.css         # Global design system
│   │
│   ├── components/
│   │   └── SystemStatus.tsx    # Backend connectivity status component
│   │
│   ├── lib/
│   │   └── api.ts              # Centralised API client
│   │
│   ├── public/
│   ├── .env.example            # Environment variable template
│   ├── .env.local              # Local dev environment (git-ignored)
│   ├── next.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── backend/                    # FastAPI application
│   ├── app/
│   │   ├── main.py             # FastAPI app factory + middleware
│   │   ├── core/
│   │   │   ├── config.py       # Centralised settings (Pydantic-Settings)
│   │   │   └── database.py     # Async SQLAlchemy engine + session factory
│   │   │
│   │   ├── api/
│   │   │   └── health.py       # Health-check & root API routes
│   │   │
│   │   ├── models/             # ORM models (empty — future phases)
│   │   ├── schemas/            # Pydantic schemas (empty — future phases)
│   │   └── services/           # Business logic (empty — future phases)
│   │
│   ├── tests/
│   │   └── test_health.py      # Phase 1 backend tests
│   │
│   ├── requirements.txt        # Production dependencies
│   ├── requirements-dev.txt    # Development & test dependencies
│   ├── pytest.ini              # Pytest configuration
│   ├── .env.example            # Environment variable template
│   └── .env                    # Local dev environment (git-ignored)
│
├── README.md
└── .gitignore
```

---

## Prerequisites

| Tool | Minimum version |
|---|---|
| Node.js | 18.17+ |
| npm | 9+ |
| Python | 3.11+ |
| pip | 23+ |
| PostgreSQL | 14+ (optional for Phase 1) |

---

## Installation

### Frontend

```bash
cd frontend
npm install
```

### Backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

# Install production + dev dependencies
pip install -r requirements.txt -r requirements-dev.txt
```

---

## Environment Variables

### Frontend

```bash
# In the frontend/ directory:
cp .env.example .env.local
```

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | URL of the FastAPI backend | `http://localhost:8000` |

### Backend

```bash
# In the backend/ directory:
cp .env.example .env
```

| Variable | Description | Default |
|---|---|---|
| `APP_NAME` | Application name | `E-Rakshak AI` |
| `APP_ENV` | Runtime environment | `development` |
| `API_VERSION` | API version string | `0.1.0` |
| `DATABASE_URL` | PostgreSQL connection string | *(Supabase URL)* |
| `SUPABASE_URL` | Supabase instance URL | *(empty)* |
| `SUPABASE_ANON_KEY` | Supabase Anon Key | *(empty)* |
| `FRONTEND_URL` | Allowed CORS origin | `http://localhost:3000` |

> **Important**: Replace `DATABASE_URL` with your Supabase Transaction Mode connection string (`postgresql+asyncpg://postgres:[YOUR-PASSWORD]@db.your-supabase-project.supabase.co:6543/postgres`). Never commit `.env` or `.env.local` to version control.

---

## Running the Project

### Start the Backend

```bash
cd backend

# Activate virtual environment first (see Installation)

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend will be available at: **http://localhost:8000**

Interactive API docs: **http://localhost:8000/api/docs**

### Start the Frontend

```bash
cd frontend
npm run dev
```

The frontend will be available at: **http://localhost:3000**

---

## API Endpoints (Phase 1)

### Root API

```
GET /api
```

**Response:**
```json
{
  "message": "E-Rakshak AI API",
  "version": "0.1.0"
}
```

### Health Check

```
GET /api/health
```

**Response:**
```json
{
  "status": "ok",
  "service": "e-rakshak-ai-backend",
  "version": "0.1.0",
  "environment": "development"
}
```

---

## Running Tests

### Backend Tests

```bash
cd backend

# Activate virtual environment first
pytest
```

Expected output: 5 tests passing.

### Frontend Type Check

```bash
cd frontend
npx tsc --noEmit
```

### Frontend Production Build

```bash
cd frontend
npm run build
```

---

## Architecture Decisions

### Why Async SQLAlchemy in Phase 1?

The database foundation uses `asyncpg` + `AsyncSession` to ensure the project is set up for non-blocking I/O from the start. Adding sync I/O now and migrating later would be a larger effort.

### Why not `allow_origins=["*"]`?

CORS is configured from `FRONTEND_URL` so each environment can be configured without code changes. This also prevents accidental open-CORS in production.

### Why separate `requirements.txt` and `requirements-dev.txt`?

Test/dev tools (pytest, ruff) should not be bundled into production container images. The split keeps production images lean.

---

## Future Phases (Not Yet Implemented)

| Phase | Feature |
|---|---|
| 6 | Real-time orchestration, WebSockets, maps |
| 7 | Voice-based intake, LLM extraction, ElevenLabs |

---

## Phase Boundary

**Phases 1-5 have been implemented.**

The following have NOT been implemented and must not be added until the appropriate phase:
- Dynamic care-path orchestration
- WebSockets or real-time updates
- Maps, GPS, or routing
- Live AI or LLM integration
- Voice or Speech-to-Text
- Authentication or user management
- Production deployment infrastructure
