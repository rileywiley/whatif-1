from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, subqueryload

from backend.app.ai.narration import generate_narrative
from backend.app.ai.query_parser import parse_query
from backend.app.database import get_db
from backend.app.models import DriverEntry, Race
from backend.app.services.simulation_service import run_simulation
from backend.app.simulation.solver import GoalQuery, solve_goal_query

router = APIRouter(prefix="/api/v1", tags=["solver"])


@router.post("/races/{race_id}/solve")
def solve(race_id: str, body: dict, db: Session = Depends(get_db)):
    race = (
        db.query(Race)
        .options(
            subqueryload(Race.circuit),
            subqueryload(Race.driver_entries).subqueryload(DriverEntry.laps),
            subqueryload(Race.driver_entries).subqueryload(DriverEntry.pit_stops),
            subqueryload(Race.race_events),
            subqueryload(Race.weather_samples),
            subqueryload(Race.surface_states),
        )
        .filter(Race.race_id == race_id)
        .first()
    )
    if not race:
        raise HTTPException(
            404,
            {"code": "RACE_NOT_FOUND", "message": f"Race {race_id} not found"},
        )

    query_text = body.get("query", "")
    if not query_text:
        raise HTTPException(400, {"code": "EMPTY_QUERY", "message": "Query is required"})

    # Parse the natural language query via AI
    parsed = parse_query(query_text, race)

    if parsed.get("type") == "error":
        return {"query_parsed": parsed, "message": parsed.get("message", "Could not parse query")}

    if parsed.get("type") == "forward":
        # Run a forward simulation with the parsed scenario
        scenario_input = parsed.get("scenario", {})
        result = run_simulation(race_id, scenario_input, db)
        return {
            "query_parsed": parsed,
            "sim_result": result.get("result"),
            "scenario_id": result.get("scenario_id"),
            "narrative": result.get("result", {}).get("narrative"),
        }

    if parsed.get("type") == "solve":
        # Run the reverse-query solver
        goal_data = parsed.get("goal", {})
        goal = GoalQuery(
            goal_type=goal_data.get("goal_type", "beat"),
            driver=goal_data.get("driver", ""),
            target_driver=goal_data.get("target_driver"),
            target_position=goal_data.get("target_position"),
            parameter=goal_data.get("parameter", "pace_offset"),
            search_range=tuple(goal_data.get("search_range", [-1.0, 1.0])),
        )
        solver_result = solve_goal_query(race, goal)

        # Generate narrative for the result
        narrative = generate_narrative(
            race, solver_result.scenario, solver_result.sim_result
        )

        return {
            "query_parsed": parsed,
            "answer": {
                "threshold_value": solver_result.threshold_value,
                "parameter": solver_result.parameter,
                "is_feasible": solver_result.is_feasible,
            },
            "sim_result": solver_result.sim_result,
            "narrative": narrative,
        }

    if parsed.get("type") == "analysis":
        return {
            "query_parsed": parsed,
            "message": "Analysis queries run a targeted simulation. Use the forward simulation for now.",
        }

    return {"query_parsed": parsed}
