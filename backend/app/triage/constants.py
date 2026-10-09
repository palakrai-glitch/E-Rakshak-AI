from enum import Enum

class PriorityLevel(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MODERATE = "MODERATE"
    LOW = "LOW"

class DataCompleteness(str, Enum):
    AVAILABLE = "AVAILABLE" # Good amount of data (vitals + observations)
    PARTIAL = "PARTIAL"     # Some data (e.g. observations but no vitals)
    LIMITED = "LIMITED"     # Bare minimum (only complaint)

# Priority thresholds based on calculated score
PRIORITY_THRESHOLDS = {
    PriorityLevel.CRITICAL: 80,
    PriorityLevel.HIGH: 50,
    PriorityLevel.MODERATE: 20,
    PriorityLevel.LOW: 0,
}

DISCLAIMER_TEXT = "Preliminary operational priority based on reported information. This assessment is not a medical diagnosis or treatment recommendation."
