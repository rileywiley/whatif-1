# WhatIf-1

## Project overview

WhatIf-1 is a web application that uses telemetry from completed Formula 1 races combined with AI to simulate how race outcomes could have been different based on user-defined changes. Users can modify pit stop timing, tyre strategies, remove or inject safety cars, change weather conditions, and ask natural-language what-if questions. The app runs a lap-by-lap simulation engine and presents results with AI-generated narrative explanations.

## Tech stack

- **Backend**: Python 3.12+, FastAPI, SQLAlchemy 2.0, PostgreSQL, Redis, Celery
- **Simulation engine**: Python with NumPy (vectorized lap computation)
- **Data ingestion**: FastF1 (primary), OpenF1 API (supplementary)
- **AI layer**: Anthropic Claude API (claude-sonnet-4-20250514) for narration and query parsing
- **Frontend**: React 18+ with TypeScript, Recharts for charts, TailwindCSS
- **Testing**: pytest (backend), vitest (frontend)

## Project structure

```
whatif1/
├── CLAUDE.md                    # This file
├── docs/                        # Technical specifications
│   ├── ARCHITECTURE.md          # System architecture overview
│   ├── DATA_MODEL.md            # Database schema and SQLAlchemy models
│   ├── SIMULATION_ENGINE.md     # Core sim engine algorithms and implementation
│   ├── API_SPEC.md              # REST API endpoints and contracts
│   ├── DESIGN_SYSTEM.md         # Visual theme, color tokens, typography, component patterns
│   ├── FRONTEND_SPEC.md         # React app structure and components
│   └── AI_INTEGRATION.md        # Claude API integration for narration and queries
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry point
│   │   ├── config.py            # Settings and environment config
│   │   ├── models/              # SQLAlchemy ORM models
│   │   │   ├── race.py
│   │   │   ├── driver.py
│   │   │   ├── lap.py
│   │   │   ├── event.py
│   │   │   ├── weather.py
│   │   │   ├── scenario.py
│   │   │   └── circuit.py
│   │   ├── ingestion/           # Data ingestion from FastF1/OpenF1
│   │   │   ├── fastf1_adapter.py
│   │   │   ├── openf1_adapter.py
│   │   │   ├── race_event_parser.py
│   │   │   └── weather_etl.py
│   │   ├── simulation/          # Core simulation engine
│   │   │   ├── engine.py        # Main simulation loop
│   │   │   ├── pace_model.py    # Base pace + fuel correction
│   │   │   ├── tyre_model.py    # Tyre degradation curves
│   │   │   ├── traffic_model.py # Dirty air + DRS + overtaking
│   │   │   ├── weather_model.py # Surface water + grip + compound validity
│   │   │   ├── event_model.py   # SC/VSC/red flag effects
│   │   │   ├── position.py      # Gap tracking + position resolution
│   │   │   ├── solver.py        # Reverse-query optimization (goal-seeking)
│   │   │   └── diff.py          # Scenario diffing (actual vs simulated)
│   │   ├── ai/                  # Claude API integration
│   │   │   ├── narration.py     # Race narrative generation
│   │   │   ├── query_parser.py  # NL question → simulation parameters
│   │   │   └── commentary.py    # Per-lap commentary for replay
│   │   ├── api/                 # FastAPI route handlers
│   │   │   ├── races.py
│   │   │   ├── scenarios.py
│   │   │   ├── simulate.py
│   │   │   ├── solve.py
│   │   │   └── share.py
│   │   └── services/            # Business logic layer
│   │       ├── race_service.py
│   │       ├── simulation_service.py
│   │       └── scenario_service.py
│   ├── tests/
│   ├── alembic/                 # Database migrations
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── RaceSelector.tsx
│   │   │   ├── RaceTimeline.tsx
│   │   │   ├── ResultsComparison.tsx
│   │   │   └── ShareView.tsx
│   │   ├── components/
│   │   │   ├── StrategyChart.tsx      # Stint bar chart
│   │   │   ├── EventTimeline.tsx      # SC/VSC/rain overlay
│   │   │   ├── ScenarioEditor.tsx     # Simple mode editor
│   │   │   ├── AdvancedEditor.tsx     # Advanced mode editor
│   │   │   ├── LapReplay.tsx          # Lap-by-lap race replay
│   │   │   ├── PositionTower.tsx      # Live timing tower
│   │   │   ├── AIChat.tsx             # NL query interface
│   │   │   ├── ShareCard.tsx          # Social share card
│   │   │   └── common/
│   │   ├── hooks/
│   │   ├── services/                  # API client
│   │   └── types/
│   ├── package.json
│   └── tsconfig.json
└── docker-compose.yml
```

