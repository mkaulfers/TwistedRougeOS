import { TRACE } from "Constants/LogConstants"
import { MOVE_OPTS_CIVILIAN } from "Constants/MoveOptsConstants"
import { LOW } from "Constants/ProcessPriorityConstants"
import { FATAL, RUNNING, FAILED } from "Constants/ProcessStateConstants"
import { Role, MINER, HARVESTER, TRUCKER } from "Constants/RoleConstants"
import { MINER_WORKING, Task } from "Constants/TaskConstants"
import CreepRole from "Models/CreepRole"
import { Process } from "Models/Process"
import { generatePath } from "screeps-cartographer"
import { Utils } from "utils/Index"

export class Miner extends CreepRole {

    readonly baseBody = [CARRY, MOVE, WORK, WORK]
    readonly segment = [WORK]

    dispatch(room: Room) {
        let miners = room.localCreeps.miner
        for (let miner of miners) {
            if (!miner.memory.task) {
                global.scheduler.swapProcess(miner, MINER_WORKING)
            }
        }
    }

    /* If there is  */
    quantityWanted(room: Room, rolesNeeded: Role[], min?: boolean): number {
        Utils.Logger.log("quantityWanted -> miner.quantityWanted()", TRACE)
        if (min && min == true) return 0

        let mineral = room.mineral

        // If no mineral or supporting structures, return 0
        if (!mineral || mineral.isReady) return 0

        // No harvesters or truckers? Definitely no miners
        let minerCount = rolesNeeded.filter(x => x == MINER).length
        if (rolesNeeded.filter(x => x == HARVESTER).length < room.sources.length) return 0
        if (rolesNeeded.filter(x => x == TRUCKER).length < room.sources.length) return 0

        // Determine valid positions around mineral
        let validPositions = mineral.pos.validPositions.length
        return minerCount < validPositions ? validPositions - minerCount : 0;
    }

    preSpawnBy(room: Room, spawn: StructureSpawn, creep?: Creep): number {
        if (!room || !spawn) return 0;
        // Mineral Guard
        let mineral = room.mineral
        if (!mineral) return 0;

        // return exact IFF possible, else average
        let preSpawnOffset = 0;
        if (creep && creep.memory.assignedPos) {
            let path = generatePath(spawn.pos, [{ pos: Utils.Utility.unpackPostionToRoom(creep.memory.assignedPos, room.name), range: 1}], MOVE_OPTS_CIVILIAN)
            if (path) preSpawnOffset = path.length * (creep.body.length - 2);
        } else {
            let modifier = creep ? creep.workParts : 1;
            preSpawnOffset = room.findPath(spawn.pos, mineral.pos, MOVE_OPTS_CIVILIAN).length * modifier;
        }
        return preSpawnOffset;
    }

    readonly tasks: { [key in Task]?: (creep: Creep) => void } = {
        miner_working: function(creep: Creep) {
            let creepId = creep.id

            const minerWorkingTask = () => {
                let creep = Game.getObjectById(creepId)
                if (!creep) return FATAL;
                if (creep.spawning) return RUNNING;
                let room = Game.rooms[creep.memory.homeRoom]

                if (!creep.memory.assignedPos) {
                    // Prespawn targeting
                    let matchingCreep = creep.room.stationedCreeps.filler.find((c) => c.name !== creep!.name && (c.name.substring(0,6) ?? '1') == (creep!.name.substring(0,6) ?? '0'))
                    let assignablePosition = Miner.getFillerPosition(room)

                    if (matchingCreep && matchingCreep.memory.assignedPos && !assignablePosition) {
                        creep.memory.assignedPos = matchingCreep.memory.assignedPos;
                    } else {
                        if (assignablePosition) {
                            creep.memory.assignedPos = Utils.Utility.packPosition(assignablePosition)
                        } else {
                            return FAILED
                        }
                    }
                }
                let assignedPos = Utils.Utility.unpackPostionToRoom(creep.memory.assignedPos, room.name)

                if (creep.pos.getRangeTo(assignedPos) > 0) {
                    creep.travel({pos: assignedPos, range: 0})
                } else {

                    // Handle working flip
                    // Switches working value if full or empty
                    if (creep.memory.working == undefined) creep.memory.working = false;
                    if ((creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0 && creep.memory.working == true) ||
                        (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0 && creep.memory.working == false)) {
                        creep.memory.working = !creep.memory.working;
                    }
                    const working = creep.memory.working;

                    // Handle targeting
                    let nearbyStructures = Miner.nearbyFillThese(creep)

                    // Handle container and link identification
                    if ((!creep.cache.dump && !creep.cache.supply) || Game.time % 500 === 0) {
                        let nearby = creep.pos.findInRange(FIND_STRUCTURES, 1);
                        nearby.forEach(function(s) {
                            if (creep && s.structureType === STRUCTURE_CONTAINER) creep.cache.dump = s.id;
                            if (creep && s.structureType === STRUCTURE_LINK) creep.cache.supply = s.id;
                        });
                    }

                    let container = creep.cache.dump ? Game.getObjectById(creep.cache.dump) : undefined;
                    let link = creep.cache.supply ? Game.getObjectById(creep.cache.supply) : undefined;

                    if (!working) {
                        if (container && link && container.store.getFreeCapacity(RESOURCE_ENERGY) > 0 && link.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                            creep.take(link, RESOURCE_ENERGY);
                        } else {
                            let tombstone = creep.pos.findInRange(FIND_TOMBSTONES, 0)[0] ?? undefined;
                            let resource = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 0, { filter: { type: RESOURCE_ENERGY } })[0] ?? undefined;
                            if (tombstone && tombstone.store.getUsedCapacity(RESOURCE_ENERGY) > 0) creep.take(tombstone, RESOURCE_ENERGY);
                            else if (resource && resource.amount > 0) creep.take(resource, RESOURCE_ENERGY);
                            else if (link && link.store.energy > 0) creep.take(link, RESOURCE_ENERGY);
                            else if (container && container.store.energy > 0) creep.take(container, RESOURCE_ENERGY);
                        }
                    } else {
                        if (nearbyStructures.length > 0) {
                            nearbyStructures[0] ? creep.give(nearbyStructures[0], RESOURCE_ENERGY) : undefined;
                        } else if (container && link && link.store.getUsedCapacity(RESOURCE_ENERGY) > 0 && container.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                            creep.give(container, RESOURCE_ENERGY);
                        } else if (creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                            creep.memory.working = !creep.memory.working;
                        }
                    }
                }

                return RUNNING
            }

            let newProcess = new Process(creep.name, LOW, minerWorkingTask)
            global.scheduler.addProcess(newProcess)
        }
    }

    private static genAssignedPos(creep: Creep): Mineral | undefined {
        let mineral = creep.room.mineral

        // Mineral Guard
        if (!mineral) return

        // Prespawn targeting
        let matchingCreep = creep.room.stationedCreeps.miner.find((c) => c.name !== creep.name && (c.name.substring(0,6) ?? '1') == (creep.name.substring(0,6) ?? '0'))
        if (matchingCreep && matchingCreep.memory.assignedPos) {
            creep.memory.assignedPos = matchingCreep.memory.assignedPos;
        }


        if (!creep.memory.assignedPos) {
                // Backup targeting
                if (!creep.memory.assignedPos) {
                    let assignablePos = source.assignablePosition();
                    creep.memory.assignedPos = assignablePos ? Utils.Utility.packPosition(assignablePos) : undefined;
                }
        }
        return mineral;
    }
}
