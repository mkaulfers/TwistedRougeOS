import CreepRole from "Models/CreepRole"
import { Process } from "Models/Process"
import { Utils } from "utils/Index"

import { Role, Task, ProcessPriority, ProcessResult, LogLevel } from '../utils/Enums'

export class Harvester extends CreepRole {

    readonly baseBody = [CARRY, MOVE, WORK, WORK]
    readonly segment = [WORK]
    readonly partLimits = [5]

    dispatch(room: Room) {
        let harvesters = room.localCreeps.harvester
        let truckers = room.localCreeps.trucker
        if (truckers.length < Math.ceil(harvesters.length / 2)) {
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

    quantityWanted(room: Room, rolesNeeded: Role[], min?: boolean): number {
        Utils.Logger.log("quantityWanted -> harvester.quantityWanted()", LogLevel.TRACE)
        let sources = room.sources.length;
        let harCount = rolesNeeded.filter(x => x == Role.HARVESTER).length
        if (min && min == true) return harCount < sources ? sources - harCount : 0;

        // Determine max needed harvesters based on harvest efficiency and valid spaces around source
        let shouldBe = Math.ceil((sources * 5) / (Utils.Utility.getBodyFor(room, this.baseBody, this.segment, this.partLimits).filter(p => p == WORK).length));
        let maxPositions = 0;
        room.sources.forEach(s => maxPositions += s.validPositions.length);

        if (shouldBe > maxPositions) shouldBe = maxPositions;
        return harCount < shouldBe ? shouldBe - harCount : 0;
    }

    preSpawnBy(room: Room, spawn: StructureSpawn, creep?: Creep): number {
        if (!room || !spawn) return 0;
        // return exact IFF possible, else average
        let preSpawnOffset = 0;
        if (creep && creep.memory.assignedPos) {
            preSpawnOffset = room.findPath(spawn.pos, Utils.Utility.unpackPostionToRoom(creep.memory.assignedPos, room.name)).length * (creep.body.length - 2);
        } else {
            let x = 0;
            let y = 0;
            for (const source of room.sources) {
                x += source.pos.x;
                y += source.pos.y;
            }
            x = Math.floor(x / room.sources.length);
            y = Math.floor(y / room.sources.length);
            let modifier = creep ? creep.getActiveBodyparts(WORK) : 1;
            preSpawnOffset = room.findPath(spawn.pos, new RoomPosition(x >= 0 && x <= 49 ? x : 25, y >= 0 && y <= 49 ? y : 25, room.name)).length * modifier;
        }
        return preSpawnOffset;
    }

    readonly tasks: { [key in Task]?: (creep: Creep) => void } = {
        harvester_early: function(creep: Creep) {
            let creepId = creep.id

            const earlyTask = () => {
                Utils.Logger.log("CreepTask -> earlyTask()", LogLevel.TRACE)
                let creep = Game.getObjectById(creepId)
                if (!creep) return ProcessResult.FAILED

                let closestSource: Source | undefined = undefined

                if (!creep.memory.assignedPos) {
                    closestSource = Harvester.genAssignedPos(creep);
                } else {
                    closestSource = Utils.Utility.unpackPostionToRoom(creep.memory.assignedPos, creep.memory.homeRoom).findInRange(FIND_SOURCES, 1)[0]
                }

                let lowestEnergySpawn = Game.rooms[creep.room.name].find(FIND_MY_SPAWNS).sort((a, b) => a.store.energy - b.store.energy)[0]

                if (creep.store.energy == creep.store.getCapacity(RESOURCE_ENERGY) && lowestEnergySpawn.store.energy < lowestEnergySpawn.store.getCapacity(RESOURCE_ENERGY)) {
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
        harvester_source: function(creep: Creep) {
            let creepId = creep.id

            const sourceTask = () => {
                Utils.Logger.log("CreepTask -> sourceTask()", LogLevel.TRACE)
                let creep = Game.getObjectById(creepId)
                if (!creep) { return ProcessResult.FAILED }

                let closestSource: Source | undefined = undefined

                if (!creep.memory.assignedPos) {
                    closestSource = Harvester.genAssignedPos(creep);
                } else {
                    closestSource = Utils.Utility.unpackPostionToRoom(creep.memory.assignedPos, creep.memory.homeRoom).findInRange(FIND_SOURCES, 1)[0]
                }

                if (closestSource) {
                    if (creep.store.energy > (creep.store.getCapacity() * 0.8)) {
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
                            let dump = Game.getObjectById(creep.cache.harvesterDump);
                            if (dump && dump.store.getFreeCapacity(RESOURCE_ENERGY) > 0 && creep.ticksToLive && creep.ticksToLive % 50 !== 0) {
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
    }

    private static genAssignedPos(creep: Creep): Source | undefined {
        let sources = creep.room.sources
        let targetSource: Source | undefined;

        // Prespawn targeting
        let matchingCreep = creep.room.stationedCreeps.harvester.find((c) => c.name !== creep.name && (c.name.substring(0,6) ?? '1') == (creep.name.substring(0,6) ?? '0'))
        if (matchingCreep && matchingCreep.memory.assignedPos) {
            creep.memory.assignedPos = matchingCreep.memory.assignedPos;
            targetSource = Utils.Utility.unpackPostionToRoom(creep.memory.assignedPos, creep.memory.homeRoom).findInRange(FIND_SOURCES, 1)[0]
        }


        if (!creep.memory.assignedPos) {
            for (let source of sources) {
                // Non-maxed targeting
                if (!source.isHarvestingAtMaxEfficiency) {
                    targetSource = source;
                    let assignablePos = source.assignablePosition();
                    creep.memory.assignedPos = assignablePos ? Utils.Utility.packPosition(assignablePos) : undefined;
                }

                // Backup targeting
                if (!creep.memory.assignedPos) {
                    targetSource = source;
                    let assignablePos = source.assignablePosition();
                    creep.memory.assignedPos = assignablePos ? Utils.Utility.packPosition(assignablePos) : undefined;
                }
            }
        }


        return targetSource;
    }
}
