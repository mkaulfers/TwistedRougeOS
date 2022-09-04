
import { Process } from "Models/Process"
import { Utils } from "utils/Index"

import { Role, Task, ProcessPriority, ProcessResult, LogLevel } from '../utils/Enums'

export class Harvester extends Creep {

    static baseBody = [CARRY, MOVE, WORK, WORK]
    static segment = [WORK]

    static harvesterEarlyTask(creep: Creep) {
        let creepId = creep.id

        const earlyTask = () => {
            Utils.Logger.log("CreepTask -> earlyTask()", LogLevel.TRACE)
            let creep = Game.getObjectById(creepId)
            if (!creep) return ProcessResult.FAILED

            let closestSource: Source | undefined = undefined

            if (!creep.memory.assignedPos) {
                let sources = creep.room.sources
                for (let source of sources) {
                    if (!source.isHarvestingAtMaxEfficiency) {
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
    }


    static harvesterSource(creep: Creep) {
        let creepId = creep.id

        const sourceTask = () => {
            Utils.Logger.log("CreepTask -> sourceTask()", LogLevel.TRACE)
            let creep = Game.getObjectById(creepId)
            if (!creep) { return ProcessResult.FAILED }

            let closestSource: Source | undefined = undefined

            if (!creep.memory.assignedPos) {
                let sources = creep.room.sources
                for (let source of sources) {
                    if (!source.isHarvestingAtMaxEfficiency) {
                        closestSource = source
                        creep.memory.assignedPos = Utils.Utility.packPosition(source.assignablePosition())
                    }
                }
            } else {
                closestSource = Utils.Utility.unpackPostionToRoom(creep.memory.assignedPos, creep.memory.homeRoom).findInRange(FIND_SOURCES, 1)[0]
            }

            if (closestSource) {
                if (creep.store.getFreeCapacity() <= 10) {
                    if (!creep.cache.harvesterDump) {
                        let dumps = creep.pos.findInRange(FIND_STRUCTURES, 1);
                        let link = _.filter(dumps, function (d) { return d.structureType == STRUCTURE_LINK && d.store.getFreeCapacity(RESOURCE_ENERGY) > 0 })[0] as StructureLink;
                        let container = _.filter(dumps, function (d) { return d.structureType == STRUCTURE_CONTAINER && d.store.getFreeCapacity(RESOURCE_ENERGY) > 0 })[0] as StructureContainer;

                        if (link) {
                            creep.cache.harvesterDump = link.id;
                        } else if (container) {
                            creep.cache.harvesterDump = container.id;
                        }
                    }
                    if (creep.cache.harvesterDump) {
                        let dump = Game.getObjectById(creep.cache.harvesterDump!);
                        if (dump && dump.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                            creep.give(dump, RESOURCE_ENERGY);
                        } else {
                            delete creep.cache.harvesterDump
                        }
                    }
                }

                creep.mine(closestSource)
                return ProcessResult.RUNNING
            }
            return ProcessResult.INCOMPLETE
        }

        creep.memory.task = Task.HARVESTER_SOURCE
        let newProcess = new Process(creep.name, ProcessPriority.LOW, sourceTask)
        global.scheduler.addProcess(newProcess)
    }

    static dispatch(room: Room) {
        let harvesters = room.localCreeps.harvesters
        let truckers = room.localCreeps.truckers
        if (truckers.length < 1) {
            for (let harvester of harvesters) {
                if (!harvester.memory.task || harvester.memory.task == Task.HARVESTER_SOURCE) {
                    global.scheduler.swapProcess(harvester, Task.HARVESTER_EARLY)
                }
            }
        } else {
            for (let harvester of harvesters) {
                if (!harvester.memory.task || harvester.memory.task == Task.HARVESTER_EARLY) {
                    global.scheduler.swapProcess(harvester, Task.HARVESTER_SOURCE)
                }
            }
        }
    }

    static shouldSpawn(room: Room): boolean {
        Utils.Logger.log("Spawn -> shouldSpawnHarvester()", LogLevel.TRACE)
        let sources = room.sources
        return room.currentHarvesterWorkPotential() < sources.length * 10
    }

}
