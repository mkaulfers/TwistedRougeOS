export enum Role {
    HARVESTER = 'harvester',
    TRUCKER = 'trucker',
    SCIENTIST = 'scientist',
    ENGINEER = 'engineer'
}

export enum Task {
    HARVESTER_EARLY = 'harvester_early',
    HARVESTER_SOURCE = 'harvester_source',

    TRUCKER_HARVESTER = 'trucker_harvester',
    TRUCKER_SCIENTIST = 'trucker_scientist',
    TRUCKER_STORAGE = 'trucker_storage',

    SCIENTIST_UPGRADING = 'scientist_upgrading',

    ENGINEER_BUILDING = 'engineer_building',
    ENGINEER_REPAIRING = 'engineer_repairing',
    ENGINEER_UPGRADING = 'engineer_upgrading'
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


