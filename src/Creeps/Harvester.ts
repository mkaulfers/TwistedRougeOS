import { Process } from "Models/Process"
import { Utils } from "utils/Index"
import { Role, Task, ProcessPriority, ProcessResult, LogLevel } from '../utils/Enums'

var harvester = {
    harvesterEarlyTask: function(creep: Creep) {
        let creepId = creep.id

        const earlyTask = () => {
            Utils.Logger.log("CreepTask -> earlyTask()", LogLevel.TRACE)
            let creep = Game.getObjectById(creepId)
            if (!creep) return ProcessResult.FAILED

            let closestSource: Source | undefined = undefined

            if (!creep.memory.assignedPos) {
                let sources = creep.room.sources()
                for (let source of sources) {
                    if (!source.isHarvestingAtMaxEfficiency()) {
                        closestSource = source
                        creep.memory.assignedPos = Utils.Utility.packPosition(source.assignablePosition())
                    }
                }
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
    },
    harvesterSource: function(creep: Creep) {
        let creepId = creep.id

        const sourceTask = () => {
            Utils.Logger.log("CreepTask -> sourceTask()", LogLevel.TRACE)
            let creep = Game.getObjectById(creepId)
            if (!creep) { return ProcessResult.FAILED }

            let closestSource: Source | undefined = undefined

            if (!creep.memory.assignedPos) {
                let sources = creep.room.sources()
                for (let source of sources) {
                    if (!source.isHarvestingAtMaxEfficiency()) {
                        closestSource = source
                        creep.memory.assignedPos = Utils.Utility.packPosition(source.assignablePosition())
                    }
                }
            } else {
                closestSource = Utils.Utility.unpackPostionToRoom(creep.memory.assignedPos, creep.memory.homeRoom).findInRange(FIND_SOURCES, 1)[0]
            }

            if (closestSource) {
                if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                    creep.drop(RESOURCE_ENERGY)
                }

                creep.mine(closestSource)
                return ProcessResult.RUNNING
            }
            return ProcessResult.INCOMPLETE
        }

        creep.memory.task = Task.HARVESTER_SOURCE
        let newProcess = new Process(creep.name, ProcessPriority.LOW, sourceTask)
        global.scheduler.addProcess(newProcess)
    },
    shouldSpawn: function(room: Room): boolean {
        Utils.Logger.log("Spawn -> shouldSpawnHarvester()", LogLevel.TRACE)
        let sources = room.sources()
        let allSourcesRealized = true
        for (let source of sources) {
            if (!source.isHarvestingAtMaxEfficiency()) {
                allSourcesRealized = false
            }
        }
        return !allSourcesRealized
    },
    baseBody: [CARRY, MOVE, WORK, WORK],
    segment: [WORK]
}

export default harvester;