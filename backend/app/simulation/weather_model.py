from __future__ import annotations

from backend.app.simulation.position import DriverState


def get_compound_class(compound: str) -> str:
    if compound in ("SOFT", "MEDIUM", "HARD"):
        return "DRY"
    elif compound == "INTERMEDIATE":
        return "INTERMEDIATE"
    else:
        return "WET"


def compound_mismatch_penalty(
    driver: DriverState,
    surface_state: object,
) -> float:
    """Penalty for wrong tyre type for surface conditions."""
    driver_class = get_compound_class(driver.tyre_compound)
    valid_class = getattr(surface_state, "valid_compound_class", "DRY")
    water = getattr(surface_state, "surface_water_mm", 0.0)

    if driver_class == valid_class:
        return 0.0

    if driver_class == "DRY" and valid_class == "INTERMEDIATE":
        return 3.0 + (water - 0.3) * 4.0

    if driver_class == "DRY" and valid_class == "WET":
        return 15.0 + water * 2.0

    if driver_class == "INTERMEDIATE" and valid_class == "DRY":
        return 2.0 + max(0, 0.3 - water) * 5.0

    if driver_class == "INTERMEDIATE" and valid_class == "WET":
        return 2.0 + (water - 4.0) * 1.0

    if driver_class == "WET" and valid_class != "WET":
        return 4.0

    return 0.0