## Local development setup

### Prerequisites

- Python 3.12+
- Node.js 20+
- Docker and Docker Compose

### Step 1: Start infrastructure services

From the project root, start PostgreSQL and Redis with Docker Compose:

```bash
docker compose up -d
```

This starts:
- PostgreSQL 16 on port 5432 (user: `whatif1`, password: `whatif1dev`, database: `whatif1`)
- Redis 7 on port 6379

To verify services are running:

```bash
docker compose ps
```

To connect to PostgreSQL directly:

```bash
docker compose exec postgres psql -U whatif1 -d whatif1
```

To stop services:

```bash
docker compose stop
```

To stop and remove all data (full reset):

```bash
docker compose down -v
```

### Step 2: Create the docker-compose.yml

Create this file in the project root:

```yaml
services:
  postgres:
    image: postgres:16
    container_name: whatif1-postgres
    environment:
      POSTGRES_USER: whatif1
      POSTGRES_PASSWORD: whatif1dev
      POSTGRES_DB: whatif1
    ports:
      - "5432:5432"
    volumes:
      - whatif1_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U whatif1 -d whatif1"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: whatif1-redis
    ports:
      - "6379:6379"
    volumes:
      - whatif1_redis:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  whatif1_pgdata:
  whatif1_redis:
```

### Step 3: Set up Python backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate    # On Windows: .venv\Scripts\activate

pip install -r requirements.txt
```

The `requirements.txt` should contain:

```
# Core
fastapi==0.115.*
uvicorn[standard]==0.34.*
sqlalchemy[asyncio]==2.0.*
psycopg2-binary==2.9.*
alembic==1.14.*
pydantic==2.10.*

# Data ingestion
fastf1==3.8.*
requests==2.32.*
numpy==2.2.*
pandas==2.2.*

# Task queue and caching
celery==5.4.*
redis==5.2.*

# AI integration (needed from Phase 4)
anthropic==0.52.*

# Testing
pytest==8.3.*
pytest-asyncio==0.25.*
httpx==0.28.*
```

### Step 4: Initialize the database

```bash
# Create initial Alembic migration
alembic init alembic
# Edit alembic/env.py to import your models and set sqlalchemy.url
# Then generate and run the initial migration:
alembic revision --autogenerate -m "initial schema"
alembic upgrade head
```

### Step 5: Create the FastF1 cache directory

```bash
mkdir -p data/fastf1_cache
```

### Step 6: Set environment variables

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://whatif1:whatif1dev@localhost:5432/whatif1
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/1
FASTF1_CACHE_DIR=./data/fastf1_cache

# Add when starting Phase 4:
# ANTHROPIC_API_KEY=sk-ant-...
```

### Step 7: Set up the frontend

```bash
cd frontend
npm create vite@latest . -- --template react-ts
npm install
npm install recharts zustand @tanstack/react-query react-router-dom
npm install -D tailwindcss @tailwindcss/vite
```

### Step 8: Verify everything works

```bash
# Terminal 1: confirm Docker services are healthy
docker compose ps

# Terminal 2: start the backend
cd backend && source .venv/bin/activate
uvicorn app.main:app --reload --port 8002

# Terminal 3: start the frontend
cd frontend && npm run dev
```

### Port map

| Service      | Port  | URL                          |
|-------------|-------|------------------------------|
| Frontend    | 5173  | http://localhost:5173        |
| Backend API | 8002  | http://localhost:8002/docs   |
| PostgreSQL  | 5432  | localhost:5432               |
| Redis       | 6379  | localhost:6379               |

### Data persistence

PostgreSQL data persists in a Docker named volume (`whatif1_pgdata`). Your database survives `docker compose stop` and `docker compose up`. Only `docker compose down -v` destroys the data.

