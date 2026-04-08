# API specification

## Base URL

`/api/v1`

## Authentication

Phase 1: No authentication (public read-only + anonymous scenario creation).
Phase 2: Optional JWT auth for saving scenarios and API rate limiting.

## Endpoints

### Races

#### GET /races

List all available races with metadata.

Query params:
- `year` (int, optional): Filter by season. Default: latest.
- `limit` (int, optional): Max results. Default: 24.

Response `200`:
```json
{
  "races": [
    {
      "race_id": "2025-aus",
      "name": "Australian Grand Prix",
      "circuit_name": "Albert Park",
      "country": "Australia",
      "year": 2025,
      "round_number": 1,
      "date": "2025-03-16",
      "total_laps": 58,
      "winner_driver_id": "LEC",
      "winner_name": "Charles Leclerc",
      "winner_team_color": "#E8002D",
      "disruption_tags": ["rain", "safety_car", "vsc"],
      "suggested_scenario": {
        "description": "What if the safety car hadn't happened?",
        "estimated_swing": 6
      }
    }
  ],
  "available_years": [2024, 2025]
}
```

#### GET /races/{race_id}

Full race data for analysis and scenario building.

Response `200`:
```json
{
  "race": {
    "race_id": "2025-aus",
    "name": "Australian Grand Prix",
    "circuit": {
      "circuit_id": "albert_park",
      "name": "Albert Park",
      "track_length_km": 5.278,
      "pit_loss_seconds": 22.0,
      "overtake_difficulty": 0.35,
      "drs_zones": 4
    },
    "year": 2025,
    "round_number": 1,
    "date": "2025-03-16",
    "total_laps": 58
  },
  "drivers": [
    {
      "entry_id": "2025-aus-LEC",
      "driver_id": "LEC",
      "driver_name": "Charles Leclerc",
      "team_id": "ferrari",
      "team_name": "Scuderia Ferrari",
      "team_color": "#E8002D",
      "driver_number": 16,
      "grid_position": 5,
      "finish_position": 1,
      "status": "FINISHED",
      "points_scored": 25,
      "pit_stops": [
        {
          "stop_number": 1,
          "lap_number": 9,
          "stop_duration_seconds": 2.3,
          "tyre_from": "MEDIUM",
          "tyre_to": "HARD",
          "was_under_sc": false
        },
        {
          "stop_number": 2,
          "lap_number": 34,
          "stop_duration_seconds": 2.1,
          "tyre_from": "HARD",
          "tyre_to": "HARD",
          "was_under_sc": false
        }
      ],
      "stints": [
        {"compound": "MEDIUM", "start_lap": 1, "end_lap": 9, "laps": 9},
        {"compound": "HARD", "start_lap": 10, "end_lap": 34, "laps": 25},
        {"compound": "HARD", "start_lap": 35, "end_lap": 58, "laps": 24}
      ]
    }
  ],
  "events": [
    {
      "event_id": "2025-aus-sc-1",
      "event_type": "SAFETY_CAR",
      "lap_start": 13,
      "lap_end": 16,
      "trigger_driver_id": "ALB",
      "details": "Albon crashed at Turn 12"
    },
    {
      "event_id": "2025-aus-vsc-1",
      "event_type": "VSC",
      "lap_start": 36,
      "lap_end": 37,
      "trigger_driver_id": null,
      "details": "Debris on track"
    }
  ],
  "weather_summary": {
    "avg_air_temp_celsius": 22.5,
    "avg_track_temp_celsius": 42.0,
    "rain_laps": [1, 2, 3, 4, 5, 6, 7, 8],
    "max_rainfall_mm_hr": 8.0
  }
}
```

#### GET /races/{race_id}/laps

Lap-by-lap data for all drivers. Used for detailed analysis.

Query params:
- `driver_id` (str, optional): Filter to a single driver.
- `lap_start` (int, optional): Starting lap.
- `lap_end` (int, optional): Ending lap.

Response `200`:
```json
{
  "laps": {
    "VER": [
      {
        "lap_number": 1,
        "lap_time_seconds": 82.456,
        "sector1_seconds": 28.12,
        "sector2_seconds": 29.33,
        "sector3_seconds": 25.006,
        "tyre_compound": "MEDIUM",
        "tyre_age": 1,
        "position": 3,
        "gap_to_leader_seconds": 1.2,
        "interval_seconds": 0.8,
        "is_under_sc": false,
        "is_under_vsc": false
      }
    ]
  }
}
```

### Simulation

#### POST /races/{race_id}/simulate

Run a what-if scenario simulation.

Request body:
```json
{
  "pit_overrides": {
    "LEC": {
      "stops": [
        {"lap": 16, "compound_to": "HARD"},
        {"lap": 38, "compound_to": "HARD"}
      ]
    }
  },
  "event_overrides": [
    {"event_id": "2025-aus-sc-1", "action": "REMOVE"}
  ],
  "weather_overrides": [],
  "driver_overrides": {},
  "race_param_overrides": {},
  "description": "No safety car, Leclerc pits later"
}
```

