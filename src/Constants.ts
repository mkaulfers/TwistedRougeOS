export const ALL = "All"
export const OFF = "Off"
export const TRACE = "[TRACE]"
export const DEBUG = "[DEBUG]"
export const INFO = "[INFO]"
export const WARN = "[WARN]"
export const ERROR = "[ERROR]"

export const LogLevels = [
    ALL,
    OFF,
    TRACE,
    DEBUG,
    INFO,
    WARN,
    ERROR
] as const

export type LogLevel = typeof LogLevels[number]

export const AGENT = "agent"
export const ANCHOR = "anchor"
export const ENGINEER = "engineer"
export const FILLER = "filler"
export const HARVESTER = "harvester"
export const SCIENTIST = "scientist"
export const TRUCKER = "trucker"
export const nENGINEER = "nEngineer"
export const nHARVESTER = "nHarvester"
export const nTRUCKER = "nTrucker"

export type Role =
    typeof AGENT |
    typeof ANCHOR |
    typeof ENGINEER |
    typeof FILLER |
    typeof HARVESTER |
    typeof SCIENTIST |
    typeof TRUCKER |
    typeof nENGINEER |
    typeof nHARVESTER |
    typeof nTRUCKER

export const Roles: Role[] = [
    AGENT,
    ANCHOR,
    ENGINEER,
    FILLER,
    HARVESTER,
    SCIENTIST,
    TRUCKER,
    nENGINEER,
    nHARVESTER,
    nTRUCKER
]

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
    INDIFFERENT,
    LOW,
    MEDIUM,
    MEDIUM_HIGH,
    MEDIUM_LOW
]

export const FAILED = "FAILED"
export const FATAL = "FATAL"
export const INCOMPLETE = "INCOMPLETE"
export const RUNNING = "RUNNING"
export const SUCCESS = "SUCCESS"

export type ProcessState =
    typeof FAILED |
    typeof FATAL |
    typeof INCOMPLETE |
    typeof RUNNING |
    typeof SUCCESS

export const ProcessStates: ProcessState[] = [
    FAILED,
    FATAL,
    INCOMPLETE,
    RUNNING,
    SUCCESS
]

export const EXTENSION = "ext_single"
export const EXTENSIONS = "extensions"
export const FAST_FILLER = "fast_filler"
export const HUB = "hub"
export const LABS = "labs"
export const OBSERVER = "observer"
export const TOWER = "tower_single"

export type StampType =
    typeof EXTENSION |
    typeof EXTENSIONS |
    typeof FAST_FILLER |
    typeof HUB |
    typeof LABS |
    typeof OBSERVER |
    typeof TOWER

export const StampTypes: StampType[] = [
    EXTENSION,
    EXTENSIONS,
    FAST_FILLER,
    HUB,
    LABS,
    OBSERVER,
    TOWER
]

export const PEACEFUL = 0
export const INVADERS = 1
export const WARY = 2
export const DANGER = 3
export const DEATH = 4

export type DangerLevel =
    typeof PEACEFUL |
    typeof INVADERS |
    typeof WARY |
    typeof DANGER |
    typeof DEATH

export const DangerLevels: DangerLevel[] = [
    PEACEFUL,
    INVADERS,
    WARY,
    DANGER,
    DEATH
]

export const ROUGEAYRN = "Rougeayrn"
export const XTWISTEDX = "xTwisteDx"

export type Developer =
    typeof ROUGEAYRN |
    typeof XTWISTEDX

export const Developers: Developer[] = [
    ROUGEAYRN,
    XTWISTEDX
]

export const BOTH = "both"
export const INPUT = "input"
export const OUTPUT = "output"

export type LinkState =
    typeof BOTH |
    typeof INPUT |
    typeof OUTPUT

export const LinkStates: LinkState[] = [
    BOTH,
    INPUT,
    OUTPUT
]

