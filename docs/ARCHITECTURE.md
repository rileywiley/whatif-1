# Architecture overview

## System layers

The app has six layers that data flows through top to bottom:

```
[FastF1 / OpenF1] → Data ingestion → Race model store (PostgreSQL)
                                           ↓
                                    Simulation engine
                                     ↓            ↓
                              AI narration    Scenario diff
                                     ↓            ↓
                                   API layer (FastAPI)
                                           ↓
                                   Frontend (React)
```

## Layer 1: Data ingestion

Runs post-race via Celery task or manual CLI command. Two adapters normalize external data into the canonical schema.

### FastF1 adapter (primary)
- Uses `fastf1` Python library (pip install fastf1)
- Pulls: session results, lap-by-lap timing, car telemetry, tyre compound/age, pit stops, weather, race control messages
- Caches raw data locally (~200-500MB per session) using `fastf1.Cache.enable_cache()`
- Data available from 2018 season onward

```python
import fastf1
fastf1.Cache.enable_cache('/path/to/cache')
session = fastf1.get_session(2025, 'Australia', 'R')
session.load(telemetry=False, weather=True, messages=True)
# session.results → driver results
# session.laps → lap-by-lap data as DataFrame
# session.weather_data → weather samples
# session.race_control_messages → SC, VSC, flags, penalties
```

### OpenF1 adapter (supplementary)
- REST API at https://api.openf1.org/v1/
- Used for: pit lane duration detail, position intervals (4s resolution), team radio
- Free for historical data (2023+)

### Race event parser
- Reads `session.race_control_messages` from FastF1
- Classifies each message into event types: SAFETY_CAR, VSC, RED_FLAG, PENALTY, RETIREMENT
- Extracts lap ranges for SC/VSC periods
- Links events to trigger drivers where applicable

### Weather ETL
- Reads `session.weather_data` from FastF1
- Interpolates to per-lap granularity (weather samples may not align exactly to lap boundaries)
- Computes derived `SURFACE_STATE` records: surface water accumulation, grip scalar, compound validity

## Layer 2: Race model store

PostgreSQL database with the canonical schema defined in `docs/DATA_MODEL.md`. This is the single source of truth for both actual race data and simulation inputs.

Key design principle: the same schema stores both actual observed data AND simulated data. A `SIM_RESULT` contains arrays of simulated `LAP` objects in the same format as actual laps, enabling direct comparison.

## Layer 3: Simulation engine

Detailed in `docs/SIMULATION_ENGINE.md`. The engine runs a lap-by-lap forward simulation for all drivers simultaneously. Each lap, it computes:

1. Base pace (clean-air car/driver performance)
2. Fuel correction (linear burn model)
3. Tyre degradation (two-phase piecewise linear, modified by track temperature)
4. Traffic penalty (dirty air time loss + accelerated tyre wear)
5. Race event overlay (SC/VSC/red flag pace and gap effects)
6. Compound mismatch penalty (wrong tyres for surface conditions)
7. Pit stop resolution (lane time, tyre reset, out-lap penalty)
8. Position resolution (cumulative time → gaps → overtake check)

The engine accepts a `Scenario` object that specifies modifications to any of: pit stops, race events, weather, driver pace, tyre management mode, ERS mode, engine mode, and race parameters.

### Reverse-query solver

For goal-seeking questions ("what lap time would Hamilton need to beat Norris?"), the solver wraps the simulation engine in an optimization loop. It performs binary search over a parameter (e.g., pace offset) and runs the forward sim at each step until the goal condition is met.

## Layer 4: AI integration

Uses the Anthropic Claude API (claude-sonnet-4-20250514). Three use cases:

1. **Narrative generation**: Takes a scenario diff (actual vs simulated positions, gaps, key divergence laps) and produces a 2-4 sentence natural language explanation of why the outcome changed.

2. **Query parsing**: Takes a user's natural language question and converts it to either (a) a structured `Scenario` object for forward simulation, or (b) a structured `GoalQuery` object for reverse-query solving.

3. **Per-lap commentary**: Takes the state of the race at a specific lap during replay and produces a 1-2 sentence commentary about what's happening and why.

## Layer 5: API layer

FastAPI REST API. See `docs/API_SPEC.md` for complete specification. Key endpoints:

- `GET /api/races` — list races with metadata
- `GET /api/races/{race_id}` — full race data (laps, events, weather, results)
- `POST /api/races/{race_id}/simulate` — run a what-if scenario
- `POST /api/races/{race_id}/solve` — run a reverse-query
- `GET /api/scenarios/{scenario_id}` — retrieve a saved scenario
- `POST /api/races/{race_id}/commentary` — get AI commentary for a specific lap

Redis caching for simulation results keyed by `hash(race_id + scenario_params)`. Celery for async execution of complex simulations.

## Layer 6: Frontend

React SPA with four main pages:

1. **Race selector** — season filter, race cards with disruption badges, AI-suggested scenarios
2. **Race timeline** — strategy chart, event timeline, scenario editor (simple + advanced), AI chat
3. **Results comparison** — metric cards, position diff table, AI narrative, share actions
4. **Lap replay** — playback controls, position tower, pace bars, per-lap commentary

## Data flow for a typical what-if scenario

1. User selects 2025 Australian GP on the race selector page
2. Frontend fetches `GET /api/races/2025-aus` → renders strategy chart and event timeline
3. User drags Leclerc's pit 1 slider from lap 9 to lap 16 and toggles off the safety car
4. User clicks "Run simulation"
5. Frontend sends `POST /api/races/2025-aus/simulate` with scenario JSON
6. Backend creates a `Scenario` object, runs the simulation engine
7. Engine produces per-driver per-lap simulated data
8. Diff engine compares simulated vs actual
9. AI narration layer generates explanation from the diff
10. Backend returns `SimResult` with positions, laps, diff, and narrative
11. Frontend renders results comparison page
12. User clicks "Watch replay" → frontend plays back simulated laps with commentary

## Data flow for a reverse-query

1. User types: "What lap time would Hamilton need to finish in front of Norris?"
2. Frontend sends `POST /api/races/2025-aus/solve` with `{ query: "..." }`
3. Backend sends the query to Claude for parsing → returns `GoalQuery` struct
4. Solver runs binary search: tries pace_offset = -0.1, runs sim, checks if HAM beats NOR
5. Narrows: tries -0.2, -0.3... finds threshold at -0.24s
6. Runs final sim at the threshold to get full race data
7. AI narration explains the result including feasibility assessment
8. Backend returns the answer with per-stint breakdown and simulated race data
9. Frontend renders the reverse-query result card

## Environment configuration

```
DATABASE_URL=postgresql://user:pass@localhost:5432/whatif1
REDIS_URL=redis://localhost:6379/0
ANTHROPIC_API_KEY=sk-ant-...
FASTF1_CACHE_DIR=/data/fastf1_cache
CELERY_BROKER_URL=redis://localhost:6379/1
```
