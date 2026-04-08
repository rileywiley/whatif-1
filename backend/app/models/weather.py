from sqlalchemy import Boolean, Float, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.database import Base


class WeatherSample(Base):
    __tablename__ = "weather_samples"

    sample_id: Mapped[str] = mapped_column(String(60), primary_key=True)
    race_id: Mapped[str] = mapped_column(ForeignKey("races.race_id"))
    lap_number: Mapped[int] = mapped_column(Integer)
    air_temp_celsius: Mapped[float] = mapped_column(Float)
    track_temp_celsius: Mapped[float] = mapped_column(Float)
    humidity_percent: Mapped[float] = mapped_column(Float)
    wind_speed_ms: Mapped[float] = mapped_column(Float)
    wind_direction_deg: Mapped[float] = mapped_column(Float)
    rainfall_intensity_mm_hr: Mapped[float] = mapped_column(Float, default=0.0)
    is_raining: Mapped[bool] = mapped_column(Boolean, default=False)
    pressure_mbar: Mapped[float | None] = mapped_column(Float, nullable=True)

    race: Mapped["Race"] = relationship(back_populates="weather_samples")

    __table_args__ = (
        Index("ix_weather_race_lap", "race_id", "lap_number"),
    )
