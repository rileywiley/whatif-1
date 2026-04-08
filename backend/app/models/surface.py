from sqlalchemy import Float, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.database import Base


class SurfaceState(Base):
    __tablename__ = "surface_states"

    state_id: Mapped[str] = mapped_column(String(60), primary_key=True)
    race_id: Mapped[str] = mapped_column(ForeignKey("races.race_id"))
    lap_number: Mapped[int] = mapped_column(Integer)
    surface_water_mm: Mapped[float] = mapped_column(Float, default=0.0)
    grip_scalar: Mapped[float] = mapped_column(Float, default=1.0)
    valid_compound_class: Mapped[str] = mapped_column(String(20))
    tyre_deg_temp_modifier: Mapped[float] = mapped_column(Float, default=1.0)

    race: Mapped["Race"] = relationship(back_populates="surface_states")

    __table_args__ = (
        Index("ix_surface_race_lap", "race_id", "lap_number"),
    )
