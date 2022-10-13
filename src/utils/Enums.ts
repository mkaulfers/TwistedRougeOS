export enum Role {
    HARVESTER = 'harvester',
    TRUCKER = 'trucker',
    AGENT = 'agent',
    FILLER = 'filler',
    ANCHOR = 'anchor',
    nHARVESTER = 'nHarvester',
    nTRUCKER = 'nTrucker',
    nENGINEER = 'nEngineer',
    ENGINEER = 'engineer',
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

    AGENT = 'agent',
    nHARVESTING = 'nHarvesting',
    nTRUCKER = 'nTrucker',
    ANCHOR = 'anchor'
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
    /** #00ff00 - Start Here. */
    PEACEFUL = 0,
    /** #ccff33 - Invaders or Invader Cores. */
    INVADERS = 1,
    /** #ffff1a - Any threat greater than Invaders (e.g. Invader Base, player). */
    WARY = 2,
    /** #ff9900 - 1800 Damage Output Potential. */
    DANGER = 3,
    /** #ff0000 - 3600 Damage Output Potential. */
    DEATH = 4,
}

export enum Developer {
    ROUGEAYRN = 'Rougeayrn',
    XTWISTEDX = 'xTwisteDx'
}

export enum LinkState {
    INPUT = 'input',
    OUTPUT = 'output',
    BOTH = 'both'
}
