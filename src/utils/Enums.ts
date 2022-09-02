export enum Role {
    HARVESTER = 'harvester',
    TRUCKER = 'trucker',
    ENGINEER = 'engineer',
    FILLER = 'filler',
    NETWORK_HARVESTER = 'network_harvester',
    NETWORK_HAULER = 'network_hauler',
    NETWORK_ENGINEER = 'network_engineer',
    SCIENTIST = 'scientist'
}

export enum Task {
    HARVESTER_EARLY = 'harvester_early',
    HARVESTER_SOURCE = 'harvester_source',

    TRUCKER_STORAGE = 'trucker_storage',
    TRUCKER_SCIENTIST = 'trucker_scientist',

    SCIENTIST_UPGRADING = 'scientist_upgrading',

    ENGINEER_BUILDING = 'engineer_building',
    ENGINEER_REPAIRING = 'engineer_repairing',
    ENGINEER_UPGRADING = 'engineer_upgrading',

    FILLER = 'filler_working',
}

export enum ProcessPriority {
    CRITICAL = 'Critical',
    HIGH = 'High',
    MEDIUM_HIGH = 'Medium High',
    MEDIUM = 'Medium',
    MEDIUM_LOW = 'Medium Low',
    LOW = 'Low',
    INDIFFERENT = 'Indifferent'
}

export enum ProcessResult {
    SUCCESS = "SUCCESS",
    FAILED = "FAILED",
    RUNNING = 'RUNNING',
    INCOMPLETE = "INCOMPLETE"
}

export enum LogLevel {
    ALL,
    OFF,
    TRACE = "[TRACE]:",
    DEBUG = "[DEBUG]:",
    INFO = "[INFO]:",
    WARN = "[WARN]:",
    ERROR = "[ERROR]:",
    FATAL = "[FATAL]:",
}

export enum StampType {
    FAST_FILLER = 'fast_filler',
    EXTENSIONS = 'extensions',
    LABS = 'labs',
    ANCHOR = 'anchor',
    OBSERVER = 'observer',
    TOWER = 'tower_single',
    EXTENSION = 'ext_single'
}

export enum DangerLevel {
    PEACEFUL = 5,               // #00ff00
    INVADERS = 4,               // #ccff33
    WARY = 3,                   // #ffff1a
    DANGER = 2,                 // #ff9900
    NUKETHIS = 1,               // #ff0000
}

export enum LinkState {
    INPUT = 'input',
    OUTPUT = 'output',
    BOTH = 'both'
}
