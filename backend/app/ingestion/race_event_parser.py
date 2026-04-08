"""Race event parser.

Converts FastF1 race control messages into RaceEvent ORM objects (Safety Car,
VSC, Red Flag, Penalty, Retirement).
"""

from __future__ import annotations

import logging
import re
from typing import TYPE_CHECKING

import pandas as pd

from backend.app.models import RaceEvent

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Message classification patterns
# ---------------------------------------------------------------------------

_SC_DEPLOY_PATTERNS = [
    "SAFETY CAR DEPLOYED",
    "SAFETY CAR HAS BEEN DEPLOYED",
]

_SC_END_PATTERNS = [
    "SAFETY CAR IN THIS LAP",
    "SAFETY CAR WILL COME IN",
]

_VSC_DEPLOY_PATTERNS = [
    "VIRTUAL SAFETY CAR DEPLOYED",
]

_VSC_END_PATTERNS = [
    "VIRTUAL SAFETY CAR ENDING",
    "VSC ENDING",
]

_RED_FLAG_PATTERNS = [
    "RED FLAG",
]

_PENALTY_PATTERNS = [
    "TIME PENALTY",
    "PENALTY",
    "DRIVE THROUGH PENALTY",
    "STOP AND GO",
]

_RETIREMENT_PATTERNS = [
    "RETIRED",
    "STOPPED ON TRACK",
    "STOPPED IN",
    "MECHANICAL",
]


def _matches(message: str, patterns: list[str]) -> bool:
    msg_upper = message.upper()
    return any(p in msg_upper for p in patterns)


def _extract_penalty_seconds(message: str) -> float | None:
    """Extract penalty duration from a message like '5 SECOND TIME PENALTY'."""
    match = re.search(r"(\d+)\s*SECOND", message.upper())
    if match:
        return float(match.group(1))
    return None


def _message_to_lap(msg_time, laps_df: pd.DataFrame) -> int:
    """Map a message timestamp to the nearest lap number.

    Uses the race elapsed time from the laps DataFrame to find which lap
    the message occurred on.
    """
    if pd.isna(msg_time):
        return 1

    # laps_df['Time'] is the cumulative session time at end of each lap
    if "Time" not in laps_df.columns or laps_df.empty:
        return 1

    valid = laps_df.dropna(subset=["Time"])
    if valid.empty:
        return 1

    # Convert msg_time to Timedelta if needed
    if isinstance(msg_time, pd.Timestamp):
        # FastF1 sometimes gives Timestamps relative to session start
        # Try to use it as-is
        pass

    try:
        # Find laps whose end time is >= message time
        after = valid[valid["Time"] >= msg_time]
        if not after.empty:
            return int(after.iloc[0]["LapNumber"])
        # Message is after the last lap — assign to final lap
        return int(valid.iloc[-1]["LapNumber"])
    except (TypeError, KeyError):
        return 1


def _driver_abbrev_from_number(
    racing_number, results: pd.DataFrame
) -> str | None:
    """Look up driver abbreviation from racing number."""
    if pd.isna(racing_number):
        return None
    try:
        num = str(int(float(racing_number)))
    except (TypeError, ValueError):
        return None

    if results is None or results.empty:
        return None

    match = results[results["DriverNumber"].astype(str) == num]
    if not match.empty:
        return str(match.iloc[0].get("Abbreviation", None))
    return None


# ---------------------------------------------------------------------------
# Main parser
# ---------------------------------------------------------------------------


