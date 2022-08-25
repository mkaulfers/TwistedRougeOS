import { Process } from "../../Models/Process"
import { Logger } from "../../utils/Logger";
import { Role, Task, ProcessPriority, ProcessResult, LogLevel } from '../../utils/Enums'

export function schedulePixelSale() {
    let pixelSaleProcessId = "generate_pixels"
    if (global.scheduler.processQueue.has(pixelSaleProcessId)) { return }

    const pixelSaleTask = () => {
        if (!mmoShardNames.has(Game.shard.name)) return false
        if (Game.cpu.bucket != 10000) return false
        return Game.cpu.generatePixel()
    }

    let newProcess = new Process(pixelSaleProcessId, ProcessPriority.INDIFFERENT, pixelSaleTask)
    global.scheduler.addProcess(newProcess)
}

const mmoShardNames = new Set([
    'shard0',
    'shard1',
    'shard2',
    'shard3'
])

export function scheduleMemoryMonitor(): void | ProcessResult {

    const memoryTask = () => {
        cleanupDeadCreeps()
        cleanupDeadRooms()
    }

    let process = new Process('memory_monitor', ProcessPriority.CRITICAL, memoryTask)
    global.scheduler.addProcess(process)
}

function cleanupDeadCreeps() {
    for (const name in Memory.creeps) {
        if (!Game.creeps[name]) {
            Logger.log(`Removing dead creep: ${name}`, LogLevel.INFO)
            global.scheduler.removeProcess(name)
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



