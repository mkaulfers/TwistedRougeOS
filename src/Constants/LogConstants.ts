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
