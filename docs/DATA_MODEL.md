# Data model

## Database: PostgreSQL

All models use SQLAlchemy 2.0 declarative style with mapped_column. Use Alembic for migrations.

## Base setup

```python
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy import String, Float, Integer, Boolean, DateTime, JSON, ForeignKey, Enum, Index
from datetime import datetime
import enum

class Base(DeclarativeBase):
    pass
```

## Enums

```python
class TyreCompound(str, enum.Enum):
    SOFT = "SOFT"
    MEDIUM = "MEDIUM"
    HARD = "HARD"
    INTERMEDIATE = "INTERMEDIATE"
    WET = "WET"

class EventType(str, enum.Enum):
    SAFETY_CAR = "SAFETY_CAR"
    VSC = "VSC"
    RED_FLAG = "RED_FLAG"
    RAIN_START = "RAIN_START"
    RAIN_STOP = "RAIN_STOP"
    PENALTY = "PENALTY"
    RETIREMENT = "RETIREMENT"
    MECHANICAL_FAILURE = "MECHANICAL_FAILURE"

class CompoundClass(str, enum.Enum):
    DRY = "DRY"
    INTERMEDIATE = "INTERMEDIATE"
    WET = "WET"

class DriverStatus(str, enum.Enum):
    FINISHED = "FINISHED"
    DNF = "DNF"
    DSQ = "DSQ"
    DNS = "DNS"
```

## Models

### Circuit

```python
class Circuit(Base):
    __tablename__ = "circuits"

    circuit_id: Mapped[str] = mapped_column(String(50), primary_key=True)  # e.g. "albert_park"
    name: Mapped[str] = mapped_column(String(100))                          # e.g. "Albert Park"
    country: Mapped[str] = mapped_column(String(50))
    track_length_km: Mapped[float] = mapped_column(Float)                   # e.g. 5.278
    pit_loss_seconds: Mapped[float] = mapped_column(Float)                  # time lost by pitting vs staying out, e.g. 22.0
    overtake_difficulty: Mapped[float] = mapped_column(Float)               # 0.0 (easy, Monza) to 1.0 (hard, Monaco)
    drs_zones: Mapped[int] = mapped_column(Integer)                         # number of DRS zones
    drying_rate_coeff: Mapped[float] = mapped_column(Float, default=0.5)    # mm/lap evaporation at reference temp (45C)
    sector_distances: Mapped[dict] = mapped_column(JSON)                    # {"s1_end_m": 1800, "s2_end_m": 3600, "s3_end_m": 5278}

    races: Mapped[list["Race"]] = relationship(back_populates="circuit")
```

### Race

```python
class Race(Base):
    __tablename__ = "races"

    race_id: Mapped[str] = mapped_column(String(50), primary_key=True)      # e.g. "2025-aus"
    circuit_id: Mapped[str] = mapped_column(ForeignKey("circuits.circuit_id"))
    year: Mapped[int] = mapped_column(Integer)
    round_number: Mapped[int] = mapped_column(Integer)
    name: Mapped[str] = mapped_column(String(100))                           # e.g. "Australian Grand Prix"
    date: Mapped[datetime] = mapped_column(DateTime)
    total_laps: Mapped[int] = mapped_column(Integer)
    fastf1_session_key: Mapped[int | None] = mapped_column(Integer, nullable=True)

    circuit: Mapped["Circuit"] = relationship(back_populates="races")
    driver_entries: Mapped[list["DriverEntry"]] = relationship(back_populates="race", cascade="all, delete-orphan")
    race_events: Mapped[list["RaceEvent"]] = relationship(back_populates="race", cascade="all, delete-orphan")
    weather_samples: Mapped[list["WeatherSample"]] = relationship(back_populates="race", cascade="all, delete-orphan")
    surface_states: Mapped[list["SurfaceState"]] = relationship(back_populates="race", cascade="all, delete-orphan")
    scenarios: Mapped[list["Scenario"]] = relationship(back_populates="race", cascade="all, delete-orphan")
```

### DriverEntry

One per driver per race. Links a driver/team to their race participation.

