import { Logger } from "utils/Logger"
import { Process } from "../Models/Process"
import { Managers } from "Managers/Index"
import { ERROR, TRACE } from "Constants/LogConstants"
import { ProcessPriorities } from "Constants/ProcessPriorityConstants"
import { SUCCESS, FATAL, RUNNING, FAILED, INCOMPLETE } from "Constants/ProcessStateConstants"

export default class Kernel {
    executeProcesses() {
        for (let [, value] of global.scheduler.processQueue) {
            let start = Game.cpu.getUsed()
            let result = value.run()
            let end = Game.cpu.getUsed()

            value.cpuUsedHistory.push(end - start)

            //Locking the history to a max of 30 entries.
            //Statistically this value is enough to get a realiable average that can be trusted.
            if (value.cpuUsedHistory.length > 30) {
                value.cpuUsedHistory.shift()
            }

            switch (result) {
                case SUCCESS:
                case FATAL:
                    global.scheduler.removeProcess(value.id)
                    break
                case RUNNING:
                    global.scheduler.resetProcessPriorityFor(value.id)
                    break
                case FAILED:
                    Logger.log(`Process ${value.id} failed.`, ERROR)
                case INCOMPLETE:
                    global.scheduler.increaseProcessPriorityFor(value.id)
                    break
            }
        }
    }

    estimatedQueueCpuCost() {
        let cost = 0
        for (const [, value] of global.scheduler.processQueue) {
            cost += value.getAvgCpuUsed()
        }
        return cost
    }

    loadProcesses() {
        Logger.log("Kernel -> loadProcesses()", TRACE)

        for (let rmName in Game.rooms) {
            let room = Game.rooms[rmName]
            if (room.controller && room.controller.my) {
                room.scheduleTasks()
            } else if (room.controller) {
                // room.loadOwnedProcesses()
            }
        }

        Managers.DataManager.scheduleMemoryMonitor();
        Managers.DataManager.scheduleCacheMonitor();
        Managers.Visuals.visualsHandler();


    }

    sortProcesses() {
        Logger.log("Kernel -> sortProcesses()", TRACE)
        let queue: Map<string, Process> = new Map([...global.scheduler.processQueue.entries()].sort((a, b) =>
            ProcessPriorities.indexOf(a[1].currentPriority) -
            ProcessPriorities.indexOf(b[1].currentPriority)
        ))

        global.scheduler.processQueue = queue

        let availCPU = Game.cpu.limit
        let availBucket = Game.cpu.bucket
        let estimatedCPU = this.estimatedQueueCpuCost()

        if (estimatedCPU > availCPU + (availBucket >= 500 ? 500 : availBucket)) {
            let queueToRun: Map<string, Process> = new Map()

            for (let [, value] of queue) {
                queueToRun.set(value.id, value)
                let tempQueueCpuCost = 0

                for (let [, value] of queueToRun) {
                    tempQueueCpuCost += value.getAvgCpuUsed()
                }

                if (tempQueueCpuCost >  availCPU + (availBucket >= 500 ? 500 : availBucket)) {
                    global.scheduler.pauseProcess(value.id)
                } else {
                    global.scheduler.resumeProcess(value.id)
                }
            }
        }
    }

    constructor() {}
}
