import { Process } from "Models/Process"
import { Logger, LogLevel } from "utils/Logger"
import { ProcessPriority, ProcessResult } from "utils/Enums"

export function loadMemoryProcesses(): void | ProcessResult {
    let process = new Process('cleanup_memory', ProcessPriority.INDIFFERENT, cleanupMemory)
    global.scheduler.addProcess(process)
}

const cleanupMemory = () => {
    cleanupDeadCreeps()
    cleanupDeadRooms()
}

function cleanupDeadCreeps() {
    for (const name in Memory.creeps) {
        if (!Game.creeps[name]) {
            Logger.log(`Removing dead creep: ${name}`, LogLevel.INFO)
            global.scheduler.removeProcess(Memory.creeps[name].taskId)
            delete Memory.creeps[name]
        }
    }
    Logger.log(`No creep memory removed.`, LogLevel.TRACE)
}

function cleanupDeadRooms() {
    for (const name in Memory.rooms) {
        if (!Game.rooms[name]) {
            Logger.log(`Removing dead room: ${name}`, LogLevel.INFO)
            delete Memory.rooms[name]
        }
    }
    Logger.log(`No room memory removed.`, LogLevel.TRACE)
}
