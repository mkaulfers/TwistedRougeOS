import { TRACE, ERROR } from "Constants/LogConstants";
import { LOW } from "Constants/ProcessPriorityConstants";
import { FATAL, RUNNING, FAILED, INCOMPLETE } from "Constants/ProcessStateConstants";
import { Role, SCIENTIST, HARVESTER } from "Constants/RoleConstants";
import { SCIENTIST_UPGRADING, Task } from "Constants/TaskConstants";
import CreepRole from "Models/CreepRole";
import { Process } from "Models/Process";
import { Utils } from "utils/Index";
export class Scientist extends CreepRole {

    readonly baseBody = [CARRY, MOVE, WORK, WORK]
    readonly segment = [CARRY, WORK, WORK]

    dispatch(room: Room) {
        let scientists = room.localCreeps.scientist
        for (let scientist of scientists) {
            if (!scientist.memory.task) {
                global.scheduler.swapProcess(scientist, SCIENTIST_UPGRADING)
            }
        }
    }

    quantityWanted(room: Room, rolesNeeded: Role[], min?: boolean): number {
        Utils.Logger.log("quantityWanted -> scientist.quantityWanted()", TRACE)
        let controller = room.controller
        if (!controller) return 0
        let sciCount = rolesNeeded.filter(x => x == SCIENTIST).length
        let sourceCount = room.sources.length;
        if (min && min == true) return rolesNeeded.filter(x => x == HARVESTER).length < sourceCount ? 0 : 1 - sciCount;

        if (!room.storage) return 0;

        let energyIncome = room.energyIncome == 0 ? sourceCount * 10 : room.energyIncome;
        let bodyWorkCount = this.getBody(room).filter(p => p == WORK).length;

        let shouldBe = Math.ceil((controller.level == 8 ? 15 : energyIncome / 4) / bodyWorkCount);
        if (room.storage && room.storage.store.energy > 500000 && controller.level !== 8) shouldBe = Math.ceil(energyIncome * 2) / bodyWorkCount;
        return sciCount < shouldBe ? shouldBe - sciCount : 0;
    }

    preSpawnBy(room: Room, spawn: StructureSpawn, creep?: Creep): number {
        if (!room || !spawn || !room.controller) return 0;

        // Calculate Move Speed
        let body = this.getBody(room);

        let moveCount = body.filter(p => p == MOVE).length;
        let moveRate = (body.length - moveCount) / (moveCount * 2)

        // return path dist to controller
        return room.findPath(spawn.pos, room.controller.pos, { range: 3 }).length * moveRate;
    }

    readonly tasks: { [key in Task]?: (creep: Creep) => void } = {
        scientist_upgrading: function(creep: Creep) {
            let creepId = creep.id

            const upgradingTask = () => {
                Utils.Logger.log("CreepTask -> upgradingTask()", TRACE);

                let creep = Game.getObjectById(creepId);
                if (!creep) return FATAL;
                if (creep.spawning) return RUNNING;

                // Switches working value if full or empty
                if (creep.memory.working == undefined) creep.memory.working = false;
                if ((creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0 && creep.memory.working == true) ||
                    (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0 && creep.memory.working == false)) {
                    creep.memory.working = !creep.memory.working;
                }
                const working = creep.memory.working;

                // Controller targeting
                if (!Game.rooms[creep.memory.homeRoom]) return FAILED;
                let controller = Game.rooms[creep.memory.homeRoom].controller;
                if (!controller) return FAILED;

                let result: number | undefined;
                result = creep.praise(controller, working);

                if (result === OK || result === ERR_NOT_ENOUGH_ENERGY) return RUNNING;
                Utils.Logger.log(`${creep.name} generated error code ${result} while attempting to praise ${controller.structureType}${JSON.stringify(controller.pos)}.`, ERROR);
                return INCOMPLETE;
            }

            creep.memory.task = SCIENTIST_UPGRADING
            let newProcess = new Process(creep.name, LOW, upgradingTask)
            global.scheduler.addProcess(newProcess)
        }
    }
}
