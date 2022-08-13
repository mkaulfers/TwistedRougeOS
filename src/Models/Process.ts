export class Process {
    id: string
    run: () => ProcessResult
    cpuUsedHistory: number[]

    currentPriority: ProcessPriority
    private initialPriority: ProcessPriority

    constructor(id: string, setPriority: ProcessPriority, task: (arg0?: any) => any) {
        this.id = id
        this.initialPriority = setPriority
        this.currentPriority = setPriority
        this.run = task
        this.cpuUsedHistory = []
    }

    getAvgCpuUsed(): number {
        let totalCpuUsed = 0
        for (let i = 0; i < this.cpuUsedHistory.length; i++) {
            totalCpuUsed += this.cpuUsedHistory[i]
        }
        return totalCpuUsed / this.cpuUsedHistory.length
    }

    increasePriority() {
        switch (this.currentPriority) {
            case ProcessPriority.INDIFFERENT:
                this.currentPriority = ProcessPriority.LOW
                break
            case ProcessPriority.LOW:
                this.currentPriority = ProcessPriority.MEDIUM_LOW
                break
            case ProcessPriority.MEDIUM_LOW:
                this.currentPriority = ProcessPriority.MEDIUM
                break
            case ProcessPriority.MEDIUM:
                this.currentPriority = ProcessPriority.MEDIUM_HIGH
                break
            case ProcessPriority.MEDIUM_HIGH:
                this.currentPriority = ProcessPriority.HIGH
                break
            case ProcessPriority.HIGH:
                this.currentPriority = ProcessPriority.CRITICAL
                break
            default:
                console.log("Process with id, " + this.id + " marked critical.")
        }
    }

    restorePriority() {
        this.currentPriority = this.initialPriority
    }

    toString() {
        return `Process ID:       | ${this.id}\nCurrent Priority: | ${this.currentPriority}\nCPU Used:         | ${this.getAvgCpuUsed()}\n`
    }
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
    RUNNING = "RUNNING",
    FAILED = "FAILED",
    INCOMPLETE = "INCOMPLETE"
}
