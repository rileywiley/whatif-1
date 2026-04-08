from sqlalchemy import Float, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.database import Base


class RaceEvent(Base):
    __tablename__ = "race_events"

    event_id: Mapped[str] = mapped_column(String(60), primary_key=True)
    race_id: Mapped[str] = mapped_column(ForeignKey("races.race_id"))
    event_type: Mapped[str] = mapped_column(String(30))
    lap_start: Mapped[int] = mapped_column(Integer)
    lap_end: Mapped[int] = mapped_column(Integer)
    trigger_driver_id: Mapped[str | None] = mapped_column(String(10), nullable=True)
    details: Mapped[str | None] = mapped_column(String(500), nullable=True)
    penalty_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)

    race: Mapped["Race"] = relationship(back_populates="race_events")

    __table_args__ = (
        Index("ix_race_events_race_laps", "race_id", "lap_start", "lap_end"),
    )
