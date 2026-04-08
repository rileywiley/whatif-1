from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.services.scenario_service import get_scenario

router = APIRouter(prefix="/api/v1", tags=["scenarios"])


@router.get("/scenarios/{scenario_id}")
def get_scenario_endpoint(
    scenario_id: str, db: Session = Depends(get_db)
):
    result = get_scenario(scenario_id, db)
    if not result:
        raise HTTPException(
            404,
            {
                "code": "SCENARIO_NOT_FOUND",
                "message": f"Scenario {scenario_id} not found",
            },
        )
    return result
