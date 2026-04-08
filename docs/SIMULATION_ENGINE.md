# Simulation engine

## Overview

The simulation engine takes a `Race` (actual data) and a `Scenario` (user modifications) and produces a `SimResult` containing per-driver per-lap simulated data. It runs a lap-by-lap forward simulation for all 20 drivers simultaneously.

## Main simulation loop

```python
def simulate(race: Race, scenario: Scenario) -> SimResult:
    """Main simulation entry point."""
    # 1. Build the modified race state from actual data + scenario overrides
    drivers = build_driver_states(race, scenario)
    events = build_event_timeline(race, scenario)
    weather = build_weather_timeline(race, scenario)
    surface = recompute_surface_states(weather, race.circuit)
    race_params = build_race_params(race.circuit, scenario)

    # 2. Fit tyre degradation models from actual race data
    tyre_models = fit_tyre_models(race)

    # 3. Run lap-by-lap simulation
    sim_laps = {d.driver_id: [] for d in drivers}
    position_history = {d.driver_id: [] for d in drivers}

    for lap_num in range(1, race.total_laps + 1):
        lap_weather = weather[lap_num]
        lap_surface = surface[lap_num]
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
            driver.fuel_load_kg -= driver.fuel_burn_per_lap

            sim_laps[driver.driver_id].append({
                "lap_number": lap_num,
                "lap_time": round(lap_time, 3),
                "tyre_compound": driver.tyre_compound,
                "tyre_age": driver.tyre_age,
                "fuel_load_kg": round(driver.fuel_load_kg, 2),
            })

        # Handle pit stops this lap
        handle_pit_stops(drivers, lap_num, scenario, race_params, active_event)

        # Resolve positions from cumulative times
        resolve_positions(drivers, lap_num, race_params, active_event)

        # Record positions
        for driver in drivers:
            position_history[driver.driver_id].append(driver.position)
            sim_laps[driver.driver_id][-1]["position"] = driver.position
            sim_laps[driver.driver_id][-1]["gap_to_leader"] = round(driver.gap_to_leader, 3)
            sim_laps[driver.driver_id][-1]["interval"] = round(driver.interval, 3)

    # 4. Build finish order and diff
    finish_order = sorted(
        [d for d in drivers if not d.retired],
        key=lambda d: d.cumulative_time
    )
    diff = compute_diff(race, finish_order, sim_laps)
    confidence = compute_confidence(scenario)

    return SimResult(
        simulated_laps=sim_laps,
        finish_order=[d.driver_id for d in finish_order],
        position_history=position_history,
        diff_summary=diff,
        confidence_score=confidence,
    )
```

## Driver state object

```python
@dataclass
class DriverState:
    driver_id: str
    team_id: str
    base_pace: float            # clean-air lap time in seconds (from DriverEntry.base_pace_seconds)
    cumulative_time: float      # running total race time
    position: int
    tyre_compound: str
    tyre_age: int               # laps on current tyres, starts at 1
    fuel_load_kg: float
    fuel_burn_per_lap: float    # kg consumed per lap (total_fuel / total_laps)
    gap_to_leader: float        # seconds behind leader
    interval: float             # seconds behind car directly ahead
    retired: bool
    pit_schedule: list          # [{lap: int, compound_to: str}]
    # Advanced overrides
    pace_offset: float          # seconds added/subtracted from base pace
    tyre_management_pct: float  # 0-100, modifies deg rates
    ers_mode: str               # BALANCED, ATTACK, DEFEND, OVERTAKE
    engine_mode: str            # STANDARD, PUSH, LIFT_AND_COAST
```

## Sub-model 1: Base pace extraction

During ingestion, compute each driver's clean-air base pace from actual race data.