Response `200`:
```json
{
  "scenario_id": "a1b2c3d4",
  "result": {
    "finish_order": ["NOR", "LEC", "RUS", "VER", "PIA", "HAM", "GAS", "HUL"],
    "position_history": {
      "NOR": [2, 2, 2, 1, 1, 1],
      "LEC": [5, 4, 3, 2, 2, 2]
    },
    "simulated_laps": {
      "NOR": [
        {
          "lap_number": 1,
          "lap_time": 82.342,
          "position": 2,
          "gap_to_leader": 0.8,
          "interval": 0.8,
          "tyre_compound": "MEDIUM",
          "tyre_age": 1,
          "fuel_load_kg": 108.1
        }
      ]
    },
    "diff_summary": {
      "NOR": {"actual_position": 2, "simulated_position": 1, "position_delta": 1},
      "LEC": {"actual_position": 1, "simulated_position": 2, "position_delta": -1},
      "RUS": {"actual_position": 7, "simulated_position": 3, "position_delta": 4}
    },
    "key_divergence_lap": 16,
    "confidence_score": 0.78,
    "narrative": "Without the safety car on lap 13, Leclerc's early pit on lap 9 becomes a costly mistake. Norris's longer stint on mediums gives him the pace to win by 4.2 seconds. Russell is the biggest beneficiary..."
  },
  "computation_time_ms": 1240
}
```

Response `202` (for complex scenarios, returns task ID for polling):
```json
{
  "task_id": "task-xyz",
  "status": "processing",
  "poll_url": "/api/v1/tasks/task-xyz"
}
```

#### GET /tasks/{task_id}

Poll for async simulation results.

Response `200`:
```json
{
  "task_id": "task-xyz",
  "status": "completed",
  "result": { ... }
}
```

### Solver (reverse queries)

#### POST /races/{race_id}/solve

Ask a goal-seeking question.

Request body:
```json
{
  "query": "What lap time would Hamilton need to finish in front of Norris?",
  "context": {}
}
```

Response `200`:
```json
{
  "query_parsed": {
    "type": "beat",
    "driver": "HAM",
    "target_driver": "NOR",
    "parameter": "pace_offset",
    "search_range": [-1.0, 0.0]
  },
  "answer": {
    "threshold_value": -0.24,
    "parameter": "pace_offset",
    "unit": "seconds/lap faster",
    "is_feasible": false,
    "feasibility_note": "Top 15% of pace range — unlikely without car upgrade",
    "per_stint_breakdown": [
      {"stint": "Laps 1-16", "target_pace": "1:19.28", "actual_pace": "1:19.38", "delta": "-0.10"},
      {"stint": "Laps 17-38", "target_pace": "1:19.02", "actual_pace": "1:19.38", "delta": "-0.36"},
      {"stint": "Laps 39-58", "target_pace": "1:19.12", "actual_pace": "1:19.38", "delta": "-0.26"}
    ]
  },
  "sim_result": { ... },
  "narrative": "Hamilton would need to average 1:19.14 per lap — 0.24 seconds faster than his actual pace...",
  "suggested_alternative": {
    "description": "Try an earlier first stop to attempt the undercut",
    "scenario_params": {
      "pit_overrides": { "HAM": { "stops": [{"lap": 12, "compound_to": "HARD"}] } }
    }
  }
}
```

### Scenarios

#### GET /scenarios/{scenario_id}

Retrieve a saved scenario (for shareable links).

Response `200`:
```json
{
  "scenario_id": "a1b2c3d4",
  "race_id": "2025-aus",
  "race_name": "2025 Australian Grand Prix",
  "description": "No safety car, Leclerc pits later",
  "created_at": "2025-04-07T12:00:00Z",
  "modifications_summary": ["Removed SC (laps 13-16)", "LEC pit 1: lap 9 → lap 16"],
  "result": { ... }
}
```

### Commentary

#### POST /races/{race_id}/commentary

Get AI commentary for a specific lap during replay.

Request body:
```json
{
  "scenario_id": "a1b2c3d4",
  "lap_number": 22,
  "focus_driver_id": "RUS"
}
```

Response `200`:
```json
{
  "lap_number": 22,
  "commentary": "Russell's long medium stint is paying off — he's the fastest car on track at 1:19.487, gaining 0.3s/lap on Leclerc's aging hards.",
  "key_facts": [
    {"type": "fastest_on_track", "driver": "RUS", "lap_time": "1:19.487"},
    {"type": "gaining_on", "driver": "RUS", "target": "LEC", "rate": "0.3s/lap"},
    {"type": "tyre_state", "driver": "RUS", "compound": "MEDIUM", "age": 22}
  ]
}
```

### AI suggestions

#### GET /races/{race_id}/suggestions

Get AI-suggested what-if scenarios for a race.

Response `200`:
```json
{
  "suggestions": [
    {
      "description": "What if the safety car hadn't happened?",
      "impact_summary": "Biggest swing race — 6 position changes in top 10",
      "estimated_winner": "NOR",
      "scenario_params": {
        "event_overrides": [{"event_id": "2025-aus-sc-1", "action": "REMOVE"}]
      }
    },
    {
      "description": "What if Verstappen pitted under the SC?",
      "impact_summary": "Potential lead change — VER undercuts NOR",
      "estimated_winner": "VER",
      "scenario_params": {
        "pit_overrides": {"VER": {"stops": [{"lap": 14, "compound_to": "HARD"}]}}
      }
    }
  ]
}
```

## Error responses

All errors follow:
```json
{
  "error": {
    "code": "RACE_NOT_FOUND",
    "message": "Race 2025-xxx not found",
    "details": {}
  }
}
```

Standard codes:
- `400` — Invalid scenario parameters
- `404` — Race or scenario not found
- `422` — Simulation failed (e.g., contradictory pit stops)
- `429` — Rate limited
- `500` — Internal error

## Caching strategy

- `GET /races` — cache 1 hour (Redis)
- `GET /races/{id}` — cache 24 hours (immutable after ingestion)
- `POST /simulate` — cache by `hash(race_id + sorted(scenario_params))`, expire 7 days
- `POST /solve` — cache by `hash(race_id + query)`, expire 7 days
- Commentary — no cache (cheap to generate)
