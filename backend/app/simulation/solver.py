from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from backend.app.models import Race, Scenario

from backend.app.simulation.engine import simulate


@dataclass
class GoalQuery:
    goal_type: str  # "beat", "win", "podium", "points", "position"
    driver: str  # 3-letter code
    target_driver: str | None = None
    target_position: int | None = None
    parameter: str = "pace_offset"  # which variable to search
    search_range: tuple[float, float] = (-1.0, 1.0)


@dataclass
class SolverResult:
    threshold_value: float
    parameter: str
    scenario: object
    sim_result: dict
    is_feasible: bool


def check_goal_met(result: dict, goal: GoalQuery) -> bool:
    """Check if the simulation result achieves the goal."""
    finish = result["finish_order"]

    if goal.driver not in finish:
        return False

    driver_pos = finish.index(goal.driver) + 1

    if goal.goal_type == "win":
        return driver_pos == 1

    elif goal.goal_type == "podium":
        return driver_pos <= 3

    elif goal.goal_type == "beat":
        if goal.target_driver not in finish:
            return True  # target DNF'd
        target_pos = finish.index(goal.target_driver) + 1
        return driver_pos < target_pos

    elif goal.goal_type == "position":
        return driver_pos <= (goal.target_position or 10)

    return False


def build_scenario_with_param(
    race: Race,
    goal: GoalQuery,
    value: float,
) -> Scenario:
    """Build a scenario with the search parameter set to value."""
    from backend.app.models import Scenario as ScenarioModel

    scenario = ScenarioModel(
        scenario_id=f"solver-{goal.driver}-{goal.parameter}",
        race_id=race.race_id,
    )

    if goal.parameter == "pace_offset":
        scenario.driver_overrides = {
            goal.driver: {"pace_offset_seconds": value}
        }
    elif goal.parameter == "pit_lap_1":
        # Modify first pit stop lap
        scenario.pit_overrides = {
            goal.driver: {
                "stops": [{"lap": int(value), "compound_to": "HARD"}]
            }
        }

    return scenario


def assess_feasibility(
    threshold: float,
    parameter: str,
    race: Race,
) -> bool:
    """Heuristic: is the required change realistic?"""
    if parameter == "pace_offset":
        return abs(threshold) < 0.5  # up to 0.5s/lap is conceivable
    elif parameter == "pit_lap_1":
        return 1 <= threshold <= race.total_laps
    return True


def solve_goal_query(race: Race, goal: GoalQuery) -> SolverResult:
    """Binary search over a parameter to find the threshold for a goal."""
    lo, hi = goal.search_range

    for _ in range(20):
        mid = (lo + hi) / 2.0
        scenario = build_scenario_with_param(race, goal, mid)
        result = simulate(race, scenario)

        if check_goal_met(result, goal):
            hi = mid
        else:
            lo = mid

    threshold = round((lo + hi) / 2.0, 3)
    final_scenario = build_scenario_with_param(race, goal, threshold)
    final_result = simulate(race, final_scenario)

    return SolverResult(
        threshold_value=threshold,
        parameter=goal.parameter,
        scenario=final_scenario,
        sim_result=final_result,
        is_feasible=assess_feasibility(threshold, goal.parameter, race),
    )