```python
def extract_base_pace(entry: DriverEntry, race: Race) -> float:
    """
    Extract the driver's clean-air base pace by filtering for laps where:
    - Driver is not on an in-lap or out-lap
    - Driver is not under SC or VSC
    - Gap to car ahead > 3.0 seconds (clear air)
    - Lap time is within 107% of the driver's median (remove outliers)

    Then regress out fuel and tyre effects to get the underlying pace.
    """
    clean_laps = [
        lap for lap in entry.laps
        if lap.lap_time_seconds is not None
        and not lap.is_pit_in_lap
        and not lap.is_pit_out_lap
        and not lap.is_under_sc
        and not lap.is_under_vsc
        and (lap.interval_seconds is None or lap.interval_seconds > 3.0)
    ]

    if len(clean_laps) < 5:
        # Fallback: use median of all non-SC laps
        all_laps = [l for l in entry.laps if l.lap_time_seconds and not l.is_under_sc]
        return np.median([l.lap_time_seconds for l in all_laps])

    # Remove outliers (>107% of median)
    times = [l.lap_time_seconds for l in clean_laps]
    median = np.median(times)
    clean_laps = [l for l, t in zip(clean_laps, times) if t < median * 1.07]

    # Regress: lap_time = base_pace + fuel_effect(lap) + tyre_effect(tyre_age)
    # fuel_effect = -fuel_correction_per_kg * fuel_burned_so_far
    # tyre_effect = d1 * tyre_age (phase 1 only for this rough fit)
    # Solve for base_pace as the intercept

    fuel_correction = 0.035  # seconds per kg (circuit-dependent, default 0.035)
    total_fuel_kg = 110.0    # approximate starting fuel
    fuel_per_lap = total_fuel_kg / race.total_laps

    corrected_times = []
    for lap in clean_laps:
        fuel_burned = lap.lap_number * fuel_per_lap
        fuel_benefit = fuel_burned * fuel_correction
        corrected = lap.lap_time_seconds + fuel_benefit  # add back the fuel benefit to normalize
        corrected_times.append(corrected)

    # Base pace = minimum of fuel-corrected clean-air times (approximation)
    # More sophisticated: use linear regression on tyre_age to extract intercept
    base_pace = np.percentile(corrected_times, 10)  # 10th percentile = representative fast pace

    return round(base_pace, 3)
```

## Sub-model 2: Fuel correction

```python
def fuel_correction(driver: DriverState, circuit: Circuit) -> float:
    """
    Returns the lap time delta from fuel load.
    Lighter car = faster. ~0.035 seconds per kg of fuel.
    The factor varies by circuit (longer circuits have higher values).
    """
    fuel_factor = 0.035  # s/kg, can be made circuit-specific
    # Reference: car at race start with full fuel.
    # Fuel burned = initial - current.
    # Each kg burned makes the car faster by fuel_factor.
    initial_fuel = 110.0  # kg approximate
    fuel_benefit = (initial_fuel - driver.fuel_load_kg) * fuel_factor
    return -fuel_benefit  # negative = faster
```

## Sub-model 3: Tyre degradation

Two-phase piecewise linear model fitted per compound per race from actual data.

