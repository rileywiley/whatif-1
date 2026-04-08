from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.exceptions import RaceNotFoundError, SimulationError
from backend.app.services.simulation_service import run_simulation

router = APIRouter(prefix="/api/v1", tags=["simulation"])


@router.post("/races/{race_id}/simulate")
def simulate_scenario(
    race_id: str, body: dict, db: Session = Depends(get_db)
):
    try:
        result = run_simulation(race_id, body, db)
        return result
    except RaceNotFoundError as e:
        raise HTTPException(
            404, {"code": "RACE_NOT_FOUND", "message": str(e)}
        )
    except SimulationError as e:
        raise HTTPException(
            422, {"code": "SIMULATION_FAILED", "message": str(e)}
        )
    except Exception as e:
        raise HTTPException(
            500, {"code": "INTERNAL_ERROR", "message": str(e)}
        )
