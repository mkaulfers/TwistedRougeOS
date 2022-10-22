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