```python
@dataclass
class TyreDegModel:
    compound: str
    d1: float           # phase 1 degradation rate: seconds/lap (typically 0.02-0.08)
    d2: float           # phase 2 degradation rate: seconds/lap (typically 0.15-0.50)
    cliff_onset_lap: int  # tyre age at which phase 2 begins (typically 15-35)
    graining_laps: int    # number of initial laps with graining penalty (0-5)
    graining_penalty: float  # seconds added during graining phase (0.2-0.8)
    compound_delta: float  # base time difference vs MEDIUM (negative = faster, positive = slower)

def fit_tyre_models(race: Race) -> dict[str, TyreDegModel]:
    """
    Fit degradation models from actual race data.
    Uses all drivers' stints for statistical robustness.
    Returns one TyreDegModel per compound used in the race.
    """
    models = {}
    for compound in get_compounds_used(race):
        stints = extract_stints(race, compound)
        # A stint = consecutive laps on the same compound for one driver
        # Filter: remove in/out laps, SC laps, laps in traffic

        # Collect (tyre_age, fuel_corrected_lap_time) pairs across all stints
        data_points = []
        for stint in stints:
            for lap in stint.laps:
                fuel_correction = lap.lap_number * (110.0 / race.total_laps) * 0.035
                corrected_time = lap.lap_time_seconds + fuel_correction
                data_points.append((lap.tyre_age_in_stint, corrected_time))

        ages = np.array([p[0] for p in data_points])
        times = np.array([p[1] for p in data_points])

        # Fit two-phase piecewise linear:
        # For each candidate cliff_onset in range(10, max_age):
        #   Fit linear to ages < cliff_onset → slope = d1
        #   Fit linear to ages >= cliff_onset → slope = d2
        #   Pick cliff_onset that minimizes total residual

        best_residual = float('inf')
        best_params = None

        for cliff in range(10, min(40, int(ages.max()))):
            phase1_mask = ages < cliff
            phase2_mask = ages >= cliff
            if phase1_mask.sum() < 3 or phase2_mask.sum() < 3:
                continue

            # Phase 1 fit
            p1_fit = np.polyfit(ages[phase1_mask], times[phase1_mask], 1)
            d1 = max(0.0, p1_fit[0])  # slope must be non-negative

            # Phase 2 fit
            p2_fit = np.polyfit(ages[phase2_mask], times[phase2_mask], 1)
            d2 = max(d1, p2_fit[0])  # phase 2 must be >= phase 1

            # Residual
            pred = np.where(ages < cliff, p1_fit[0]*ages + p1_fit[1], p2_fit[0]*ages + p2_fit[1])
            residual = np.sum((times - pred)**2)

            if residual < best_residual:
                best_residual = residual
                best_params = (d1, d2, cliff, p1_fit[1])

        d1, d2, cliff, intercept = best_params

        # Detect graining: if first 3-5 laps have HIGHER corrected times than laps 5-10
        early_times = times[ages <= 3]
        mid_times = times[(ages > 5) & (ages <= 10)]
        if len(early_times) > 0 and len(mid_times) > 0:
            graining_penalty = max(0, np.median(early_times) - np.median(mid_times))
            graining_laps = 3 if graining_penalty > 0.15 else 0
        else:
            graining_penalty = 0.0
            graining_laps = 0

        # Compound delta vs medium (reference)
        compound_delta = get_compound_delta(compound, race)

        models[compound] = TyreDegModel(
            compound=compound,
            d1=round(d1, 4),
            d2=round(d2, 4),
            cliff_onset_lap=cliff,
            graining_laps=graining_laps,
            graining_penalty=round(graining_penalty, 3),
            compound_delta=compound_delta,
        )

    return models


def tyre_degradation(
    driver: DriverState,
    tyre_models: dict[str, TyreDegModel],
    surface_state: SurfaceState,
) -> float:
    """
    Returns lap time delta from tyre wear.
    Positive = slower (tyres wearing out).
    """
    model = tyre_models.get(driver.tyre_compound)
    if model is None:
        return 0.0

    age = driver.tyre_age

    # Tyre management modifier
    mgmt = driver.tyre_management_pct / 100.0  # 0.0 to 1.0
    # 0% = full push: deg * 1.3, pace bonus -0.1s
    # 50% = balanced: no change
    # 100% = full conserve: deg * 0.7, pace penalty +0.15s
    deg_modifier = 1.3 - (0.6 * mgmt)  # 1.3 at 0%, 1.0 at 50%, 0.7 at 100%
    mgmt_pace = -0.1 + (0.25 * mgmt)   # -0.1 at 0%, 0.025 at 50%, 0.15 at 100%

    # Temperature modifier from surface state
    temp_modifier = surface_state.tyre_deg_temp_modifier

    # Compute degradation
    effective_cliff = model.cliff_onset_lap
    effective_d1 = model.d1 * deg_modifier * temp_modifier
    effective_d2 = model.d2 * deg_modifier * temp_modifier

    if age <= model.graining_laps:
        # Graining phase: tyres not yet in window
        deg = model.graining_penalty * (1.0 - age / max(1, model.graining_laps))
    elif age < effective_cliff:
        # Phase 1: normal degradation
        deg = effective_d1 * (age - model.graining_laps)
    else:
        # Phase 2: cliff
        phase1_total = effective_d1 * (effective_cliff - model.graining_laps)
        phase2_extra = effective_d2 * (age - effective_cliff)
        deg = phase1_total + phase2_extra

    # Compound delta (softer = faster but less durable)
    compound_effect = model.compound_delta

    return round(deg + compound_effect + mgmt_pace, 4)
```

