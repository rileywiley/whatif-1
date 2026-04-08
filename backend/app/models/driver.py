from __future__ import annotations

from sqlalchemy import Float, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.database import Base


class DriverEntry(Base):
    __tablename__ = "driver_entries"

    entry_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    race_id: Mapped[str] = mapped_column(ForeignKey("races.race_id"))
    driver_id: Mapped[str] = mapped_column(String(10))
    driver_name: Mapped[str] = mapped_column(String(100))
    team_id: Mapped[str] = mapped_column(String(50))
    team_name: Mapped[str] = mapped_column(String(100))
    team_color: Mapped[str] = mapped_column(String(7))
    driver_number: Mapped[int] = mapped_column(Integer)
    grid_position: Mapped[int] = mapped_column(Integer)
    finish_position: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(20))
    points_scored: Mapped[float] = mapped_column(Float, default=0.0)
    base_pace_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    fuel_corrected_pace: Mapped[float | None] = mapped_column(Float, nullable=True)

    race: Mapped[Race] = relationship(back_populates="driver_entries")
    laps: Mapped[list[Lap]] = relationship(
        back_populates="driver_entry",
        cascade="all, delete-orphan",
        order_by="Lap.lap_number",
    )
    pit_stops: Mapped[list[PitStop]] = relationship(
        back_populates="driver_entry",
        cascade="all, delete-orphan",
        order_by="PitStop.lap_number",
    )

    __table_args__ = (
        Index("ix_driver_entries_race_driver", "race_id", "driver_id"),
    )
