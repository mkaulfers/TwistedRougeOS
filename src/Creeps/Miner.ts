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

    quantityWanted(room: Room, rolesNeeded: Role[], min?: boolean): number {
        Utils.Logger.log("quantityWanted -> miner.quantityWanted()", TRACE)
        if (min && min == true) return 0

        // If no mineral to mine, return 0
        let mineral = room.mineral
        if (!mineral || mineral.mineralAmount == 0) return 0

        let minerCount = rolesNeeded.filter(x => x == MINER).length
        if (rolesNeeded.filter(x => x == HARVESTER).length < room.sources.length) return 0
        if (rolesNeeded.filter(x => x == TRUCKER).length < room.sources.length) return 0

        // Determine max needed harvesters based on harvest efficiency and valid spaces around source
        let body = this.getBody(room);
        let shouldBe = Math.ceil((minerCount * 5) / (body.filter(p => p == WORK).length));
        let maxPositions = 0;
        room.sources.forEach(s => maxPositions += s.pos.validPositions?.length ?? 0);

        if (shouldBe > maxPositions) shouldBe = maxPositions;
        return minerCount < shouldBe ? shouldBe - minerCount : 0;
    }

    preSpawnBy(room: Room, spawn: StructureSpawn, creep?: Creep): number {
        if (!room || !spawn) return 0;
        // return exact IFF possible, else average
        let preSpawnOffset = 0;
        if (creep && creep.memory.assignedPos) {
            let path = generatePath(spawn.pos, [{ pos: Utils.Utility.unpackPostionToRoom(creep.memory.assignedPos, room.name), range: 1}], MOVE_OPTS_CIVILIAN)
            if (path) preSpawnOffset = path.length * (creep.body.length - 2);
        } else {
            let x = 0;
            let y = 0;
            for (const source of room.sources) {
                x += source.pos.x;
                y += source.pos.y;
            }
            x = Math.floor(x / room.sources.length);
            y = Math.floor(y / room.sources.length);
            let modifier = creep ? creep.workParts : 1;
            preSpawnOffset = room.findPath(spawn.pos, new RoomPosition(x >= 0 && x <= 49 ? x : 25, y >= 0 && y <= 49 ? y : 25, room.name)).length * modifier;
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

    private static isMineralReady(room: Room) {

    }

    private static genAssignedPos(creep: Creep): Mineral | undefined {
        let sources = creep.room.sources
        let targetSource: Source | undefined;

        // Prespawn targeting
        let matchingCreep = creep.room.stationedCreeps.harvester.find((c) => c.name !== creep.name && (c.name.substring(0,6) ?? '1') == (creep.name.substring(0,6) ?? '0'))
        if (matchingCreep && matchingCreep.memory.assignedPos && _.all(sources, (s) => s.fullyHarvesting)) {
            creep.memory.assignedPos = matchingCreep.memory.assignedPos;
            targetSource = Utils.Utility.unpackPostionToRoom(creep.memory.assignedPos, creep.memory.homeRoom).findInRange(FIND_SOURCES, 1)[0]
        }


        if (!creep.memory.assignedPos) {
            for (let source of sources) {
                // Non-maxed targeting
                if (!source.fullyHarvesting) {
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