## Sub-model 4: Traffic and dirty air

```python
def traffic_penalty(
    driver: DriverState,
    all_drivers: list[DriverState],
    race_params: RaceParams,
    surface_state: SurfaceState,
) -> float:
    """
    Computes time lost from running in dirty air behind another car.
    Also computes DRS benefit if within 1.0 second.
    Returns net lap time delta (positive = slower).
    """
    # Find gap to car directly ahead
    car_ahead = get_car_ahead(driver, all_drivers)
    if car_ahead is None:
        return 0.0  # leading the race, clean air

    gap = driver.interval  # seconds behind car ahead

    dirty_air_penalty = 0.0
    drs_benefit = 0.0
    tyre_wear_boost = 0.0

    if gap < 1.5:
        # Dirty air penalty: inversely proportional to gap
        # At 0.5s gap: ~0.6s penalty. At 1.5s: ~0.1s penalty.
        # Scaled by overtake_difficulty (harder track = more aero-dependent = worse dirty air)
        base_penalty = 0.8 * (1.0 - gap / 1.5)
        track_factor = 0.5 + 0.5 * race_params.overtake_difficulty  # 0.5-1.0
        grip_factor = surface_state.grip_scalar  # lower grip = worse in dirty air
        dirty_air_penalty = base_penalty * track_factor * (2.0 - grip_factor)

        # Accelerated tyre wear when in dirty air
        tyre_wear_boost = 0.1 if gap < 1.5 else 0.0  # adds ~0.1x to deg rate indirectly

    if gap <= 1.0:
        # DRS available
        drs_benefit = -race_params.drs_effect_seconds

        # ERS mode bonus
        if driver.ers_mode == "ATTACK":
            drs_benefit -= 0.15
        elif driver.ers_mode == "OVERTAKE":
            drs_benefit -= 0.25
        elif driver.ers_mode == "DEFEND" and car_ahead:
            dirty_air_penalty -= 0.1  # defending driver gets slight benefit

    return round(dirty_air_penalty + drs_benefit, 4)
```

## Sub-model 5: Race event overlay

```python
def event_overlay(
    driver: DriverState,
    active_event: RaceEvent | None,
    lap_num: int,
) -> tuple[float, bool]:
    """
    Returns (lap_time_override_or_delta, is_neutralized).

    Under SC/VSC, all drivers run at a fixed pace and gaps are affected.
    Under red flag, the race is paused.
    """
    if active_event is None:
        return 0.0, False

    if active_event.event_type == "SAFETY_CAR":
        # SC pace: ~35% slower than race pace. All drivers same pace.
        sc_pace = driver.base_pace * 1.35
        # Return the difference vs what their normal lap would be
        # The position resolution step will compress gaps
        normal_lap = driver.base_pace  # approximate
        return sc_pace - normal_lap, True

    elif active_event.event_type == "VSC":
        # VSC: ~30-40% slower. Gaps maintained.
        vsc_pace = driver.base_pace * 1.30
        normal_lap = driver.base_pace
        return vsc_pace - normal_lap, True

    elif active_event.event_type == "RED_FLAG":
        # Red flag: race stopped. No lap time. Handled specially.
        return 0.0, True

    elif active_event.event_type == "PENALTY":
        if active_event.trigger_driver_id == driver.driver_id:
            return active_event.penalty_seconds or 0.0, False

    return 0.0, False
```

## Sub-model 6: Compound mismatch

