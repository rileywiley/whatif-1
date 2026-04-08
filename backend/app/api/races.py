from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.services.race_service import (
    get_race_detail,
    get_race_laps,
    list_races,
)

router = APIRouter(prefix="/api/v1", tags=["races"])


@router.get("/races")
def get_races(
    year: int | None = None, limit: int = 24, db: Session = Depends(get_db)
):
    return list_races(year, limit, db)


@router.get("/races/{race_id}")
def get_race(race_id: str, db: Session = Depends(get_db)):
    result = get_race_detail(race_id, db)
    if not result:
        raise HTTPException(
            404,
            {"code": "RACE_NOT_FOUND", "message": f"Race {race_id} not found"},
        )
    return result


@router.get("/races/{race_id}/laps")
def get_laps(
    race_id: str,
    driver_id: str | None = None,
    lap_start: int | None = None,
    lap_end: int | None = None,
    db: Session = Depends(get_db),
):
    result = get_race_laps(race_id, db, driver_id, lap_start, lap_end)
    if not result:
        raise HTTPException(
            404,
            {"code": "RACE_NOT_FOUND", "message": f"Race {race_id} not found"},
        )
    return result
