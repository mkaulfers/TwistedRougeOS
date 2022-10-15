import CreepRole from "Models/CreepRole"
import { Process } from "Models/Process"
import { LogLevel, ProcessPriority, ProcessResult, Role, Task } from "utils/Enums"
import { Utils } from "utils/Index"
import { Logger } from "utils/Logger"

export class Filler extends CreepRole {

    readonly baseBody = [CARRY, CARRY, CARRY, CARRY, CARRY, MOVE]
    readonly segment = [CARRY]
    readonly partLimits = [12]

    dispatch(room: Room) {
        let fillers = room.localCreeps.filler
        for (let filler of fillers) {
            if (!filler.memory.task) {
                global.scheduler.swapProcess(filler, Task.FILLER)
            }
        }
    }

    quantityWanted(room: Room, rolesNeeded: Role[], min?: boolean): number {
        Utils.Logger.log("quantityWanted -> filler.quantityWanted()", LogLevel.TRACE)
        if (min && min == true) return 0;
        let fillerCount = rolesNeeded.filter(x => x == Role.FILLER).length
        if (Filler.isFillerComplete(room) && fillerCount !== 4) return 4 - fillerCount;
        return 0;
    }

    preSpawnBy(room: Room, spawn: StructureSpawn, creep?: Creep): number {
        if (!room || !spawn) return 0;

        // return avg path dist to anchor
        if (!room.memory.blueprint || room.memory.blueprint.anchor == 0) return 0;
        let anchorPos = Utils.Utility.unpackPostionToRoom(room.memory.blueprint.anchor, room.name)
        return room.findPath(spawn.pos, anchorPos).length;
    }

    readonly tasks: { [key in Task]?: (creep: Creep) => void } = {
        filler_working: function(creep: Creep) {
            let creepId = creep.id

            const fastFillerTask = () => {
                let creep = Game.getObjectById(creepId)
                if (!creep) return ProcessResult.FAILED
                if (creep.spawning) return ProcessResult.RUNNING;
                let room = Game.rooms[creep.memory.homeRoom]

                if (!creep.memory.assignedPos) {
                    // Prespawn targeting
                    let matchingCreep = creep.room.stationedCreeps.filler.find((c) => c.name !== creep!.name && (c.name.substring(0,6) ?? '1') == (creep!.name.substring(0,6) ?? '0'))
                    let assignablePosition = Filler.getFillerPosition(room)

                    if (matchingCreep && matchingCreep.memory.assignedPos && !assignablePosition) {
                        creep.memory.assignedPos = matchingCreep.memory.assignedPos;
                    } else {
                        if (assignablePosition) {
                            creep.memory.assignedPos = Utils.Utility.packPosition(assignablePosition)
                        } else {
                            return ProcessResult.FAILED
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
                    let nearbyStructures = Filler.nearbyFillThese(creep)

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

                return ProcessResult.RUNNING
            }

            let newProcess = new Process(creep.name, ProcessPriority.MEDIUM, fastFillerTask)
            global.scheduler.addProcess(newProcess)
        }
    }

    private static getFillerPosition(room: Room): RoomPosition | undefined {
        if (!room.memory.blueprint) return;
        let anchor = Utils.Utility.unpackPostionToRoom(room.memory.blueprint.anchor, room.name)
        let assignablePositions = [
            new RoomPosition(anchor.x - 1, anchor.y - 1, anchor.roomName),
            new RoomPosition(anchor.x + 1, anchor.y - 1, anchor.roomName),
            new RoomPosition(anchor.x - 1, anchor.y + 1, anchor.roomName),
            new RoomPosition(anchor.x + 1, anchor.y + 1, anchor.roomName),
        ]

        let creeps = room.localCreeps.filler
        for (let creep of creeps) {
            if (creep.memory.assignedPos) {
                for (let assignable of assignablePositions) {
                    if (creep.memory.assignedPos === Utils.Utility.packPosition(assignable)) {
                        assignablePositions.splice(assignablePositions.indexOf(assignable), 1)
                    }
                }
            }
        }

        return assignablePositions[0]
    }

    private static nearbyFillThese(creep: Creep): AnyStoreStructure[] {
        if (!creep.memory.assignedPos) return []
        let creepAssignedPos = Utils.Utility.unpackPostionToRoom(creep.memory.assignedPos, creep.memory.homeRoom)
        let room = Game.rooms[creep.memory.homeRoom]
        let structures = room.lookForAtArea(
            LOOK_STRUCTURES,
            creepAssignedPos.y - 1,
            creepAssignedPos.x - 1,
            creepAssignedPos.y + 1,
            creepAssignedPos.x + 1, true
        )

        let filteredStructures: AnyStoreStructure[] = []
        for (let structure of structures) {
            if (Utils.Typeguards.isStructureExtension(structure.structure) || Utils.Typeguards.isStructureSpawn(structure.structure)) {
                let struct = structure.structure;
                struct.store.getFreeCapacity(RESOURCE_ENERGY) > 0 ? filteredStructures.push(struct) : undefined;
            }
        }
        return filteredStructures
    }

    private static isFillerComplete(room: Room): boolean {
        let blueprint = room.memory.blueprint
        if (!blueprint) return false

        let anchor = Utils.Utility.unpackPostionToRoom(blueprint.anchor, room.name)
        let results = room.lookForAtArea(LOOK_STRUCTURES, anchor.y - 2, anchor.x - 2, anchor.y + 2, anchor.x + 2, true)
        results = results.filter(
            result => result.structure.structureType == STRUCTURE_EXTENSION ||
                result.structure.structureType == STRUCTURE_CONTAINER ||
                result.structure.structureType == STRUCTURE_SPAWN ||
                result.structure.structureType == STRUCTURE_LINK
        )
        Logger.log(`${room.name} has ${results.length} structures`, LogLevel.INFO)
        return results.length >= 18
    }
}
