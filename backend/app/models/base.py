import enum


class TyreCompound(str, enum.Enum):
    SOFT = "SOFT"
    MEDIUM = "MEDIUM"
    HARD = "HARD"
    INTERMEDIATE = "INTERMEDIATE"
    WET = "WET"


class EventType(str, enum.Enum):
    SAFETY_CAR = "SAFETY_CAR"
    VSC = "VSC"
    RED_FLAG = "RED_FLAG"
    RAIN_START = "RAIN_START"
    RAIN_STOP = "RAIN_STOP"
    PENALTY = "PENALTY"
    RETIREMENT = "RETIREMENT"
    MECHANICAL_FAILURE = "MECHANICAL_FAILURE"


class CompoundClass(str, enum.Enum):
    DRY = "DRY"
    INTERMEDIATE = "INTERMEDIATE"
    WET = "WET"


class DriverStatus(str, enum.Enum):
    FINISHED = "FINISHED"
    DNF = "DNF"
    DSQ = "DSQ"
    DNS = "DNS"
