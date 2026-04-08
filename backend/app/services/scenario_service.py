from sqlalchemy.orm import Session, joinedload

from backend.app.models import Scenario


def get_scenario(scenario_id: str, db: Session) -> dict | None:
    """Get a scenario with its latest simulation result."""
    scenario = (
        db.query(Scenario)
        .options(joinedload(Scenario.sim_results), joinedload(Scenario.race))
        .filter(Scenario.scenario_id == scenario_id)
        .first()
    )
    if not scenario:
        return None

    latest_result = scenario.sim_results[-1] if scenario.sim_results else None

    # Build modifications summary
    mods: list[str] = []
    if scenario.event_overrides:
        for eo in scenario.event_overrides:
            mods.append(
                f"{eo.get('action', '')} event {eo.get('event_id', '')}"
            )
    if scenario.pit_overrides:
        for driver_id, po in scenario.pit_overrides.items():
            for stop in po.get("stops", []):
                mods.append(
                    f"{driver_id} pit on lap {stop['lap']} ({stop['compound_to']})"
                )

    return {
        "scenario_id": scenario.scenario_id,
        "race_id": scenario.race_id,
        "race_name": scenario.race.name if scenario.race else "",
        "description": scenario.description,
        "created_at": (
            scenario.created_at.isoformat() if scenario.created_at else None
        ),
        "modifications_summary": mods,
        "result": (
            {
                "finish_order": latest_result.finish_order,
                "diff_summary": latest_result.diff_summary,
                "narrative": latest_result.narrative,
                "confidence_score": latest_result.confidence_score,
            }
            if latest_result
            else None
        ),
    }
