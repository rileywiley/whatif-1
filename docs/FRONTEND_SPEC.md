# Frontend specification

## Stack

- React 18+ with TypeScript
- Vite for build tooling
- TailwindCSS for styling
- Recharts for data visualization (position charts, lap time charts)
- React Router for navigation
- Zustand for state management (lightweight, no boilerplate)
- React Query (TanStack Query) for API data fetching and caching

## Color system

All color tokens, typography, and component patterns are defined in `docs/DESIGN_SYSTEM.md`. The app uses a dark-only theme. Key references:

- Team colors: use the `TEAM_COLORS` map from the design system
- Tyre compound colors: use the `--tyre-*` tokens
- Event colors: use the semantic `--warning-*`, `--info-*`, `--vsc-*`, `--danger-*` token sets
- Text hierarchy: `--text-bright` (headlines) → `--text-primary` (content) → `--text-secondary` (body) → `--text-muted` (labels)
- Accent: `--accent` (#5DCAA5 teal) for positive deltas, active states, and AI indicators

See `DESIGN_SYSTEM.md` for the full Tailwind config extension.

## Routes

```
/                         → RaceSelector
/race/:raceId             → RaceTimeline (with ScenarioEditor)
/race/:raceId/results     → ResultsComparison
/race/:raceId/replay      → LapReplay
/scenario/:scenarioId     → SharedScenarioView (loads race + results)
```

## State management (Zustand)

```typescript
interface AppState {
  // Current race
  currentRace: Race | null;
  raceLoading: boolean;

  // Scenario editor state
  editorMode: "simple" | "advanced";
  scenario: ScenarioInput;
  updatePitOverride: (driverId: string, stops: PitStop[]) => void;
  toggleEvent: (eventId: string) => void;
  updateDriverOverride: (driverId: string, overrides: DriverOverrides) => void;
  updateWeatherOverride: (override: WeatherOverride) => void;
  updateRaceParams: (params: Partial<RaceParams>) => void;
  resetScenario: () => void;

  // Simulation result
  simResult: SimResult | null;
  simLoading: boolean;
  runSimulation: () => Promise<void>;

  // Replay state
  replayLap: number;
  replayPlaying: boolean;
  replaySpeed: 1 | 5 | 10;
  setReplayLap: (lap: number) => void;
  toggleReplayPlay: () => void;
  setReplaySpeed: (speed: 1 | 5 | 10) => void;

  // AI chat
  chatMessages: ChatMessage[];
  chatLoading: boolean;
  sendChatMessage: (message: string) => Promise<void>;
}
```

## Pages

### 1. RaceSelector (`/`)

Layout:
- Top nav: WhatIf-1 logo, sign in link
- Season pills (2024, 2025) — filter races by year
- Search input (filters by race name, driver name, circuit)
- Race card grid (2 columns on desktop, 1 on mobile)
- AI suggested scenarios section at bottom

Race card content:
- Round number (small, muted)
- Race name (bold)
- Date and circuit name
- Winner with team color dot
- Disruption badges: rain, SC, VSC, red flag (only show if present)

API calls:
- `GET /api/v1/races?year={selectedYear}` on mount and year change

### 2. RaceTimeline (`/race/:raceId`)

The main analysis screen. Three sub-sections stacked vertically.

#### Section A: Strategy chart

Shows stint bars for top 10 drivers, ordered by finishing position. Each bar:
- Width proportional to stint length (laps / total_laps * 100%)
- Color = compound color
- Label inside = compound letter + lap count (e.g., "M 16")
- Position number on the left
- Driver 3-letter code next to position

Component: `<StrategyChart drivers={race.drivers} totalLaps={race.total_laps} />`

#### Section B: Event timeline

Horizontal bar below the strategy chart, sharing the same lap axis. Shows:
- Colored blocks for SC, VSC, red flag, rain periods
- Lap number tick marks along the bottom

Component: `<EventTimeline events={race.events} weather={race.weather} totalLaps={race.total_laps} />`

#### Section C: Scenario editor

Two modes toggled by a Simple/Advanced switch.

**Simple mode** (`<ScenarioEditor />`):
- Driver selector dropdown
- Pit 1 lap slider (range: 1 to total_laps/2)
- Pit 1 compound selector
- Pit 2 lap slider
- Pit 2 compound selector
- Toggle switches for each race event (on = keep, off = remove)
- Toggle switch for rain (if present)
- "Run simulation" button

**Advanced mode** (`<AdvancedEditor />`):
Collapsible sections:
1. **Driver overrides**: driver tabs, per-driver controls (pace offset slider, tyre management slider, ERS mode dropdown, engine mode dropdown, stint editor with add/remove stint)
2. **Race events**: list of events with action dropdown (remove, shorten, convert to VSC, move), plus "inject new event" button
3. **Weather overrides**: current weather cards, track temp offset slider, add rain window (start lap, end lap, intensity dropdown)
4. **Race parameters**: pit loss time slider, overtake difficulty slider, DRS effect slider

#### Section D: AI chat

A text input at the bottom of the page for natural language questions. Shows:
- Input field with placeholder: "Ask a what-if question..."
- Example question pills below the input
- Chat thread when messages are sent (user questions right-aligned, AI responses left-aligned)

Component: `<AIChat raceId={raceId} onScenarioGenerated={loadScenario} />`

#### Section E: AI suggestion

A subtle card below the editor showing the AI's suggested most impactful scenario for this race.

API calls:
- `GET /api/v1/races/{raceId}` on mount
- `GET /api/v1/races/{raceId}/suggestions` on mount
- `POST /api/v1/races/{raceId}/simulate` on "Run simulation"
- `POST /api/v1/races/{raceId}/solve` on AI chat submit

### 3. ResultsComparison (`/race/:raceId/results`)

Shows after a simulation completes. User can navigate here from RaceTimeline.

Layout:
- Header: scenario description + confidence badge
- Metric cards row (3 cards): winner changes (yes/no), positions changed, biggest swing driver
- Position diff table: Pos, Driver (with team dot), Actual, Simulated, Delta (green/red)
- Confidence bar
- AI narrative card
- Action buttons: share scenario, edit scenario, export data, watch replay

Tabs above the diff table:
- **Positions** (default): the diff table
- **Strategy**: side-by-side stint charts (actual left, simulated right)
- **Gaps**: line chart showing gap-to-leader over laps for top 5, with actual (dashed) vs simulated (solid) lines
- **Lap times**: scatter plot of lap times per driver, actual vs simulated

### 4. LapReplay (`/race/:raceId/replay`)

Full-screen replay of the simulated race, lap by lap.

Layout:
- View mode toggle: Actual / Simulated / Split
- Playback controls bar: play/pause button, lap scrub slider, lap counter, speed selector (1x, 5x, 10x)
- Event status bar: shows current race status (green flag, SC, VSC, rain) with a colored banner
- Compound legend
- Position tower (the main visual):
  - One row per driver (top 10 or all 20)
  - Each row: position number, team color dot, driver code, tyre compound badge, pace bar (width = relative pace vs leader), lap time, gap to leader, delta vs actual position
  - Highlighted row for the driver who changed position most dramatically
- AI commentary card at bottom: 1-2 sentences per lap, auto-updates as playback advances

Interaction:
- Play button starts auto-advancing laps at the selected speed
- Clicking pause freezes on the current lap
- Dragging the scrub slider jumps to any lap
- Speed buttons change how fast laps advance (1x = 1 lap/second, 5x = 5 laps/second, 10x = 10 laps/second)
- Clicking a driver row highlights that driver and focuses commentary on them

API calls:
- Commentary: `POST /api/v1/races/{raceId}/commentary` for each lap (batch 5 at a time)
- Simulation data is already loaded from the SimResult

### 5. ShareView (`/scenario/:scenarioId`)

Public view of a shared scenario. Loads the scenario and its result.

Layout:
- Share card (designed for social media preview): WhatIf-1 logo, race name, scenario question, actual vs simulated top 3 with team dots, 1-line insight
- Full results below the card (same as ResultsComparison)
- "Try your own what-if" CTA button → links to RaceTimeline for this race

API calls:
- `GET /api/v1/scenarios/{scenarioId}` on mount

## Key components

### StrategyChart

```typescript
interface StrategyChartProps {
  drivers: DriverEntry[];  // ordered by finish position
  totalLaps: number;
  maxDrivers?: number;     // default 10
  highlightDriver?: string; // driver_id to highlight
}
```

Renders horizontal stint bars. Each driver row is a flex container. Each stint is a div with:
- `width: ${(stint.laps / totalLaps) * 100}%`
- `background: COMPOUND_COLORS[stint.compound]`
- Text label centered inside: `${compound_letter} ${stint.laps}`

### EventTimeline

```typescript
interface EventTimelineProps {
  events: RaceEvent[];
  weatherSummary: { rain_laps: number[] };
  totalLaps: number;
}
```

Renders colored blocks on a horizontal axis. Each event:
- `left: ${(event.lap_start / totalLaps) * 100}%`
- `width: ${((event.lap_end - event.lap_start) / totalLaps) * 100}%`
- Color from EVENT_COLORS[event.event_type]

### PositionTower (for replay)

```typescript
interface PositionTowerProps {
  drivers: DriverReplayState[];  // sorted by position
  currentLap: number;
  showActualDelta: boolean;      // show +/- vs actual position
}

interface DriverReplayState {
  driver_id: string;
  team_color: string;
  position: number;
  lap_time: number;
  gap_to_leader: number;
  tyre_compound: string;
  tyre_age: number;
  actual_position: number;       // for delta display
  pace_relative: number;         // 0-1, relative to fastest on track
}
```

### ShareCard

```typescript
interface ShareCardProps {
  raceName: string;
  year: number;
  question: string;
  actualTop3: DriverSummary[];
  simulatedTop3: DriverSummary[];
  insight: string;
}
```

This component must render as a standalone card that can be exported to PNG using `html-to-image` library. Dimensions: 600x400px for social media optimal.

## Responsive design

- Desktop (>1024px): full layout as wireframed
- Tablet (768-1024px): single column, strategy chart scrolls horizontally
- Mobile (<768px): single column, simplified controls, replay tower shows top 5 only

## Performance considerations

- Race data is the largest payload (~200KB for full laps). Use React Query to cache.
- Simulation results cached by scenario hash in React Query.
- Replay commentary: prefetch 10 laps ahead during playback to avoid loading states.
- Strategy chart and position tower use CSS for rendering (no SVG/canvas) for fast initial paint.
- Share card rendering (PNG export) uses `html-to-image` — happens client-side only on explicit user action.
