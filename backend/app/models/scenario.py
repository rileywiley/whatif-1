from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.database import Base


class Scenario(Base):
    __tablename__ = "scenarios"

    scenario_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    race_id: Mapped[str] = mapped_column(ForeignKey("races.race_id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)

    pit_overrides: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    event_overrides: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    weather_overrides: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    driver_overrides: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    race_param_overrides: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    race: Mapped["Race"] = relationship(back_populates="scenarios")
    sim_results: Mapped[list["SimResult"]] = relationship(
        back_populates="scenario", cascade="all, delete-orphan"
    )


class SimResult(Base):
    __tablename__ = "sim_results"

    result_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    scenario_id: Mapped[str] = mapped_column(ForeignKey("scenarios.scenario_id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    computation_time_ms: Mapped[int] = mapped_column(Integer)

    simulated_laps: Mapped[dict] = mapped_column(JSON)
    finish_order: Mapped[list] = mapped_column(JSON)
    position_history: Mapped[dict] = mapped_column(JSON)

    diff_summary: Mapped[dict] = mapped_column(JSON)
    key_divergence_lap: Mapped[int | None] = mapped_column(Integer, nullable=True)

    narrative: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    confidence_score: Mapped[float] = mapped_column(Float)

    scenario: Mapped["Scenario"] = relationship(back_populates="sim_results")
