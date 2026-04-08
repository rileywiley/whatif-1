from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.services.simulation_service import run_simulation

router = APIRouter(prefix="/api/v1", tags=["batch"])


@router.post("/races/{race_id}/simulate/batch")
def simulate_batch(race_id: str, body: dict, db: Session = Depends(get_db)):
    scenarios = body.get("scenarios", [])
    results = []
    for scenario_input in scenarios:
        result = run_simulation(race_id, scenario_input, db)
        results.append(result)
    return {"results": results}
