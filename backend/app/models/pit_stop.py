from sqlalchemy import Boolean, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.database import Base


class PitStop(Base):
    __tablename__ = "pit_stops"

    pit_id: Mapped[str] = mapped_column(String(60), primary_key=True)
    entry_id: Mapped[str] = mapped_column(ForeignKey("driver_entries.entry_id"))
    stop_number: Mapped[int] = mapped_column(Integer)
    lap_number: Mapped[int] = mapped_column(Integer)
    stop_duration_seconds: Mapped[float] = mapped_column(Float)
    pit_lane_duration_seconds: Mapped[float] = mapped_column(Float)
    tyre_compound_from: Mapped[str] = mapped_column(String(20))
    tyre_compound_to: Mapped[str] = mapped_column(String(20))
    was_under_sc: Mapped[bool] = mapped_column(Boolean, default=False)
    was_under_vsc: Mapped[bool] = mapped_column(Boolean, default=False)

    driver_entry: Mapped["DriverEntry"] = relationship(back_populates="pit_stops")
