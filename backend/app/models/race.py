from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.database import Base


class Race(Base):
    __tablename__ = "races"

    race_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    circuit_id: Mapped[str] = mapped_column(ForeignKey("circuits.circuit_id"))
    year: Mapped[int] = mapped_column(Integer)
    round_number: Mapped[int] = mapped_column(Integer)
    name: Mapped[str] = mapped_column(String(100))
    date: Mapped[datetime] = mapped_column(DateTime)
    total_laps: Mapped[int] = mapped_column(Integer)
    fastf1_session_key: Mapped[int | None] = mapped_column(Integer, nullable=True)

    circuit: Mapped[Circuit] = relationship(back_populates="races")
    driver_entries: Mapped[list[DriverEntry]] = relationship(
        back_populates="race", cascade="all, delete-orphan"
    )
    race_events: Mapped[list[RaceEvent]] = relationship(
        back_populates="race", cascade="all, delete-orphan"
    )
    weather_samples: Mapped[list[WeatherSample]] = relationship(
        back_populates="race", cascade="all, delete-orphan"
    )
    surface_states: Mapped[list[SurfaceState]] = relationship(
        back_populates="race", cascade="all, delete-orphan"
    )
    scenarios: Mapped[list[Scenario]] = relationship(
        back_populates="race", cascade="all, delete-orphan"
    )