```python
class DriverEntry(Base):
    __tablename__ = "driver_entries"

    entry_id: Mapped[str] = mapped_column(String(50), primary_key=True)     # e.g. "2025-aus-VER"
    race_id: Mapped[str] = mapped_column(ForeignKey("races.race_id"))
    driver_id: Mapped[str] = mapped_column(String(10))                       # 3-letter code: "VER", "NOR", "LEC"
    driver_name: Mapped[str] = mapped_column(String(100))                    # "Max Verstappen"
    team_id: Mapped[str] = mapped_column(String(50))                         # "red_bull"
    team_name: Mapped[str] = mapped_column(String(100))                      # "Red Bull Racing"
    team_color: Mapped[str] = mapped_column(String(7))                       # hex color "#3671C6"
    driver_number: Mapped[int] = mapped_column(Integer)                      # car number, e.g. 1
    grid_position: Mapped[int] = mapped_column(Integer)
    finish_position: Mapped[int | None] = mapped_column(Integer, nullable=True)  # null if DNF
    status: Mapped[str] = mapped_column(String(20))                          # DriverStatus value
    points_scored: Mapped[float] = mapped_column(Float, default=0.0)
    # Derived performance metrics (computed during ingestion)
    base_pace_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)  # clean-air base lap time
    fuel_corrected_pace: Mapped[float | None] = mapped_column(Float, nullable=True)

    race: Mapped["Race"] = relationship(back_populates="driver_entries")
    laps: Mapped[list["Lap"]] = relationship(back_populates="driver_entry", cascade="all, delete-orphan", order_by="Lap.lap_number")
    pit_stops: Mapped[list["PitStop"]] = relationship(back_populates="driver_entry", cascade="all, delete-orphan", order_by="PitStop.lap_number")

    __table_args__ = (
        Index("ix_driver_entries_race_driver", "race_id", "driver_id"),
    )
```

### Lap

One per driver per lap. The core data for simulation and analysis.

```python
class Lap(Base):
    __tablename__ = "laps"

    lap_id: Mapped[str] = mapped_column(String(60), primary_key=True)        # "2025-aus-VER-15"
    entry_id: Mapped[str] = mapped_column(ForeignKey("driver_entries.entry_id"))
    lap_number: Mapped[int] = mapped_column(Integer)
    lap_time_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)  # null for incomplete laps
    sector1_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    sector2_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    sector3_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    tyre_compound: Mapped[str] = mapped_column(String(20))                    # TyreCompound value
    tyre_age: Mapped[int] = mapped_column(Integer)                            # laps on current set, starts at 1
    fuel_load_kg: Mapped[float | None] = mapped_column(Float, nullable=True)  # estimated remaining fuel
    is_pit_in_lap: Mapped[bool] = mapped_column(Boolean, default=False)       # driver pitted at end of this lap
    is_pit_out_lap: Mapped[bool] = mapped_column(Boolean, default=False)      # driver started this lap from pits
    position: Mapped[int | None] = mapped_column(Integer, nullable=True)      # track position at end of lap
    gap_to_leader_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    interval_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)  # gap to car ahead
    is_under_sc: Mapped[bool] = mapped_column(Boolean, default=False)
    is_under_vsc: Mapped[bool] = mapped_column(Boolean, default=False)
    is_personal_best: Mapped[bool] = mapped_column(Boolean, default=False)
    # Speed trap data
    speed_trap_kmh: Mapped[float | None] = mapped_column(Float, nullable=True)
    # Track status flags
    track_status: Mapped[str | None] = mapped_column(String(20), nullable=True)  # "GREEN", "YELLOW", "SC", "VSC", "RED"

    driver_entry: Mapped["DriverEntry"] = relationship(back_populates="laps")

    __table_args__ = (
        Index("ix_laps_entry_lap", "entry_id", "lap_number"),
        Index("ix_laps_lap_number", "lap_number"),
    )
```

### PitStop

```python
class PitStop(Base):
    __tablename__ = "pit_stops"

    pit_id: Mapped[str] = mapped_column(String(60), primary_key=True)        # "2025-aus-VER-pit1"
    entry_id: Mapped[str] = mapped_column(ForeignKey("driver_entries.entry_id"))
    stop_number: Mapped[int] = mapped_column(Integer)                         # 1, 2, 3...
    lap_number: Mapped[int] = mapped_column(Integer)                          # lap the driver entered pits
    stop_duration_seconds: Mapped[float] = mapped_column(Float)               # time stationary
    pit_lane_duration_seconds: Mapped[float] = mapped_column(Float)           # total pit lane transit
    tyre_compound_from: Mapped[str] = mapped_column(String(20))
    tyre_compound_to: Mapped[str] = mapped_column(String(20))
    was_under_sc: Mapped[bool] = mapped_column(Boolean, default=False)
    was_under_vsc: Mapped[bool] = mapped_column(Boolean, default=False)

    driver_entry: Mapped["DriverEntry"] = relationship(back_populates="pit_stops")
```

### RaceEvent

```python
class RaceEvent(Base):
    __tablename__ = "race_events"

    event_id: Mapped[str] = mapped_column(String(60), primary_key=True)      # "2025-aus-sc-1"
    race_id: Mapped[str] = mapped_column(ForeignKey("races.race_id"))
    event_type: Mapped[str] = mapped_column(String(30))                       # EventType value
    lap_start: Mapped[int] = mapped_column(Integer)
    lap_end: Mapped[int] = mapped_column(Integer)
    trigger_driver_id: Mapped[str | None] = mapped_column(String(10), nullable=True)  # driver who caused it
    details: Mapped[str | None] = mapped_column(String(500), nullable=True)   # free text, e.g. "Albon crashed T12"
    penalty_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)  # for PENALTY events

    race: Mapped["Race"] = relationship(back_populates="race_events")

    __table_args__ = (
        Index("ix_race_events_race_laps", "race_id", "lap_start", "lap_end"),
    )
```

