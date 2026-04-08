from sqlalchemy import Boolean, Float, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.database import Base


class Lap(Base):
    __tablename__ = "laps"

    lap_id: Mapped[str] = mapped_column(String(60), primary_key=True)
    entry_id: Mapped[str] = mapped_column(ForeignKey("driver_entries.entry_id"))
    lap_number: Mapped[int] = mapped_column(Integer)
    lap_time_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    sector1_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    sector2_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    sector3_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    tyre_compound: Mapped[str] = mapped_column(String(20))
    tyre_age: Mapped[int] = mapped_column(Integer)
    fuel_load_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_pit_in_lap: Mapped[bool] = mapped_column(Boolean, default=False)
    is_pit_out_lap: Mapped[bool] = mapped_column(Boolean, default=False)
    position: Mapped[int | None] = mapped_column(Integer, nullable=True)
    gap_to_leader_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    interval_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_under_sc: Mapped[bool] = mapped_column(Boolean, default=False)
    is_under_vsc: Mapped[bool] = mapped_column(Boolean, default=False)
    is_personal_best: Mapped[bool] = mapped_column(Boolean, default=False)
    speed_trap_kmh: Mapped[float | None] = mapped_column(Float, nullable=True)
    track_status: Mapped[str | None] = mapped_column(String(20), nullable=True)

    driver_entry: Mapped["DriverEntry"] = relationship(back_populates="laps")

    __table_args__ = (
        Index("ix_laps_entry_lap", "entry_id", "lap_number"),
        Index("ix_laps_lap_number", "lap_number"),
    )
