from __future__ import annotations

from sqlalchemy import Float, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.database import Base


class Circuit(Base):
    __tablename__ = "circuits"

    circuit_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    country: Mapped[str] = mapped_column(String(50))
    track_length_km: Mapped[float] = mapped_column(Float)
    pit_loss_seconds: Mapped[float] = mapped_column(Float)
    overtake_difficulty: Mapped[float] = mapped_column(Float)
    drs_zones: Mapped[int] = mapped_column(Integer)
    drying_rate_coeff: Mapped[float] = mapped_column(Float, default=0.5)
    sector_distances: Mapped[dict] = mapped_column(JSON)

    races: Mapped[list[Race]] = relationship(back_populates="circuit")