### WeatherSample

```python
class WeatherSample(Base):
    __tablename__ = "weather_samples"

    sample_id: Mapped[str] = mapped_column(String(60), primary_key=True)     # "2025-aus-wx-15"
    race_id: Mapped[str] = mapped_column(ForeignKey("races.race_id"))
    lap_number: Mapped[int] = mapped_column(Integer)
    air_temp_celsius: Mapped[float] = mapped_column(Float)
    track_temp_celsius: Mapped[float] = mapped_column(Float)
    humidity_percent: Mapped[float] = mapped_column(Float)
    wind_speed_ms: Mapped[float] = mapped_column(Float)
    wind_direction_deg: Mapped[float] = mapped_column(Float)
    rainfall_intensity_mm_hr: Mapped[float] = mapped_column(Float, default=0.0)
    is_raining: Mapped[bool] = mapped_column(Boolean, default=False)
    pressure_mbar: Mapped[float | None] = mapped_column(Float, nullable=True)

    race: Mapped["Race"] = relationship(back_populates="weather_samples")

    __table_args__ = (
        Index("ix_weather_race_lap", "race_id", "lap_number"),
    )
```

### SurfaceState

Derived from WeatherSample + Circuit properties. Computed during ingestion.

```python
class SurfaceState(Base):
    __tablename__ = "surface_states"

    state_id: Mapped[str] = mapped_column(String(60), primary_key=True)      # "2025-aus-surf-15"
    race_id: Mapped[str] = mapped_column(ForeignKey("races.race_id"))
    lap_number: Mapped[int] = mapped_column(Integer)
    surface_water_mm: Mapped[float] = mapped_column(Float, default=0.0)       # accumulated water on track
    grip_scalar: Mapped[float] = mapped_column(Float, default=1.0)            # 0.85-1.0, ambient grip modifier
    valid_compound_class: Mapped[str] = mapped_column(String(20))             # CompoundClass value: DRY, INTERMEDIATE, WET
    tyre_deg_temp_modifier: Mapped[float] = mapped_column(Float, default=1.0) # multiplier on d1/d2 degradation rates

    race: Mapped["Race"] = relationship(back_populates="surface_states")

    __table_args__ = (
        Index("ix_surface_race_lap", "race_id", "lap_number"),
    )
```

### Scenario

A user-created what-if scenario. Stores all modifications as JSON.

```python
class Scenario(Base):
    __tablename__ = "scenarios"

    scenario_id: Mapped[str] = mapped_column(String(50), primary_key=True)   # UUID
    race_id: Mapped[str] = mapped_column(ForeignKey("races.race_id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)  # user or AI-generated description
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)

    # Modification payloads — see JSON schemas below
    pit_overrides: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    event_overrides: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    weather_overrides: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    driver_overrides: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    race_param_overrides: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    race: Mapped["Race"] = relationship(back_populates="scenarios")
    sim_results: Mapped[list["SimResult"]] = relationship(back_populates="scenario", cascade="all, delete-orphan")
```

### SimResult

Stores the full output of a simulation run.

```python
class SimResult(Base):
    __tablename__ = "sim_results"

    result_id: Mapped[str] = mapped_column(String(50), primary_key=True)     # UUID
    scenario_id: Mapped[str] = mapped_column(ForeignKey("scenarios.scenario_id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    computation_time_ms: Mapped[int] = mapped_column(Integer)

    # Full simulation output
    simulated_laps: Mapped[dict] = mapped_column(JSON)          # {driver_id: [{lap_number, lap_time, position, gap, tyre, tyre_age, ...}]}
    finish_order: Mapped[list] = mapped_column(JSON)            # ["NOR", "LEC", "RUS", "VER", ...]
    position_history: Mapped[dict] = mapped_column(JSON)        # {driver_id: [pos_lap1, pos_lap2, ...]}

    # Diff against actual
    diff_summary: Mapped[dict] = mapped_column(JSON)            # {driver_id: {actual_pos, sim_pos, delta, gap_change}}
    key_divergence_lap: Mapped[int | None] = mapped_column(Integer, nullable=True)  # lap where sim diverges most

    # AI-generated content
    narrative: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    confidence_score: Mapped[float] = mapped_column(Float)      # 0.0-1.0

    scenario: Mapped["Scenario"] = relationship(back_populates="sim_results")
```

## JSON schemas for scenario overrides

### pit_overrides

