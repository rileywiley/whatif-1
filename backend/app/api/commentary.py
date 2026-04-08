from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.database import get_db

router = APIRouter(prefix="/api/v1", tags=["commentary"])


@router.post("/races/{race_id}/commentary")
def get_commentary(race_id: str, body: dict, db: Session = Depends(get_db)):
    """Generate AI commentary for a specific lap of a simulated race."""
    from backend.app.ai.commentary import generate_commentary
    from backend.app.models import Race, Scenario

    race = db.query(Race).filter(Race.race_id == race_id).first()
    if not race:
        raise HTTPException(404, detail="Race not found")

    scenario = None
    sim_result = None
    scenario_id = body.get("scenario_id")
    if scenario_id:
        scenario = (
            db.query(Scenario)
            .filter(Scenario.scenario_id == scenario_id)
            .first()
        )
        if scenario and scenario.sim_results:
            sim_result = scenario.sim_results[-1]

    result = generate_commentary(
        race,
        scenario,
        sim_result,
        body.get("lap_number", 1),
        body.get("focus_driver_id"),
    )
    return result
