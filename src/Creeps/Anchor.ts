import CreepRole from "Models/CreepRole";
import { Process } from "Models/Process";
import { Utils } from "utils/Index";
import { Role, Task, ProcessPriority, ProcessResult, LogLevel, StampType } from '../utils/Enums'

export class Anchor extends CreepRole {

    readonly baseBody = [CARRY, CARRY, CARRY, CARRY, CARRY, MOVE]
    readonly segment = [CARRY]

    dispatch(room: Room) {
        for (let anchor of room.localCreeps.anchor) {
            if (!anchor.memory.task) {
                global.scheduler.swapProcess(anchor, Task.ANCHOR)
            }
        }
    }

    quantityWanted(room: Room, rolesNeeded: Role[], min?: boolean): number {
        Utils.Logger.log("quantityWanted -> anchor.quantityWanted()", LogLevel.TRACE)
        if (min && min == true) return 0;

        let anchorCount = rolesNeeded.filter(x => x == Role.ANCHOR).length
        let shouldBe = room.isAnchorFunctional ? 1 : 0;
        return anchorCount < shouldBe ? shouldBe - anchorCount : 0;
    }

    preSpawnBy(room: Room, spawn: StructureSpawn, creep?: Creep): number {
        if (!room || !spawn) return 0;
        if (!room.memory.blueprint || room.memory.blueprint.anchor === 0) return 0;
        const anchorStamp = room.memory.blueprint.stamps.find((s) => s.type === StampType.ANCHOR);
        if (!anchorStamp) return 0;

        // return path dist to anchor
        return room.findPath(spawn.pos, Utils.Utility.unpackPostionToRoom(anchorStamp.stampPos, room.name)).length;
    }

    readonly tasks: { [key in Task]?: (creep: Creep) => void } = {
        anchor: function(creep: Creep) {
            let creepId = creep.id

            const task = () => {
                Utils.Logger.log("CreepTask -> anchor()", LogLevel.TRACE);

                let creep = Game.getObjectById(creepId);
                if (!creep) {
                    Utils.Logger.log(creepId, LogLevel.FATAL);
                    return ProcessResult.FAILED;
                }

                // Handle positioning
                if (!creep.room.memory.blueprint || creep.room.memory.blueprint.anchor === 0) return ProcessResult.FAILED;
                const anchorStamp = creep.room.memory.blueprint.stamps.find((s) => s.type === StampType.ANCHOR);
                if (!anchorStamp) return ProcessResult.FAILED;
                // YOU ARE HERE YOU NINCOMPOOP

                // Switches working value if full or empty
                if (creep.memory.working == undefined) creep.memory.working = false;
                if ((creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0 && creep.memory.working == true) ||
                    (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0 && creep.memory.working == false)) {
                    creep.memory.working = !creep.memory.working;
                    delete creep.memory.target;
                }
                const working = creep.memory.working;

                /*
                Targeting
                */

                // Link
                const link = creep.pos.findInRange(creep.room.links, 1);

                // Spawn
                const spawn = creep.pos.findInRange(creep.room.spawns, 1);

                // Power Spawn
                const powerSpawn = creep.room.powerSpawn;
                const terminal = creep.room.terminal;
                const factory = creep.room.factory;
                const storage = creep.room.storage;
                const nuker = creep.room.nuker;

                if (!working) {

                    // Link

                    // Spawn

                    // Power Spawn
                    creep.room.powerSpawn;

                    // Terminal

                    // Factory

                    // Storage

                    // Nuker

                } else {

                }

                var result = creep.praise(controller);
                if (result === OK || result === ERR_NOT_ENOUGH_ENERGY) {
                    return ProcessResult.RUNNING;
                }
                Utils.Logger.log(`${creep.name} generated error code ${result} while attempting to praise ${controller.structureType}${JSON.stringify(controller.pos)}.`, LogLevel.ERROR);
                return ProcessResult.INCOMPLETE;
            }

            creep.memory.task = Task.ANCHOR
            let newProcess = new Process(creep.name, ProcessPriority.LOW, task)
            global.scheduler.addProcess(newProcess)
        }
    }
}
