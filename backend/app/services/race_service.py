from sqlalchemy.orm import Session, joinedload, subqueryload

from backend.app.models import DriverEntry, Race


def list_races(year: int | None, limit: int, db: Session) -> dict:
    """List races. Returns dict with 'races' list and 'available_years'."""
    query = db.query(Race).options(
        joinedload(Race.circuit),
        subqueryload(Race.driver_entries),
        subqueryload(Race.race_events),
        subqueryload(Race.weather_samples),
    )
    if year:
        query = query.filter(Race.year == year)
    races = query.order_by(Race.year.desc(), Race.round_number).limit(limit).all()

    # For each race compute: winner info, disruption_tags
    result = []
    for race in races:
        winner = next(
            (e for e in race.driver_entries if e.finish_position == 1), None
        )
        tags: list[str] = []
        for event in race.race_events:
            if event.event_type == "SAFETY_CAR" and "safety_car" not in tags:
                tags.append("safety_car")
            elif event.event_type == "VSC" and "vsc" not in tags:
                tags.append("vsc")
            elif event.event_type == "RED_FLAG" and "red_flag" not in tags:
                tags.append("red_flag")
        # Check for rain
        rain_samples = [ws for ws in race.weather_samples if ws.is_raining]
        if rain_samples:
            tags.insert(0, "rain")

        result.append(
            {
                "race_id": race.race_id,
                "name": race.name,
                "circuit_name": race.circuit.name,
                "country": race.circuit.country,
                "year": race.year,
                "round_number": race.round_number,
                "date": race.date.strftime("%Y-%m-%d") if race.date else None,
                "total_laps": race.total_laps,
                "winner_driver_id": winner.driver_id if winner else None,
                "winner_name": winner.driver_name if winner else None,
                "winner_team_color": winner.team_color if winner else None,
                "disruption_tags": tags,
            }
        )

    years = sorted(
        set(r.year for r in db.query(Race.year).distinct()), reverse=True
    )
    return {"races": result, "available_years": years}


def get_race_detail(race_id: str, db: Session) -> dict | None:
    """Get full race detail."""
    race = (
        db.query(Race)
        .options(
            joinedload(Race.circuit),
            subqueryload(Race.driver_entries).subqueryload(DriverEntry.pit_stops),
            subqueryload(Race.driver_entries).subqueryload(DriverEntry.laps),
            subqueryload(Race.race_events),
            subqueryload(Race.weather_samples),
        )
        .filter(Race.race_id == race_id)
        .first()
    )

    if not race:
        return None

    # Build driver entries with pit stops and computed stints
    drivers = []
    for entry in sorted(
        race.driver_entries, key=lambda e: e.finish_position or 99
    ):
        pit_stops = [
            {
                "stop_number": ps.stop_number,
                "lap_number": ps.lap_number,
                "stop_duration_seconds": ps.stop_duration_seconds,
                "tyre_from": ps.tyre_compound_from,
                "tyre_to": ps.tyre_compound_to,
                "was_under_sc": ps.was_under_sc,
            }
            for ps in entry.pit_stops
        ]

        # Compute stints
        stints = _compute_stints(entry)

        drivers.append(
            {
                "entry_id": entry.entry_id,
                "driver_id": entry.driver_id,
                "driver_name": entry.driver_name,
                "team_id": entry.team_id,
                "team_name": entry.team_name,
                "team_color": entry.team_color,
                "driver_number": entry.driver_number,
                "grid_position": entry.grid_position,
                "finish_position": entry.finish_position,
                "status": entry.status,
                "points_scored": entry.points_scored,
                "pit_stops": pit_stops,
                "stints": stints,
            }
        )

    events = [
        {
            "event_id": e.event_id,
            "event_type": e.event_type,
            "lap_start": e.lap_start,
            "lap_end": e.lap_end,
            "trigger_driver_id": e.trigger_driver_id,
            "details": e.details,
        }
        for e in race.race_events
    ]

    # Weather summary
    rain_laps = [ws.lap_number for ws in race.weather_samples if ws.is_raining]
    avg_air = (
        sum(ws.air_temp_celsius for ws in race.weather_samples)
        / len(race.weather_samples)
        if race.weather_samples
        else 0
    )
    avg_track = (
        sum(ws.track_temp_celsius for ws in race.weather_samples)
        / len(race.weather_samples)
        if race.weather_samples
        else 0
    )
    max_rain = max(
        (ws.rainfall_intensity_mm_hr for ws in race.weather_samples), default=0
    )

    return {
        "race": {
            "race_id": race.race_id,
            "name": race.name,
            "circuit": {
                "circuit_id": race.circuit.circuit_id,
                "name": race.circuit.name,
                "track_length_km": race.circuit.track_length_km,
                "pit_loss_seconds": race.circuit.pit_loss_seconds,
                "overtake_difficulty": race.circuit.overtake_difficulty,
                "drs_zones": race.circuit.drs_zones,
            },
            "year": race.year,
            "round_number": race.round_number,
            "date": race.date.strftime("%Y-%m-%d") if race.date else None,
            "total_laps": race.total_laps,
        },
        "drivers": drivers,
        "events": events,
        "weather_summary": {
            "avg_air_temp_celsius": round(avg_air, 1),
            "avg_track_temp_celsius": round(avg_track, 1),
            "rain_laps": rain_laps,
            "max_rainfall_mm_hr": max_rain,
        },
    }


