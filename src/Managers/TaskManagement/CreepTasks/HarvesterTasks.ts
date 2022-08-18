import { Utils } from "utils/Index"
import { Process } from "../../../Models/Process"

export function harvesterEarlyTask(creep: Creep) {
    let creepId = creep.id

    const earlyTask = () => {
        Utils.Logger.log("CreepTask -> earlyTask()", LogLevel.TRACE)
        let creep = Game.getObjectById(creepId)
        if (!creep) return ProcessResult.FAILED

        let closestSource: Source | undefined = undefined

        if (!creep.memory.assignedPos) {
            closestSource = unrealizedHarvestingSource(creep)
        } else {
            closestSource = Utils.Utility.unpackPostionToRoom(creep.memory.assignedPos, creep.memory.homeRoom).findInRange(FIND_SOURCES, 1)[0]
        }

        let lowestEnergySpawn = Game.rooms[creep.room.name].find(FIND_MY_SPAWNS).sort((a, b) => a.store.energy - b.store.energy)[0]

        if (creep.store.energy == creep.store.getCapacity(RESOURCE_ENERGY) && lowestEnergySpawn.store.energy < lowestEnergySpawn.store.getCapacity(RESOURCE_ENERGY)!) {
            creep.give(Game.spawns[lowestEnergySpawn.name], RESOURCE_ENERGY)
            return ProcessResult.RUNNING
        } else if (closestSource) {
            creep.mine(closestSource)
            return ProcessResult.RUNNING
        }

        return ProcessResult.INCOMPLETE
    }

    creep.memory.task = Task.HARVESTER_EARLY
    let newProcess = new Process(creep.name, ProcessPriority.LOW, earlyTask)
    global.scheduler.addProcess(newProcess)
}

export function harvesterSource(creep: Creep) {
    let creepId = creep.id

    const sourceTask = () => {
        Utils.Logger.log("CreepTask -> sourceTask()", LogLevel.TRACE)
        let creep = Game.getObjectById(creepId)
        if (!creep) { return ProcessResult.FAILED }
        //log creepId
        Utils.Logger.log(creepId, LogLevel.WARN)
        let sourcePos = Utils.Utility.findPosForSource(creep)
        let source = sourcePos?.findInRange(FIND_SOURCES, 2)[0]

        if (source) {
            creep.mine(source)
            return ProcessResult.RUNNING
        }
        return ProcessResult.INCOMPLETE
    }

    creep.memory.task = Task.HARVESTER_SOURCE
    let newProcess = new Process(creep.name, ProcessPriority.LOW, sourceTask)
    global.scheduler.addProcess(newProcess)
}

function unrealizedHarvestingSource(creep: Creep): Source | undefined {
    let creepClosestSource = creep.pos.findInRange(FIND_SOURCES, 2)[0]
    if (creepClosestSource) { return creepClosestSource }

    let unrealizedSource: Source | undefined = undefined
    let sources = Game.rooms[creep.memory.homeRoom].sources()

    for (let source of sources) {
        if (!unrealizedSource) { unrealizedSource = source }
        let creeps = source.pos.findInRange(FIND_MY_CREEPS, 1)
        let workParts = creeps.reduce((acc, cur) => acc + cur.getActiveBodyparts(WORK), 0)
        if (workParts < 2) {
            unrealizedSource = source
        }
    }

    return unrealizedSource
}

export function getUnassignedPackedPos(room: Room): number | undefined {
    let validPackedPositions = room.memory.validPackedSourcePositions

    if (!validPackedPositions) {
        room.validSourcePositions()
        validPackedPositions = room.memory.validPackedSourcePositions
    }

    let harvesterAssignedPositions = room.creeps().filter(x => x.memory.role == Role.HARVESTER).map(x => x.memory.assignedPos)

    for( let validPosition of validPackedPositions) {
        if (!harvesterAssignedPositions.includes(validPosition)) {
            return validPosition
        }
    }

    return undefined
}
