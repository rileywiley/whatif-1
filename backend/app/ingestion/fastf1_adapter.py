"""FastF1 data ingestion adapter.

Pulls race data from the FastF1 library and populates the database with
Circuit, Race, DriverEntry, Lap, and PitStop records.
"""

from __future__ import annotations

import logging
import re

import fastf1
import pandas as pd
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.models import Circuit, DriverEntry, Lap, PitStop, Race

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_CIRCUIT_ABBREV: dict[str, str] = {
    "Albert Park Grand Prix Circuit": "aus",
    "Melbourne": "aus",
    "Bahrain International Circuit": "bhr",
    "Sakhir": "bhr",
    "Jeddah Corniche Circuit": "jed",
    "Jeddah": "jed",
    "Shanghai International Circuit": "chn",
    "Shanghai": "chn",
    "Miami International Autodrome": "mia",
    "Miami": "mia",
    "Circuit de Monaco": "mon",
    "Monaco": "mon",
    "Circuit de Barcelona-Catalunya": "esp",
    "Barcelona": "esp",
    "Circuit Gilles-Villeneuve": "can",
    "Montreal": "can",
    "Montréal": "can",
    "Canadian Grand Prix": "can",
    "Red Bull Ring": "aut",
    "Spielberg": "aut",
    "Silverstone Circuit": "gbr",
    "Silverstone": "gbr",
    "Hungaroring": "hun",
    "Budapest": "hun",
    "Circuit de Spa-Francorchamps": "bel",
    "Spa-Francorchamps": "bel",
    "Circuit Park Zandvoort": "ned",
    "Zandvoort": "ned",
    "Autodromo Nazionale di Monza": "ita",
    "Monza": "ita",
    "Marina Bay Street Circuit": "sgp",
    "Singapore": "sgp",
    "Suzuka International Racing Course": "jpn",
    "Suzuka": "jpn",
    "Lusail International Circuit": "qat",
    "Losail": "qat",
    "Circuit of the Americas": "usa",
    "Austin": "usa",
    "Autódromo Hermanos Rodríguez": "mex",
    "Mexico City": "mex",
    "Autódromo José Carlos Pace": "bra",
    "Interlagos": "bra",
    "São Paulo": "bra",
    "Las Vegas Strip Street Circuit": "lvs",
    "Las Vegas": "lvs",
    "Yas Marina Circuit": "abu",
    "Abu Dhabi": "abu",
    "Autodromo Enzo e Dino Ferrari": "imo",
    "Imola": "imo",
    "Baku City Circuit": "aze",
    "Baku": "aze",
}


def _circuit_short(circuit_name: str, location: str) -> str:
    """Return a 3-letter circuit abbreviation."""
    for key, abbrev in _CIRCUIT_ABBREV.items():
        if key.lower() in circuit_name.lower() or key.lower() in location.lower():
            return abbrev
    # Fallback: first 3 letters of location slug
    slug = re.sub(r"[^a-z]", "", location.lower())
    return slug[:3] if len(slug) >= 3 else slug.ljust(3, "x")


def _circuit_slug(circuit_name: str) -> str:
    """Create a slug like 'albert_park' from a circuit name."""
    slug = re.sub(r"[^a-zA-Z0-9 ]", "", circuit_name)
    slug = re.sub(r"\s+", "_", slug.strip()).lower()
    return slug


def _normalise_team_color(color: str | None) -> str:
    """Ensure team color is in '#XXXXXX' format."""
    if not color:
        return "#999999"
    color = str(color).strip()
    if not color.startswith("#"):
        color = f"#{color}"
    # Ensure 7 chars
    if len(color) == 4:  # e.g. #FFF -> #FFFFFF
        color = f"#{color[1]*2}{color[2]*2}{color[3]*2}"
    return color[:7]


def _team_slug(team_name: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9 ]", "", team_name)
    slug = re.sub(r"\s+", "_", slug.strip()).lower()
    return slug


def _td_to_seconds(val) -> float | None:
    """Convert a pandas Timedelta (or NaT) to float seconds."""
    if pd.isna(val):
        return None
    if isinstance(val, pd.Timedelta):
        return val.total_seconds()
    # Might already be a float/int
    try:
        return float(val)
    except (TypeError, ValueError):
        return None


def _safe_float(val) -> float | None:
    if pd.isna(val):
        return None
    try:
        return float(val)
    except (TypeError, ValueError):
        return None


