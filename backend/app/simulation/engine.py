from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from backend.app.models import Race, Scenario

from backend.app.simulation.diff import compute_confidence, compute_diff, find_key_divergence_lap
from backend.app.simulation.event_model import build_event_timeline, event_overlay, get_active_event
from backend.app.simulation.pace_model import fuel_correction
from backend.app.simulation.position import DriverState, RaceParams, handle_pit_stops, resolve_positions
from backend.app.simulation.traffic_model import traffic_penalty
from backend.app.simulation.tyre_model import fit_tyre_models, tyre_degradation
from backend.app.simulation.weather_model import compound_mismatch_penalty


def build_driver_states(race: Race, scenario: Scenario) -> list[DriverState]:
    """Create DriverState for each driver from actual data + overrides."""
    states = []
    total_laps = race.total_laps
    driver_overrides = scenario.driver_overrides or {}
    pit_overrides = scenario.pit_overrides or {}

    for entry in race.driver_entries:
        if entry.status in ("DNS",):
            continue

        # Build pit schedule from overrides or actual
        if entry.driver_id in pit_overrides:
            pit_schedule = pit_overrides[entry.driver_id].get("stops", [])
        else:
            pit_schedule = [
                {"lap": ps.lap_number, "compound_to": ps.tyre_compound_to}
                for ps in entry.pit_stops
            ]

        # Starting compound
        first_lap = entry.laps[0] if entry.laps else None
        starting_compound = first_lap.tyre_compound if first_lap else "MEDIUM"

        # Get overrides for this driver
        d_override = driver_overrides.get(entry.driver_id, {})

        base_pace = entry.base_pace_seconds or 85.0

        state = DriverState(
            driver_id=entry.driver_id,
            team_id=entry.team_id,
            base_pace=base_pace,
            cumulative_time=0.0,
            position=entry.grid_position,
            tyre_compound=starting_compound,
            tyre_age=1,
            fuel_load_kg=110.0,
            fuel_burn_per_lap=110.0 / total_laps,
            gap_to_leader=0.0,
            interval=0.0,
            retired=entry.status == "DNF" and not driver_overrides,
            pit_schedule=pit_schedule,
            pace_offset=d_override.get("pace_offset_seconds", 0.0),
            tyre_management_pct=d_override.get("tyre_management_pct", 50.0),
            ers_mode=d_override.get("ers_mode", "BALANCED"),
            engine_mode=d_override.get("engine_mode", "STANDARD"),
        )
        # Don't retire drivers in sim unless they're mechanically out
        # (scenario modifications should let them race)
        if scenario.event_overrides or scenario.pit_overrides or scenario.driver_overrides:
            state.retired = False

        states.append(state)

    # Set initial cumulative times based on grid positions
    # Small time offsets to establish starting order
    states.sort(key=lambda s: s.position)
    for i, state in enumerate(states):
        state.cumulative_time = i * 0.5
        state.position = i + 1

    return states


def build_weather_timeline(race: Race, scenario: Scenario) -> dict:
    """Build weather timeline with overrides applied."""
    weather = {}
    for ws in race.weather_samples:
        weather[ws.lap_number] = ws

    # Apply weather overrides
    overrides = scenario.weather_overrides or []
    for override in overrides:
        lap_range = override.get("lap_range", [])
        if len(lap_range) != 2:
            continue
        for lap in range(lap_range[0], lap_range[1] + 1):
            if lap in weather:
                ws = weather[lap]
                if "rainfall_intensity_mm_hr" in override:
                    ws.rainfall_intensity_mm_hr = override["rainfall_intensity_mm_hr"]
                    ws.is_raining = override["rainfall_intensity_mm_hr"] > 0
                if "track_temp_offset_celsius" in override:
                    ws.track_temp_celsius += override["track_temp_offset_celsius"]

    return weather


def build_surface_timeline(race: Race, scenario: Scenario) -> dict:
    """Build surface state timeline."""
    surface = {}
    for ss in race.surface_states:
        surface[ss.lap_number] = ss
    return surface


def build_race_params(race: Race, scenario: Scenario) -> RaceParams:
    """Build race parameters with overrides."""
    circuit = race.circuit
    params = RaceParams(
        pit_loss_seconds=circuit.pit_loss_seconds,
        overtake_difficulty=circuit.overtake_difficulty,
        drs_effect_seconds=0.3,
    )

    overrides = scenario.race_param_overrides or {}
    if "pit_loss_seconds" in overrides:
        params.pit_loss_seconds = overrides["pit_loss_seconds"]
    if "overtake_difficulty" in overrides:
        params.overtake_difficulty = overrides["overtake_difficulty"]
    if "drs_effect_seconds" in overrides:
        params.drs_effect_seconds = overrides["drs_effect_seconds"]

    return params