The FastF1 cache directory (`data/fastf1_cache`) is on your local filesystem. First-time ingestion of a race downloads ~200-500MB from the F1 live timing API. Subsequent runs use the cache and are near-instant.

## Build order

Build the app in this order. Each phase should be fully functional before moving to the next.

### Phase 1: Data foundation
1. Run `docker compose up -d` to start PostgreSQL and Redis
2. Set up the database schema with SQLAlchemy models and Alembic migrations (see `docs/DATA_MODEL.md`)
3. Build FastF1 ingestion adapter to populate the database for a single race
4. Build the race event parser (extracts SC, VSC, red flags, penalties from race control messages)
5. Build weather ETL (extracts weather samples and computes surface state)
6. Verify by ingesting the 2025 Australian GP and querying all tables

### Phase 2: Simulation engine
1. Implement the pace model (base pace extraction + fuel correction)
2. Implement the tyre degradation model (two-phase piecewise linear, fitted per race)
3. Implement the traffic/dirty air model
4. Implement the weather/surface water model
5. Implement the event overlay model (SC/VSC/red flag effects)
6. Implement the position resolution engine (gap tracking + overtake probability)
7. Build the main simulation loop that chains all models lap-by-lap
8. Build the scenario diff engine
9. Validate: run the null scenario (no changes) for the 2025 Australian GP. The sim should reproduce the actual top-10 finishing order within ±1 position per driver.

### Phase 3: API layer
1. Implement all REST endpoints per `docs/API_SPEC.md`
2. Add Redis caching for simulation results
3. Add Celery task for async simulation execution (complex scenarios may take 2-5 seconds)

### Phase 4: AI integration
1. Implement the narrative generator (scenario diff → Claude → story)
2. Implement the NL query parser (user question → structured simulation parameters)
3. Implement the reverse-query solver (goal-seeking optimization)
4. Implement per-lap commentary for the replay view

### Phase 5: Frontend
1. Build the race selector page
2. Build the race timeline page with strategy chart and event overlay
3. Build the simple scenario editor (pit lap sliders, event toggles)
4. Build the results comparison view with position diff table
5. Build the lap-by-lap replay with playback controls
6. Build the advanced editor (per-driver overrides, weather, race params)
7. Build the AI chat / reverse-query interface
8. Build the share card with image export

### Phase 6: Polish
1. Ingest all 2024 and 2025 races
2. Add batch scenario API for the data builder persona
3. Add embeddable widget for content creators
4. Performance optimization and caching

## Key conventions

- All lap times are in seconds (float64), not timedelta objects
- All gaps/intervals are in seconds (float64), positive = behind leader
- Tyre compounds use string enum: "SOFT", "MEDIUM", "HARD", "INTERMEDIATE", "WET"
- Race events use string enum: "SAFETY_CAR", "VSC", "RED_FLAG", "RAIN_START", "RAIN_STOP", "PENALTY", "RETIREMENT"
- Driver identifiers use the 3-letter FIA abbreviation (e.g., "VER", "NOR", "LEC")
- All coordinates and telemetry data use SI units (meters, seconds, Celsius, kg)
- The simulation engine is deterministic by default. Monte Carlo mode (probabilistic overtaking) is a separate flag.

## Testing requirements

- Every simulation sub-model must have unit tests with known inputs/outputs
- The null-scenario validation test (sim reproduces actual race results) is the most critical test
- API endpoints need integration tests with a test database
- Frontend components need snapshot tests for key states

## Documentation pointers

Read these docs in order before building:
1. `docs/ARCHITECTURE.md` — system overview and data flow
2. `docs/DATA_MODEL.md` — database schema, exact column types, relationships
3. `docs/SIMULATION_ENGINE.md` — all algorithms with pseudocode and formulas
4. `docs/API_SPEC.md` — every endpoint with request/response schemas
5. `docs/DESIGN_SYSTEM.md` — visual theme, color tokens, typography, component CSS
6. `docs/FRONTEND_SPEC.md` — component tree, state management, UX flows
7. `docs/AI_INTEGRATION.md` — prompt templates, Claude API usage, solver logic