def parse_race_events(session, race_id: str) -> list[RaceEvent]:
    """Parse race control messages from a FastF1 session into RaceEvent objects.

    Parameters
    ----------
    session:
        A loaded FastF1 Session object (with messages=True).
    race_id:
        The race identifier string, e.g. "2025-aus".

    Returns
    -------
    list[RaceEvent]
        ORM objects ready to be added to the database.
    """
    try:
        rcm = session.race_control_messages
    except AttributeError:
        logger.warning("No race_control_messages available on session")
        return []

    if rcm is None or rcm.empty:
        logger.info("No race control messages for %s", race_id)
        return []

    laps_df = session.laps
    results = session.results

    events: list[RaceEvent] = []
    counters: dict[str, int] = {}

    # Track open SC/VSC events so we can pair start/end
    open_sc: RaceEvent | None = None
    open_vsc: RaceEvent | None = None

    for _, row in rcm.iterrows():
        message = str(row.get("Message", ""))
        msg_time = row.get("Time")
        racing_number = row.get("RacingNumber")
        lap_num = _message_to_lap(msg_time, laps_df)
        driver_abbrev = _driver_abbrev_from_number(racing_number, results)

        # --- Safety Car ---
        if _matches(message, _SC_DEPLOY_PATTERNS):
            key = "sc"
            counters[key] = counters.get(key, 0) + 1
            ev = RaceEvent(
                event_id=f"{race_id}-{key}-{counters[key]}",
                race_id=race_id,
                event_type="SAFETY_CAR",
                lap_start=lap_num,
                lap_end=lap_num,  # updated when we find the end message
                trigger_driver_id=driver_abbrev,
                details=message,
            )
            open_sc = ev
            events.append(ev)
            continue

        if _matches(message, _SC_END_PATTERNS) and open_sc is not None:
            open_sc.lap_end = lap_num
            open_sc = None
            continue

        # --- Virtual Safety Car ---
        if _matches(message, _VSC_DEPLOY_PATTERNS):
            key = "vsc"
            counters[key] = counters.get(key, 0) + 1
            ev = RaceEvent(
                event_id=f"{race_id}-{key}-{counters[key]}",
                race_id=race_id,
                event_type="VSC",
                lap_start=lap_num,
                lap_end=lap_num,
                trigger_driver_id=driver_abbrev,
                details=message,
            )
            open_vsc = ev
            events.append(ev)
            continue

        if _matches(message, _VSC_END_PATTERNS) and open_vsc is not None:
            open_vsc.lap_end = lap_num
            open_vsc = None
            continue

        # --- Red Flag ---
        if _matches(message, _RED_FLAG_PATTERNS):
            key = "rf"
            counters[key] = counters.get(key, 0) + 1
            ev = RaceEvent(
                event_id=f"{race_id}-{key}-{counters[key]}",
                race_id=race_id,
                event_type="RED_FLAG",
                lap_start=lap_num,
                lap_end=lap_num,
                trigger_driver_id=driver_abbrev,
                details=message,
            )
            events.append(ev)
            continue

        # --- Penalty ---
        if _matches(message, _PENALTY_PATTERNS):
            key = "pen"
            counters[key] = counters.get(key, 0) + 1
            penalty_secs = _extract_penalty_seconds(message)
            ev = RaceEvent(
                event_id=f"{race_id}-{key}-{counters[key]}",
                race_id=race_id,
                event_type="PENALTY",
                lap_start=lap_num,
                lap_end=lap_num,
                trigger_driver_id=driver_abbrev,
                details=message,
                penalty_seconds=penalty_secs,
            )
            events.append(ev)
            continue

        # --- Retirement ---
        if _matches(message, _RETIREMENT_PATTERNS):
            key = "ret"
            counters[key] = counters.get(key, 0) + 1
            ev = RaceEvent(
                event_id=f"{race_id}-{key}-{counters[key]}",
                race_id=race_id,
                event_type="RETIREMENT",
                lap_start=lap_num,
                lap_end=lap_num,
                trigger_driver_id=driver_abbrev,
                details=message,
            )
            events.append(ev)
            continue

    logger.info(
        "Parsed %d race events for %s (SC=%d, VSC=%d, RF=%d, PEN=%d, RET=%d)",
        len(events),
        race_id,
        counters.get("sc", 0),
        counters.get("vsc", 0),
        counters.get("rf", 0),
        counters.get("pen", 0),
        counters.get("ret", 0),
    )
    return events
