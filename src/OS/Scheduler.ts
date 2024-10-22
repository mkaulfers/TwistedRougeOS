import { ProcessState, RUNNING } from "Constants/ProcessStateConstants"
import { Task } from "Constants/TaskConstants"
import { Process } from "Models/Process"
export default class Scheduler {
    processQueue: Map<string, Process>
    pausedProcesses: Map<string, Process>

    addProcess(process: Process): void | ProcessState{
        if (this.processQueue.has(process.id)) return RUNNING
        this.processQueue.set(process.id, process)
    }

    increaseProcessPriorityFor(id: string) {
        this.processQueue.get(id)?.increasePriority()
        this.pausedProcesses.get(id)?.increasePriority()
    }

    resetProcessPriorityFor(id: string) {
        this.processQueue.get(id)?.restorePriority()
    }

    pauseProcess(id: string) {
        let runningProcess = this.processQueue.get(id)
        if (!runningProcess) return
        this.increaseProcessPriorityFor(runningProcess.id)
        this.pausedProcesses.set(runningProcess.id, runningProcess)
        this.processQueue.delete(id)
    }

    removeProcess(id: string) {
        this.processQueue.delete(id)
        this.pausedProcesses.delete(id)
    }

    resumeProcess(id: string) {
        let pausedProcesses = this.pausedProcesses.get(id)
        if (!pausedProcesses) return
        this.resetProcessPriorityFor(pausedProcesses.id)
        this.processQueue.set(pausedProcesses.id, pausedProcesses)
        this.pausedProcesses.delete(id)
    }

    swapProcess(creep: Creep, task: Task) {
        creep.memory.task = task
        delete creep.memory.target;
        this.removeProcess(creep.name)
    }

    constructor() {
        this.pausedProcesses = new Map<string, Process>()
        this.processQueue = new Map<string, Process>()
    }
}