```python
def compound_mismatch_penalty(
    driver: DriverState,
    surface_state: SurfaceState,
) -> float:
    """
    Penalty for wrong tyre type for surface conditions.
    Slicks on wet = massive penalty. Inters on dry = moderate penalty.
    """
    driver_class = get_compound_class(driver.tyre_compound)
    valid_class = surface_state.valid_compound_class
    water = surface_state.surface_water_mm

    if driver_class == valid_class:
        return 0.0

    if driver_class == "DRY" and valid_class == "INTERMEDIATE":
        # Slicks on damp: penalty scales with water level
        return 3.0 + (water - 0.3) * 4.0  # ~3-18s range

    if driver_class == "DRY" and valid_class == "WET":
        # Slicks on wet: extreme, basically undriveable
        return 15.0 + water * 2.0

    if driver_class == "INTERMEDIATE" and valid_class == "DRY":
        # Inters on dry: overheating, losing rubber
        return 2.0 + max(0, 0.3 - water) * 5.0  # 2-3.5s

    if driver_class == "INTERMEDIATE" and valid_class == "WET":
        # Inters in heavy rain: manageable but not ideal
        return 2.0 + (water - 4.0) * 1.0

    if driver_class == "WET" and valid_class != "WET":
        # Wets on non-wet: massive overheating
        return 4.0

    return 0.0


def get_compound_class(compound: str) -> str:
    if compound in ("SOFT", "MEDIUM", "HARD"):
        return "DRY"
    elif compound == "INTERMEDIATE":
        return "INTERMEDIATE"
    else:
        return "WET"
```

## Sub-model 7: Pit stop resolution

```python
def handle_pit_stops(
    drivers: list[DriverState],
    lap_num: int,
    scenario: Scenario,
    race_params: RaceParams,
    active_event: RaceEvent | None,
):
    """
    Check if any driver is scheduled to pit this lap.
    If so, add pit time to their cumulative time and reset tyres.
    """
    for driver in drivers:
        if driver.retired:
            continue

        # Check if this lap is a scheduled pit
        scheduled = next((s for s in driver.pit_schedule if s["lap"] == lap_num), None)
        if scheduled is None:
            continue

        # Base pit lane loss
        pit_loss = race_params.pit_loss_seconds

        # SC/VSC discount on pit loss
        if active_event and active_event.event_type == "SAFETY_CAR":
            # Under SC, you lose ~10-12s instead of full pit loss
            # Because everyone is going slow anyway
            pit_loss = pit_loss * 0.5  # rough: halve the time loss
        elif active_event and active_event.event_type == "VSC":
            pit_loss = pit_loss * 0.65  # VSC: moderate discount

        # Add pit time
        driver.cumulative_time += pit_loss

        # Reset tyres
        driver.tyre_compound = scheduled["compound_to"]
        driver.tyre_age = 0  # will become 1 on next lap

        # Out-lap penalty (cold tyres)
        driver.out_lap_penalty = 1.5  # seconds, applied on next lap only
```

## Sub-model 8: Position resolution and overtaking