def _safe_int(val) -> int | None:
    if pd.isna(val):
        return None
    try:
        return int(val)
    except (TypeError, ValueError):
        return None


def _driver_status(status_str: str) -> str:
    """Map FastF1 Status string to our DriverStatus enum value."""
    if not status_str:
        return "DNF"
    s = str(status_str).strip().lower()
    if s == "finished" or s.startswith("finished") or s.startswith("+"):
        return "FINISHED"
    if "disqualif" in s:
        return "DSQ"
    if "did not start" in s or s == "dns":
        return "DNS"
    return "DNF"


def _track_status_flags(track_status) -> tuple[bool, bool]:
    """Return (is_under_sc, is_under_vsc) from TrackStatus value."""
    if pd.isna(track_status):
        return False, False
    ts = str(track_status).strip()
    is_sc = "4" in ts
    is_vsc = "6" in ts or "7" in ts
    return is_sc, is_vsc


# ---------------------------------------------------------------------------
# Main ingestion
# ---------------------------------------------------------------------------


def ingest_race(
    year: int,
    gp_name: str,
    db: Session,
    session=None,
) -> str:
    """Ingest a race from FastF1 into the database.

    Returns the race_id string.  If *session* is ``None`` one will be loaded
    automatically.
    """
    if session is None:
        fastf1.Cache.enable_cache(settings.FASTF1_CACHE_DIR)
        logger.info("Loading FastF1 session: %d %s Race", year, gp_name)
        session = fastf1.get_session(year, gp_name, "R")
        session.load(telemetry=False, weather=True, messages=True)

    event = session.event
    circuit_name = str(event.get("CircuitName", event.get("EventName", gp_name)))
    location = str(event.get("Location", event.get("Country", "")))
    country = str(event.get("Country", ""))
    short = _circuit_short(circuit_name, location)

    # ---- Circuit ----
    circuit_id = _circuit_slug(circuit_name)

    # Try to get track length from session info
    track_length_km = 5.0  # default
    if hasattr(session, "session_info") and isinstance(session.session_info, dict):
        tl = session.session_info.get("TrackLength")
        if tl:
            track_length_km = float(tl) / 1000.0 if float(tl) > 100 else float(tl)

    circuit = Circuit(
        circuit_id=circuit_id,
        name=circuit_name,
        country=country,
        track_length_km=track_length_km,
        pit_loss_seconds=22.0,
        overtake_difficulty=0.5,
        drs_zones=3,
        drying_rate_coeff=0.5,
        sector_distances={},
    )
    db.merge(circuit)

    # ---- Race ----
    race_id = f"{year}-{short}"
    total_laps = int(session.total_laps) if hasattr(session, "total_laps") and session.total_laps else int(
        session.laps["LapNumber"].max()
    )
    race_date = pd.Timestamp(event.get("EventDate", event.get("Session5Date", None)))
    session_key = None
    if hasattr(session, "session_info") and isinstance(session.session_info, dict):
        session_key = session.session_info.get("Key")

    race = Race(
        race_id=race_id,
        circuit_id=circuit_id,
        year=year,
        round_number=int(event.get("RoundNumber", 0)),
        name=str(event.get("EventName", gp_name)),
        date=race_date.to_pydatetime() if pd.notna(race_date) else None,
        total_laps=total_laps,
        fastf1_session_key=_safe_int(session_key),
    )
    db.merge(race)
    db.flush()

    # ---- Driver Entries ----
    results = session.results
    driver_entries: list[DriverEntry] = []
    driver_number_to_id: dict[str, str] = {}

    for _, row in results.iterrows():
        driver_id = str(row.get("Abbreviation", ""))
        if not driver_id:
            continue

        driver_num = _safe_int(row.get("DriverNumber"))
        if driver_num is not None:
            driver_number_to_id[str(driver_num)] = driver_id

        team_name = str(row.get("TeamName", "Unknown"))
        team_color = _normalise_team_color(row.get("TeamColor"))
        finish_pos = _safe_int(row.get("Position"))
        status = _driver_status(str(row.get("Status", "")))

        entry = DriverEntry(
            entry_id=f"{race_id}-{driver_id}",
            race_id=race_id,
            driver_id=driver_id,
            driver_name=str(row.get("FullName", driver_id)),
            team_id=_team_slug(team_name),
            team_name=team_name,
            team_color=team_color,
            driver_number=driver_num or 0,
            grid_position=_safe_int(row.get("GridPosition")) or 0,
            finish_position=finish_pos if status == "FINISHED" else None,
            status=status,
            points_scored=_safe_float(row.get("Points")) or 0.0,
        )
        driver_entries.append(entry)

    db.add_all(driver_entries)
    db.flush()
    logger.info("Ingested %d driver entries", len(driver_entries))

    # ---- Laps ----
    laps_df = session.laps
    lap_objects: list[Lap] = []

    for _, row in laps_df.iterrows():
        drv_num = str(int(row["DriverNumber"])) if pd.notna(row.get("DriverNumber")) else None
        if drv_num is None:
            continue
        driver_id = driver_number_to_id.get(drv_num)
        if not driver_id:
            continue

        lap_number = int(row["LapNumber"])
        entry_id = f"{race_id}-{driver_id}"
        is_sc, is_vsc = _track_status_flags(row.get("TrackStatus"))

        lap = Lap(
            lap_id=f"{race_id}-{driver_id}-{lap_number}",
            entry_id=entry_id,
            lap_number=lap_number,
            lap_time_seconds=_td_to_seconds(row.get("LapTime")),
            sector1_seconds=_td_to_seconds(row.get("Sector1Time")),
            sector2_seconds=_td_to_seconds(row.get("Sector2Time")),
            sector3_seconds=_td_to_seconds(row.get("Sector3Time")),
            tyre_compound=str(row.get("Compound", "UNKNOWN")).upper(),
            tyre_age=_safe_int(row.get("TyreLife")) or 1,
            fuel_load_kg=None,  # Computed later by the pace model
            is_pit_in_lap=pd.notna(row.get("PitInTime")),
            is_pit_out_lap=pd.notna(row.get("PitOutTime")),
            position=_safe_int(row.get("Position")),
            gap_to_leader_seconds=None,
            interval_seconds=None,
            is_under_sc=is_sc,
            is_under_vsc=is_vsc,
            is_personal_best=bool(row.get("IsPersonalBest", False)) if pd.notna(row.get("IsPersonalBest")) else False,
            speed_trap_kmh=_safe_float(row.get("SpeedST")),
            track_status=str(row.get("TrackStatus", "")) if pd.notna(row.get("TrackStatus")) else None,
        )
        lap_objects.append(lap)

    db.add_all(lap_objects)
    db.flush()
    logger.info("Ingested %d laps", len(lap_objects))

    # ---- Pit Stops ----
    pit_objects: list[PitStop] = []

    # Group laps by driver and find pit-in laps
    for driver_id in driver_number_to_id.values():
        entry_id = f"{race_id}-{driver_id}"
        driver_laps = [l for l in lap_objects if l.entry_id == entry_id]
        driver_laps.sort(key=lambda l: l.lap_number)

        stop_number = 0
        for i, lap in enumerate(driver_laps):
            if not lap.is_pit_in_lap:
                continue

            stop_number += 1
            compound_from = lap.tyre_compound

            # Find the compound after the pit stop
            compound_to = compound_from
            for j in range(i + 1, len(driver_laps)):
                if driver_laps[j].tyre_compound != compound_from:
                    compound_to = driver_laps[j].tyre_compound
                    break

            # Try to get pit stop duration from FastF1 pit data
            stop_duration = 2.5  # default stationary time
            pit_lane_duration = 22.0  # default full pit lane time

            # Attempt to extract from the lap time difference
            if lap.lap_time_seconds and i + 1 < len(driver_laps):
                next_lap = driver_laps[i + 1]
                if next_lap.lap_time_seconds:
                    # Rough estimate: pit lane adds ~20s to a normal lap
                    pass

            is_sc, is_vsc = lap.is_under_sc, lap.is_under_vsc

            pit = PitStop(
                pit_id=f"{race_id}-{driver_id}-pit{stop_number}",
                entry_id=entry_id,
                stop_number=stop_number,
                lap_number=lap.lap_number,
                stop_duration_seconds=stop_duration,
                pit_lane_duration_seconds=pit_lane_duration,
                tyre_compound_from=compound_from,
                tyre_compound_to=compound_to,
                was_under_sc=is_sc,
                was_under_vsc=is_vsc,
            )
            pit_objects.append(pit)

    db.add_all(pit_objects)
    db.flush()
    logger.info("Ingested %d pit stops", len(pit_objects))

    return race_id
