import { Process, ProcessPriority, ProcessResult } from "Models/Process"
import { loadMemoryProcesses } from "Extensions/Memory"
import { Logger, LogLevel } from "utils/Logger"

export class Kernel {
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
                case ProcessResult.FAILED || ProcessResult.INCOMPLETE:
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

    loadMemory() {
        //On global reset, load saved kernel memory.
    }

    loadProcesses() {
        Logger.log("Kernel -> loadProcesses()", LogLevel.TRACE)
        loadMemoryProcesses()

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