def compute_lap_time(
    driver: DriverState,
    lap_num: int,
    tyre_models: dict,
    lap_surface: object,
    active_event: object | None,
    race_params: RaceParams,
    all_drivers: list[DriverState],
) -> float:
    """Compute total lap time for one driver on one lap."""
    # 1. Base pace
    base = driver.base_pace + driver.pace_offset

    # 2. Engine mode
    if driver.engine_mode == "PUSH":
        base -= 0.15
    elif driver.engine_mode == "LIFT_AND_COAST":
        base += 0.20

    # 3. Fuel correction
    fuel_delta = fuel_correction(driver)

    # 4. Tyre degradation
    tyre_delta = tyre_degradation(driver, tyre_models, lap_surface)

    # 5. Traffic
    traffic_delta = traffic_penalty(driver, all_drivers, race_params, lap_surface)

    # 6. Event overlay
    event_delta, is_neutralized = event_overlay(driver, active_event, lap_num)

    # 7. Compound mismatch
    mismatch_delta = compound_mismatch_penalty(driver, lap_surface)

    # 8. Out-lap penalty
    out_lap = driver.out_lap_penalty
    if out_lap > 0:
        driver.out_lap_penalty = 0.0

    # Total
    if is_neutralized and getattr(active_event, "event_type", None) != "RED_FLAG":
        lap_time = base + event_delta
    else:
        lap_time = (
            base + fuel_delta + tyre_delta + traffic_delta
            + event_delta + mismatch_delta + out_lap
        )

    # Floor: can't be faster than theoretical best
    theoretical_best = driver.base_pace * 0.98
    lap_time = max(theoretical_best, lap_time)

    return lap_time


class _DummySurface:
    """Fallback surface state when no weather data exists."""
    surface_water_mm = 0.0
    grip_scalar = 1.0
    valid_compound_class = "DRY"
    tyre_deg_temp_modifier = 1.0


def simulate(race: Race, scenario: Scenario) -> dict:
    """Main simulation entry point. Returns dict matching SimResult fields."""
    import time

    start_time = time.time()

    # 1. Build modified race state
    drivers = build_driver_states(race, scenario)
    events = build_event_timeline(race, scenario)
    weather = build_weather_timeline(race, scenario)
    surface = build_surface_timeline(race, scenario)
    race_params = build_race_params(race, scenario)

    # 2. Fit tyre degradation models
    tyre_models = fit_tyre_models(race)

    # 3. Run lap-by-lap simulation
    sim_laps: dict[str, list] = {d.driver_id: [] for d in drivers}
    position_history: dict[str, list] = {d.driver_id: [] for d in drivers}
    dummy_surface = _DummySurface()

    for lap_num in range(1, race.total_laps + 1):
        lap_surface = surface.get(lap_num, dummy_surface)
        active_event = get_active_event(events, lap_num)

        # Compute each driver's lap time
        for driver in drivers:
            if driver.retired:
                continue

            lap_time = compute_lap_time(
                driver=driver,
                lap_num=lap_num,
                tyre_models=tyre_models,
                lap_surface=lap_surface,
                active_event=active_event,
                race_params=race_params,
                all_drivers=drivers,
            )
            driver.cumulative_time += lap_time
            driver.tyre_age += 1
            driver.fuel_load_kg = max(0, driver.fuel_load_kg - driver.fuel_burn_per_lap)

            sim_laps[driver.driver_id].append({
                "lap_number": lap_num,
                "lap_time": round(lap_time, 3),
                "tyre_compound": driver.tyre_compound,
                "tyre_age": driver.tyre_age,
                "fuel_load_kg": round(driver.fuel_load_kg, 2),
            })

        # Handle pit stops
        handle_pit_stops(drivers, lap_num, race_params, active_event)

        # Resolve positions
        resolve_positions(drivers, lap_num, race_params, active_event)

        # Record positions
        for driver in drivers:
            if driver.retired:
                position_history[driver.driver_id].append(None)
                if sim_laps[driver.driver_id]:
                    sim_laps[driver.driver_id][-1]["position"] = None
                    sim_laps[driver.driver_id][-1]["gap_to_leader"] = None
                    sim_laps[driver.driver_id][-1]["interval"] = None
                continue
            position_history[driver.driver_id].append(driver.position)
            sim_laps[driver.driver_id][-1]["position"] = driver.position
            sim_laps[driver.driver_id][-1]["gap_to_leader"] = round(
                driver.gap_to_leader, 3
            )
            sim_laps[driver.driver_id][-1]["interval"] = round(driver.interval, 3)

    # 4. Build finish order and diff
    finish_order_drivers = sorted(
        [d for d in drivers if not d.retired],
        key=lambda d: d.cumulative_time,
    )
    finish_order = [d.driver_id for d in finish_order_drivers]
    diff = compute_diff(race, finish_order_drivers, sim_laps)
    key_lap = find_key_divergence_lap(race, sim_laps)
    confidence = compute_confidence(scenario)

    computation_time_ms = int((time.time() - start_time) * 1000)

    return {
        "simulated_laps": sim_laps,
        "finish_order": finish_order,
        "position_history": position_history,
        "diff_summary": diff,
        "key_divergence_lap": key_lap,
        "confidence_score": confidence,
        "computation_time_ms": computation_time_ms,
    }
