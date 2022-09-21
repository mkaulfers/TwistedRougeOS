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

    readonly tasks = {
        filler_working: function(creep: Creep) {
            let creepId = creep.id

            const fastFillerTask = () => {
                let creep = Game.getObjectById(creepId)
                if (!creep) return ProcessResult.FAILED
                let room = Game.rooms[creep.memory.homeRoom]

                if (!creep.memory.assignedPos) {
                    let assignablePosition = Filler.getFillerPosition(room)
                    if (assignablePosition) {
                        creep.memory.assignedPos = Utils.Utility.packPosition(assignablePosition)
                    } else {
                        return ProcessResult.FAILED
                    }
                } else {
                    let assignedPos = Utils.Utility.unpackPostionToRoom(creep.memory.assignedPos, room.name)
                    if (creep.pos != assignedPos) {
                        creep.travel(assignedPos)
                        return ProcessResult.RUNNING
                    }

                    let nearbyStructures = Filler.nearbyStructures(creep)
                    let storingStructures = nearbyStructures.filter(structure => structure.structureType != STRUCTURE_LINK)
                    let container = nearbyStructures.filter(structure => structure.structureType === STRUCTURE_CONTAINER)[0]
                    let link = nearbyStructures.filter(structure => structure.structureType === STRUCTURE_LINK)[0]

                    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0 &&
                        container && container.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                        creep.take(container, RESOURCE_ENERGY)

                        for (let structure of storingStructures) {
                            creep.give(structure, RESOURCE_ENERGY)
                        }

                    } else {
                        if (link.store.getUsedCapacity(RESOURCE_ENERGY) > 0 &&
                            container && container.store.getUsedCapacity(RESOURCE_ENERGY) < container.store.getCapacity(RESOURCE_ENERGY)) {
                            creep.take(link, RESOURCE_ENERGY)
                            creep.give(container, RESOURCE_ENERGY)
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

    private static nearbyStructures(creep: Creep): AnyStoreStructure[] {
        let creepAssignedPos = Utils.Utility.unpackPostionToRoom(creep.memory.assignedPos!, creep.memory.homeRoom)
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
            if (structure.structure.structureType === STRUCTURE_CONTAINER ||
                structure.structure.structureType === STRUCTURE_EXTENSION ||
                structure.structure.structureType === STRUCTURE_SPAWN ||
                structure.structure.structureType === STRUCTURE_LINK) {
                filteredStructures.push(structure.structure as AnyStoreStructure)
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
        return results.length >= 16
    }
}
