"""WhatIf-1 data ingestion CLI.

Usage
-----
    python -m backend.app.cli ingest 2025 "Australia"
"""

from __future__ import annotations

import argparse
import logging
import sys

import fastf1

from backend.app.config import settings
from backend.app.database import SessionLocal
from backend.app.ingestion.fastf1_adapter import ingest_race
from backend.app.ingestion.race_event_parser import parse_race_events
from backend.app.ingestion.weather_etl import process_weather
from backend.app.models import Circuit, Race
from backend.app.simulation.pace_model import extract_base_pace

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def ingest_race_cli(year: int, gp_name: str) -> None:
    """Ingest a single race end-to-end.

    Steps:
    1. Enable FastF1 cache
    2. Load the session
    3. Ingest Circuit, Race, DriverEntry, Lap, PitStop via fastf1_adapter
    4. Parse race events via race_event_parser
    5. Process weather & surface states via weather_etl
    6. Commit everything
    7. Print summary
    """
    logger.info("=== Ingesting %d %s ===", year, gp_name)

    # 1. Enable cache
    fastf1.Cache.enable_cache(settings.FASTF1_CACHE_DIR)

    # 2. Load session (shared across all ingestion steps)
    logger.info("Loading FastF1 session...")
    session = fastf1.get_session(year, gp_name, "R")
    session.load(telemetry=False, weather=True, messages=True)
    logger.info("Session loaded successfully")

    db = SessionLocal()
    try:
        # 3. Ingest core data (pass session to avoid double-loading)
        logger.info("Ingesting core race data...")
        race_id = ingest_race(year, gp_name, db, session=session)
        logger.info("Race ID: %s", race_id)

        # 4. Parse race events
        logger.info("Parsing race events...")
        race_events = parse_race_events(session, race_id)
        if race_events:
            db.add_all(race_events)
            db.flush()

        # 5. Process weather
        logger.info("Processing weather data...")
        race_obj = db.get(Race, race_id)
        circuit = db.get(Circuit, race_obj.circuit_id)
        total_laps = session.laps["LapNumber"].max()
        if hasattr(session, "total_laps") and session.total_laps:
            total_laps = int(session.total_laps)
        else:
            total_laps = int(total_laps)

        weather_samples, surface_states = process_weather(
            session, race_id, circuit, total_laps
        )
        if weather_samples:
            db.add_all(weather_samples)
        if surface_states:
            db.add_all(surface_states)

        # 6. Commit
        db.commit()
        logger.info("All data committed successfully")

        # 6b. Compute base pace for each driver
        logger.info("Computing base pace...")
        race_obj = db.get(Race, race_id)
        for entry in race_obj.driver_entries:
            if entry.laps:
                entry.base_pace_seconds = extract_base_pace(entry, race_obj)
                logger.info("  %s: %.3fs", entry.driver_id, entry.base_pace_seconds)
        db.commit()

        # 7. Summary
        driver_count = len(session.results)
        lap_count = len(session.laps)
        event_count = len(race_events)
        wx_count = len(weather_samples)
        surf_count = len(surface_states)

        print()
        print("=" * 50)
        print(f"  Ingestion complete: {race_id}")
        print("=" * 50)
        print(f"  Drivers:          {driver_count}")
        print(f"  Laps:             {lap_count}")
        print(f"  Race events:      {event_count}")
        print(f"  Weather samples:  {wx_count}")
        print(f"  Surface states:   {surf_count}")
        print("=" * 50)
        print()

    except Exception:
        db.rollback()
        logger.exception("Ingestion failed — transaction rolled back")
        sys.exit(1)
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="WhatIf-1 data ingestion CLI",
    )
    subparsers = parser.add_subparsers(dest="command")

    # --- ingest subcommand ---
    ingest_parser = subparsers.add_parser(
        "ingest",
        help="Ingest a race from FastF1",
    )
    ingest_parser.add_argument(
        "year",
        type=int,
        help="Season year (e.g. 2025)",
    )
    ingest_parser.add_argument(
        "gp_name",
        type=str,
        help='Grand Prix name (e.g. "Australia", "Bahrain")',
    )

    args = parser.parse_args()

    if args.command == "ingest":
        ingest_race_cli(args.year, args.gp_name)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