def _compute_stints(entry: DriverEntry) -> list[dict]:
    """Compute stints from lap data."""
    stints: list[dict] = []
    current: dict | None = None
    sorted_laps = sorted(entry.laps, key=lambda lap: lap.lap_number)

    for lap in sorted_laps:
        if current is None or lap.tyre_compound != current["compound"]:
            if current:
                current["end_lap"] = lap.lap_number - 1
                current["laps"] = current["end_lap"] - current["start_lap"] + 1
                stints.append(current)
            current = {
                "compound": lap.tyre_compound,
                "start_lap": lap.lap_number,
                "end_lap": 0,
                "laps": 0,
            }
    if current:
        current["end_lap"] = (
            sorted_laps[-1].lap_number if sorted_laps else current["start_lap"]
        )
        current["laps"] = current["end_lap"] - current["start_lap"] + 1
        stints.append(current)
    return stints


def get_race_laps(
    race_id: str,
    db: Session,
    driver_id: str | None = None,
    lap_start: int | None = None,
    lap_end: int | None = None,
) -> dict | None:
    """Get lap data for a race, optionally filtered by driver and lap range."""
    race = (
        db.query(Race)
        .options(subqueryload(Race.driver_entries).subqueryload(DriverEntry.laps))
        .filter(Race.race_id == race_id)
        .first()
    )
    if not race:
        return None

    result: dict[str, list] = {}
    for entry in race.driver_entries:
        if driver_id and entry.driver_id != driver_id:
            continue
        laps = []
        for lap in sorted(entry.laps, key=lambda l: l.lap_number):
            if lap_start and lap.lap_number < lap_start:
                continue
            if lap_end and lap.lap_number > lap_end:
                continue
            laps.append(
                {
                    "lap_number": lap.lap_number,
                    "lap_time_seconds": lap.lap_time_seconds,
                    "sector1_seconds": lap.sector1_seconds,
                    "sector2_seconds": lap.sector2_seconds,
                    "sector3_seconds": lap.sector3_seconds,
                    "tyre_compound": lap.tyre_compound,
                    "tyre_age": lap.tyre_age,
                    "position": lap.position,
                    "gap_to_leader_seconds": lap.gap_to_leader_seconds,
                    "interval_seconds": lap.interval_seconds,
                    "is_under_sc": lap.is_under_sc,
                    "is_under_vsc": lap.is_under_vsc,
                }
            )
        result[entry.driver_id] = laps
    return {"laps": result}
