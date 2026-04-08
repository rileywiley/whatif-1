import uuid

from sqlalchemy.orm import Session

from backend.app.cache import cache, hash_scenario
from backend.app.exceptions import RaceNotFoundError, SimulationError
from backend.app.models import Race, Scenario, SimResult as SimResultModel
from backend.app.simulation.engine import simulate

CACHE_TTL_SECONDS = 7 * 24 * 60 * 60  # 7 days


def run_simulation(race_id: str, scenario_input: dict, db: Session) -> dict:
    """Run a simulation for a given race with the provided scenario overrides."""
    # Check cache first
    cache_key = f"sim:{hash_scenario(race_id, scenario_input)}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    race = db.query(Race).filter(Race.race_id == race_id).first()
    if not race:
        raise RaceNotFoundError(f"Race {race_id} not found")

    scenario = Scenario(
        scenario_id=str(uuid.uuid4())[:8],
        race_id=race_id,
        description=scenario_input.get("description"),
        pit_overrides=scenario_input.get("pit_overrides"),
        event_overrides=scenario_input.get("event_overrides"),
        weather_overrides=scenario_input.get("weather_overrides"),
        driver_overrides=scenario_input.get("driver_overrides"),
        race_param_overrides=scenario_input.get("race_param_overrides"),
    )
    db.add(scenario)
    db.flush()

    try:
        result = simulate(race, scenario)
    except Exception as e:
        db.rollback()
        raise SimulationError(f"Simulation failed: {e}") from e

    sim_result = SimResultModel(
        result_id=str(uuid.uuid4())[:8],
        scenario_id=scenario.scenario_id,
        computation_time_ms=result["computation_time_ms"],
        simulated_laps=result["simulated_laps"],
        finish_order=result["finish_order"],
        position_history=result["position_history"],
        diff_summary=result["diff_summary"],
        key_divergence_lap=result.get("key_divergence_lap"),
        confidence_score=result["confidence_score"],
    )
    db.add(sim_result)
    db.commit()

    response = {
        "scenario_id": scenario.scenario_id,
        "result": result,
        "computation_time_ms": result["computation_time_ms"],
    }

    # Cache the result with 7-day TTL
    cache.set(cache_key, response, ttl_seconds=CACHE_TTL_SECONDS)

    return response
