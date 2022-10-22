export const AGENT_SCOUTING = "agent_scouting"
export const ANCHOR_WORKING = "anchor_working"
export const ENGINEER_BUILDING = "engineer_building"
export const ENGINEER_REPAIRING = "engineer_repairing"
export const ENGINEER_UPGRADING = "engineer_upgrading"
export const FILLER_WORKING = "filler_working"
export const HARVESTER_EARLY = "harvester_early"
export const HARVESTER_SOURCE = "harvester_source"
export const SCIENTIST_UPGRADING = "scientist_upgrading"
export const TRUCKER_SCIENTIST = "trucker_scientist"
export const TRUCKER_STORAGE = "trucker_storage"
export const nHARVESTING_EARLY = "nHarvesting_early"
export const nHARVESTING_LATE = "nHarvesting_late"
export const nTRUCKER_TRANSPORTING = "nTrucker_transporting"

export type Task =
    typeof AGENT_SCOUTING |
    typeof ANCHOR_WORKING |
    typeof ENGINEER_BUILDING |
    typeof ENGINEER_REPAIRING |
    typeof ENGINEER_UPGRADING |
    typeof FILLER_WORKING |
    typeof HARVESTER_EARLY |
    typeof HARVESTER_SOURCE |
    typeof SCIENTIST_UPGRADING |
    typeof TRUCKER_SCIENTIST |
    typeof TRUCKER_STORAGE |
    typeof nHARVESTING_EARLY |
    typeof nHARVESTING_LATE |
    typeof nTRUCKER_TRANSPORTING

export const Tasks: Task[] = [
    AGENT_SCOUTING,
    ANCHOR_WORKING,
    ENGINEER_BUILDING,
    ENGINEER_REPAIRING,
    ENGINEER_UPGRADING,
    FILLER_WORKING,
    HARVESTER_EARLY,
    HARVESTER_SOURCE,
    SCIENTIST_UPGRADING,
    TRUCKER_SCIENTIST,
    TRUCKER_STORAGE,
    nHARVESTING_EARLY,
    nHARVESTING_LATE,
    nTRUCKER_TRANSPORTING
]