```python
def resolve_positions(
    drivers: list[DriverState],
    lap_num: int,
    race_params: RaceParams,
    active_event: RaceEvent | None,
):
    """
    Sort drivers by cumulative time. Compute gaps.
    Under SC: compress gaps to 0.2s between each car.
    Check for overtakes based on pace delta and circuit overtake difficulty.
    """
    active = [d for d in drivers if not d.retired]
    active.sort(key=lambda d: d.cumulative_time)

    # Under SC: compress gaps
    if active_event and active_event.event_type == "SAFETY_CAR":
        leader_time = active[0].cumulative_time
        for i, driver in enumerate(active):
            driver.cumulative_time = leader_time + (i * 0.2)

    # Compute positions and gaps
    leader_time = active[0].cumulative_time
    for i, driver in enumerate(active):
        driver.position = i + 1
        driver.gap_to_leader = driver.cumulative_time - leader_time
        if i > 0:
            driver.interval = driver.cumulative_time - active[i-1].cumulative_time
        else:
            driver.interval = 0.0

    # Overtake resolution (deterministic mode)
    # Under SC/VSC: no overtaking
    if active_event and active_event.event_type in ("SAFETY_CAR", "VSC"):
        return

    # Check adjacent pairs for overtake opportunities
    # An overtake happens when the gap between two adjacent cars is very small
    # and the trailing car is faster on this lap
    for i in range(len(active) - 1):
        ahead = active[i]
        behind = active[i + 1]

        gap = behind.cumulative_time - ahead.cumulative_time
        if gap > 1.5:
            continue  # too far back to attempt

        # Minimum following gap
        MIN_GAP = 0.2
        if gap < MIN_GAP:
            # Trailing car is faster on cumulative time but can't get closer than MIN_GAP
            # In deterministic mode: overtake succeeds if pace delta exceeds threshold
            # In Monte Carlo mode: use probability

            # Pace delta = how much faster the trailing car's LAP TIME was this lap
            # (look at the last sim_lap entry for each driver)
            pace_delta = 0.0  # need to compute from last lap times
            # Simplified: use the gap closure rate
            # If the gap closed by more than the overtake threshold, overtake succeeds

            overtake_threshold = 0.3 + 0.7 * race_params.overtake_difficulty
            # Easy track (Monza, OD=0.2): threshold = 0.44s
            # Hard track (Monaco, OD=0.95): threshold = 0.965s

            if gap < 0:  # trailing car is ahead on cumulative time
                delta = abs(gap)
                if delta > overtake_threshold:
                    # Swap positions
                    behind.cumulative_time = ahead.cumulative_time + MIN_GAP
                    # Swap in the sorted list
                    active[i], active[i+1] = active[i+1], active[i]
                else:
                    # Can't pass, held up
                    behind.cumulative_time = ahead.cumulative_time + MIN_GAP

    # Reassign positions after overtake resolution
    for i, driver in enumerate(active):
        driver.position = i + 1
        driver.gap_to_leader = driver.cumulative_time - active[0].cumulative_time
        if i > 0:
            driver.interval = driver.cumulative_time - active[i-1].cumulative_time
        else:
            driver.interval = 0.0
```

## Complete lap time computation

```python
def compute_lap_time(
    driver: DriverState,
    lap_num: int,
    tyre_models: dict,
    lap_surface: SurfaceState,
    active_event: RaceEvent | None,
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
    fuel_delta = fuel_correction(driver, race_params.circuit)

    # 4. Tyre degradation
    tyre_delta = tyre_degradation(driver, tyre_models, lap_surface)

    # 5. Traffic
    traffic_delta = traffic_penalty(driver, all_drivers, race_params, lap_surface)

    # 6. Event overlay
    event_delta, is_neutralized = event_overlay(driver, active_event, lap_num)

    # 7. Compound mismatch
    mismatch_delta = compound_mismatch_penalty(driver, lap_surface)

    # 8. Out-lap penalty (cold tyres after pit stop)
    out_lap = getattr(driver, 'out_lap_penalty', 0.0)
    if out_lap > 0:
        driver.out_lap_penalty = 0.0  # consumed

    # Total
    if is_neutralized and active_event.event_type != "RED_FLAG":
        # Under SC/VSC: fixed pace, ignore most deltas
        lap_time = base + event_delta
    else:
        lap_time = base + fuel_delta + tyre_delta + traffic_delta + event_delta + mismatch_delta + out_lap

    # Apply noise floor: lap time can't be faster than theoretical best
    theoretical_best = driver.base_pace * 0.98
    lap_time = max(theoretical_best, lap_time)

    return lap_time
```

## Scenario diff computation

