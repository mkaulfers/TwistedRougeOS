import { Process } from "../Models/Process"
import { Logger } from "../utils/Logger";
import { Role, Task, ProcessPriority, ProcessResult, LogLevel } from '../utils/Enums'

export default class UtilityManager {
    static schedulePixelSale() {
        let pixelSaleProcessId = "generate_pixels"
        if (global.scheduler.processQueue.has(pixelSaleProcessId)) { return }

        const pixelSaleTask = () => {
            if (!this.mmoShardNames.has(Game.shard.name)) return false
            if (Game.cpu.bucket != 10000) return false
            return Game.cpu.generatePixel()
        }

        let newProcess = new Process(pixelSaleProcessId, ProcessPriority.INDIFFERENT, pixelSaleTask)
        global.scheduler.addProcess(newProcess)
    }

    static mmoShardNames = new Set([
        'shard0',
        'shard1',
        'shard2',
        'shard3'
    ])
}










