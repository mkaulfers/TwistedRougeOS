import { Logger } from "utils/Logger"
import { Process } from "../Models/Process"
import { Role, Task, ProcessPriority, ProcessResult, LogLevel } from '../utils/Enums'

export default class Kernel {
    executeProcesses() {
        for (let [, value] of global.scheduler.processQueue) {
            let start = Game.cpu.getUsed()
            let result = value.run()
            let end = Game.cpu.getUsed()
            value.cpuUsedHistory.push(end - start)

            switch (result) {
                case ProcessResult.SUCCESS:
                    global.scheduler.removeProcess(value.id)
                    break
                case ProcessResult.RUNNING:
                    global.scheduler.resetProcessPriorityFor(value.id)
                    break
                case ProcessResult.FAILED:
                    Logger.log(`Process ${value.id} failed.`, LogLevel.FATAL)
                case ProcessResult.INCOMPLETE:
                    global.scheduler.increaseProcessPriorityFor(value.id)
                    break
            }
        }
    }

    estimatedQueueCpuCost() {
        let cost = 0
        for (let [, value] of global.scheduler.processQueue) {
            cost += value.getAvgCpuUsed()
        }
        return cost
    }

    loadProcesses() {
        Logger.log("Kernel -> loadProcesses()", LogLevel.TRACE)

        for (let rmName in Game.rooms) {
            let room = Game.rooms[rmName]
            if (room.controller && room.controller.my) {
                room.scheduleTasks()
            } else if (room.controller) {
                // room.loadOwnedProcesses()
            } else {
                //Handle market processes.
            }
        }
    }

    sortProcesses() {
        Logger.log("Kernel -> sortProcesses()", LogLevel.TRACE)
        let queue: Map<string, Process> = new Map([...global.scheduler.processQueue.entries()].sort((a, b) =>
            Object.values(ProcessPriority).indexOf(a[1].currentPriority) -
            Object.values(ProcessPriority).indexOf(b[1].currentPriority)
        ))
        global.scheduler.processQueue = queue
    }

    constructor() {}
}
