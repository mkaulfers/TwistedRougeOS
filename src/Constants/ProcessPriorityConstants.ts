export const CRITICAL = "Critical"
export const HIGH = "High"
export const INDIFFERENT = "Indifferent"
export const LOW = "Low"
export const MEDIUM = "Medium"
export const MEDIUM_HIGH = "Medium High"
export const MEDIUM_LOW = "Medium Low"

export type ProcessPriority =
    typeof CRITICAL |
    typeof HIGH |
    typeof INDIFFERENT |
    typeof LOW |
    typeof MEDIUM |
    typeof MEDIUM_HIGH |
    typeof MEDIUM_LOW

export const ProcessPriorities: ProcessPriority[] = [
    CRITICAL,
    HIGH,
    MEDIUM_HIGH,
    MEDIUM,
    MEDIUM_LOW,
    LOW,
    INDIFFERENT,
]