```json
{
  "VER": {
    "stops": [
      {"lap": 15, "compound_to": "HARD"},
      {"lap": 38, "compound_to": "HARD"}
    ]
  },
  "NOR": {
    "stops": [
      {"lap": 13, "compound_to": "MEDIUM"},
      {"lap": 36, "compound_to": "HARD"}
    ]
  }
}
```

### event_overrides

```json
[
  {"event_id": "2025-aus-sc-1", "action": "REMOVE"},
  {"event_id": "2025-aus-vsc-1", "action": "SHORTEN", "new_lap_end": 37},
  {"action": "ADD", "event_type": "SAFETY_CAR", "lap_start": 25, "lap_end": 28, "trigger_driver_id": null}
]
```

### weather_overrides

```json
[
  {"lap_range": [1, 8], "rainfall_intensity_mm_hr": 0, "description": "Remove rain"},
  {"lap_range": [30, 45], "rainfall_intensity_mm_hr": 12.0, "description": "Add heavy rain"},
  {"lap_range": [1, 58], "track_temp_offset_celsius": 5.0, "description": "Hotter day"}
]
```

### driver_overrides

```json
{
  "HAM": {
    "pace_offset_seconds": -0.2,
    "tyre_management_pct": 70,
    "ers_mode": "ATTACK",
    "engine_mode": "PUSH"
  }
}
```

ERS modes: "BALANCED", "ATTACK" (depletes faster, +0.15s/lap in DRS zones), "DEFEND" (+0.1s when defending), "OVERTAKE" (+0.25s for 2-3 laps then depleted).

Engine modes: "STANDARD", "PUSH" (base pace -0.15s but 5% higher mechanical DNF risk per lap in Monte Carlo mode), "LIFT_AND_COAST" (base pace +0.2s but reduces fuel consumption and extends tyre life by 10%).

Tyre management percent: 0 = full push (d1 * 1.3, d2 * 1.3, base pace -0.1s), 50 = balanced (no modification), 100 = full conserve (d1 * 0.7, d2 * 0.7, base pace +0.15s).

### race_param_overrides

```json
{
  "pit_loss_seconds": 24.0,
  "overtake_difficulty": 0.5,
  "drs_effect_seconds": 0.5
}
```

## Surface state computation

During ingestion, compute `SurfaceState` for each lap from weather and circuit data:

```python
def compute_surface_state(
    weather: WeatherSample,
    prev_surface: SurfaceState | None,
    circuit: Circuit,
    lap_duration_seconds: float
) -> SurfaceState:
    # Surface water accumulation
    rain_addition_mm = weather.rainfall_intensity_mm_hr * (lap_duration_seconds / 3600)

    # Evaporation: scales with track temp and wind, using circuit drainage coefficient
    reference_temp = 45.0  # baseline temp for drying_rate_coeff
    temp_factor = max(0.3, weather.track_temp_celsius / reference_temp)
    wind_factor = 1.0 + (weather.wind_speed_ms / 20.0)  # wind helps drying
    evaporation_mm = circuit.drying_rate_coeff * temp_factor * wind_factor * (lap_duration_seconds / 90.0)  # normalize to ~90s lap

    prev_water = prev_surface.surface_water_mm if prev_surface else 0.0
    surface_water = max(0.0, prev_water + rain_addition_mm - evaporation_mm)

    # Compound validity
    if surface_water < 0.3:
        valid_class = "DRY"
    elif surface_water < 4.0:
        valid_class = "INTERMEDIATE"
    else:
        valid_class = "WET"

    # Grip scalar from humidity and wind
    humidity_penalty = max(0.0, (weather.humidity_percent - 50) / 500)  # 0-0.1 range
    grip_scalar = 1.0 - humidity_penalty

    # Tyre deg temperature modifier
    # Higher track temp = faster degradation. Baseline = 45C, each 5C above adds 5% to deg rate
    temp_diff = weather.track_temp_celsius - reference_temp
    tyre_deg_modifier = 1.0 + (temp_diff / 100.0)  # e.g. +10C → 1.1x degradation
    tyre_deg_modifier = max(0.7, min(1.5, tyre_deg_modifier))  # clamp

    return SurfaceState(
        surface_water_mm=round(surface_water, 3),
        grip_scalar=round(grip_scalar, 4),
        valid_compound_class=valid_class,
        tyre_deg_temp_modifier=round(tyre_deg_modifier, 4)
    )
```

## Ingestion order

When ingesting a race:
1. Create or update `Circuit` record
2. Create `Race` record
3. Create `DriverEntry` records for all drivers
4. Create `Lap` records for all drivers (bulk insert)
5. Create `PitStop` records
6. Create `RaceEvent` records (parsed from race control messages)
7. Create `WeatherSample` records
8. Compute and create `SurfaceState` records
9. Compute `base_pace_seconds` for each `DriverEntry` (see SIMULATION_ENGINE.md)
