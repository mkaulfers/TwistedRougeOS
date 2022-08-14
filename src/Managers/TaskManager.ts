import { Process } from "Models/Process"
import { Task, ProcessPriority } from "utils/Enums"
import { Logger, LogLevel } from "utils/Logger"


Room.prototype.scheduleTasks = function () {
    Logger.log("Room -> setupTasks()", LogLevel.TRACE)
    schedulePixelSale()
    scheduleRoomMonitor(this)
    scheduleCreepTask(this)
}

function scheduleCreepTask(room: Room) {
    let creeps = _.filter(Game.creeps, (c) => c.room.name === room.name)
    for (let i = 0; i < creeps.length; i++) {
        let creep = creeps[i]
        if (global.scheduler.processQueue.has(creep.id)) { return }

        switch (creep.memory.task as Task) {
            case Task.HARVESTER_EARLY:
                harvesterEarlyTask(creep)
                break
            case Task.HARVESTER_SOURCE:
                harvesterSource(creep)
                break
            case Task.TRUCKER_HARVESTER:
                truckerHarvester(creep)
                break
            case Task.TRUCKER_SCIENTIST:
                truckerScientist(creep)
                break
            case Task.TRUCKER_STORAGE:
                truckerStorage(creep)
                break
            case Task.SCIENTIST_UPGRADING:
                scientistUpgrading(creep)
                break
            case Task.ENGINEER_BUILDING:
                engineerBuilding(creep)
                break
            case Task.ENGINEER_REPAIRING:
                engineerRepairing(creep)
                break
            case Task.ENGINEER_UPGRADING:
                engineerUpgrading(creep)
                break
        }
    }
}

function harvesterEarlyTask(creep: Creep) {
    let creepId = creep.id

    const earlyTask = () => {
        let creep = Game.creeps[creepId]
    }

    let newProcess = new Process(creepId, ProcessPriority.LOW, earlyTask)
    global.scheduler.addProcess(newProcess)
}

function harvesterSource(creep: Creep) {
    let creepId = creep.id

    const sourceTask = () => {
        let creep = Game.creeps[creepId]
    }

    let newProcess = new Process(creepId, ProcessPriority.LOW, sourceTask)
    global.scheduler.addProcess(newProcess)
}

function truckerHarvester(creep: Creep) {
    let creepId = creep.id

    const harvesterTask = () => {
        let creep = Game.creeps[creepId]
    }

    let newProcess = new Process(creepId, ProcessPriority.LOW, harvesterTask)
    global.scheduler.addProcess(newProcess)
}

function truckerScientist(creep: Creep) {
    let creepId = creep.id

    const scientistTask = () => {
        let creep = Game.creeps[creepId]
    }

    let newProcess = new Process(creepId, ProcessPriority.LOW, scientistTask)
    global.scheduler.addProcess(newProcess)
}

function truckerStorage(creep: Creep) {
    let creepId = creep.id

    const storageTask = () => {
        let creep = Game.creeps[creepId]
    }

    let newProcess = new Process(creepId, ProcessPriority.LOW, storageTask)
    global.scheduler.addProcess(newProcess)
}

function scientistUpgrading(creep: Creep) {
    let creepId = creep.id

    const upgradingTask = () => {
        let creep = Game.creeps[creepId]
    }

    let newProcess = new Process(creepId, ProcessPriority.LOW, upgradingTask)
    global.scheduler.addProcess(newProcess)
}

function engineerBuilding(creep: Creep) {
    let creepId = creep.id

    const buildingTask = () => {
        let creep = Game.creeps[creepId]
    }

    let newProcess = new Process(creepId, ProcessPriority.LOW, buildingTask)
    global.scheduler.addProcess(newProcess)
}

function engineerRepairing(creep: Creep) {
    let creepId = creep.id

    const repairingTask = () => {
        let creep = Game.creeps[creepId]
    }

    let newProcess = new Process(creepId, ProcessPriority.LOW, repairingTask)
    global.scheduler.addProcess(newProcess)
}

function engineerUpgrading(creep: Creep) {
    let creepId = creep.id

    const upgradingTask = () => {
        let creep = Game.creeps[creepId]
    }

    let newProcess = new Process(creepId, ProcessPriority.LOW, upgradingTask)
    global.scheduler.addProcess(newProcess)
}

function schedulePixelSale() {
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


function scheduleRoomMonitor(room: Room) {
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
