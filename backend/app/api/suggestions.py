from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import Race

router = APIRouter(prefix="/api/v1", tags=["suggestions"])


@router.get("/races/{race_id}/suggestions")
def get_suggestions(race_id: str, db: Session = Depends(get_db)):
    """Generate AI-suggested what-if scenarios for a race."""
    from backend.app.ai.suggestions import generate_suggestions

    race = db.query(Race).filter(Race.race_id == race_id).first()
    if not race:
        raise HTTPException(404, detail="Race not found")

    return {"suggestions": generate_suggestions(race)}
