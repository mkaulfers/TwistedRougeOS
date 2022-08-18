import { Process } from "../../Models/Process"
import { ProcessPriority } from "../../utils/Enums"

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

export function scheduleThreatMonitor(room: Room) {
    let roomName = room.name
    let roomProcessId = roomName + "_threat_monitor"
    if (global.scheduler.processQueue.has(roomProcessId)) { return }

    const monitorTask = () => {
        let room = Game.rooms[roomName]
        let controller = room.controller
        if (!controller) return
        if (room.controller?.my)
            if (controller.safeModeCooldown) return
        if (!controller.safeModeAvailable) return
        if (controller.upgradeBlocked > 0) return

        const enemyAttackers = room.find(FIND_HOSTILE_CREEPS)
        const nonInvaderAttackers = enemyAttackers.filter(enemyAttacker => enemyAttacker.owner.username != 'Invader')
        if (!nonInvaderAttackers.length) return

        const eventLog = room.getEventLog()
        for (const eventItem of eventLog) {

            if (eventItem.event != EVENT_ATTACK) continue

            const attackTarget = Game.getObjectById(eventItem.data.targetId as Id<Structure>)
            if (attackTarget != null && !attackTarget.structureType) continue
            controller.activateSafeMode()
            break
        }
    }

    let newProcess = new Process(roomProcessId, ProcessPriority.LOW, monitorTask)
    global.scheduler.addProcess(newProcess)
}