```python
def compute_diff(race: Race, sim_finish: list[DriverState], sim_laps: dict) -> dict:
    """Compare simulated results against actual race results."""
    diff = {}

    for entry in race.driver_entries:
        driver_id = entry.driver_id
        actual_pos = entry.finish_position
        sim_driver = next((d for d in sim_finish if d.driver_id == driver_id), None)
        sim_pos = sim_driver.position if sim_driver else None

        delta = (actual_pos - sim_pos) if (actual_pos and sim_pos) else None
        # positive delta = gained positions in simulation

        diff[driver_id] = {
            "driver_name": entry.driver_name,
            "team_id": entry.team_id,
            "actual_position": actual_pos,
            "simulated_position": sim_pos,
            "position_delta": delta,
        }

    return diff
```

## Confidence scoring

```python
def compute_confidence(scenario: Scenario) -> float:
    """
    Estimate confidence in the simulation result based on scenario complexity.
    More modifications = lower confidence = wider uncertainty.
    """
    score = 1.0

    # Pit changes: small impact on confidence
    if scenario.pit_overrides:
        num_changes = sum(len(v.get("stops", [])) for v in scenario.pit_overrides.values())
        score -= 0.02 * num_changes

    # Event changes: moderate impact
    if scenario.event_overrides:
        for override in scenario.event_overrides:
            if override.get("action") == "REMOVE":
                score -= 0.08  # removing SC/VSC creates significant uncertainty
            elif override.get("action") == "ADD":
                score -= 0.12  # adding an event is very speculative

    # Weather changes: high impact
    if scenario.weather_overrides:
        for w in scenario.weather_overrides:
            if "rainfall_intensity_mm_hr" in w and w["rainfall_intensity_mm_hr"] > 0:
                score -= 0.15  # adding rain is highly speculative
            elif "track_temp_offset_celsius" in w:
                score -= 0.03 * abs(w["track_temp_offset_celsius"]) / 5

    # Driver overrides
    if scenario.driver_overrides:
        for d in scenario.driver_overrides.values():
            if "pace_offset_seconds" in d:
                score -= 0.05 * abs(d["pace_offset_seconds"])

    return max(0.1, min(1.0, score))
```

## Reverse-query solver

```python
def solve_goal_query(
    race: Race,
    goal: GoalQuery,
) -> SolverResult:
    """
    Binary search over a parameter to find the threshold that achieves a goal.

    GoalQuery examples:
    - {type: "beat", driver: "HAM", target_driver: "NOR", parameter: "pace_offset"}
    - {type: "win", driver: "VER", parameter: "pit_lap_1"}
    - {type: "podium", driver: "RUS", parameter: "pace_offset"}
    """
    param = goal.parameter  # which variable to search over
    lo, hi = goal.search_range  # e.g. (-1.0, 1.0) for pace_offset

    # Binary search: find the threshold where the goal condition flips
    for _ in range(20):  # max 20 iterations
        mid = (lo + hi) / 2.0
        scenario = build_scenario_with_param(race, goal, mid)
        result = simulate(race, scenario)

        if check_goal_met(result, goal):
            hi = mid  # goal met, try to find minimum change needed
        else:
            lo = mid  # goal not met, need more change

    # Run final simulation at the threshold
    threshold = (lo + hi) / 2.0
    final_scenario = build_scenario_with_param(race, goal, threshold)
    final_result = simulate(race, final_scenario)

    return SolverResult(
        threshold_value=round(threshold, 3),
        parameter=param,
        scenario=final_scenario,
        sim_result=final_result,
        is_feasible=assess_feasibility(threshold, param, race),
    )
```

## Validation: null scenario test

The most critical test. Run the simulation with zero modifications. The simulated finishing order should match actual within ±1 position for the top 10.

```python
def test_null_scenario(race_id: str):
    """Validate that the sim reproduces actual results with no changes."""
    race = load_race(race_id)
    scenario = Scenario(race_id=race_id)  # empty scenario = no modifications

    result = simulate(race, scenario)

    for driver_id, diff in result.diff_summary.items():
        actual = diff["actual_position"]
        simulated = diff["simulated_position"]
        if actual and simulated and actual <= 10:
            assert abs(actual - simulated) <= 1, (
                f"{driver_id}: actual P{actual}, simulated P{simulated}"
            )
```
