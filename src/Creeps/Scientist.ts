import { Process } from "Models/Process";
import { Utils } from "utils/Index";
import { Role, Task, ProcessPriority, ProcessResult, LogLevel } from '../utils/Enums'

export class Scientist extends Creep {

    static baseBody = [CARRY, MOVE, WORK, WORK]
    static segment = [CARRY, WORK, WORK]

    static scientistUpgrading(creep: Creep) {
        let creepId = creep.id

        const upgradingTask = () => {
            Utils.Logger.log("CreepTask -> upgradingTask()", LogLevel.TRACE);

            let creep = Game.getObjectById(creepId);
            if (!creep) {
                Utils.Logger.log(creepId, LogLevel.FATAL);
                return ProcessResult.FAILED;
            }

            if (!Game.rooms[creep.memory.homeRoom]) return ProcessResult.FAILED;
            let controller = Game.rooms[creep.memory.homeRoom].controller;
            if (!controller) return ProcessResult.FAILED;

            var result = creep.praise(controller);
            if (result === OK || result === ERR_NOT_ENOUGH_ENERGY) {
                return ProcessResult.RUNNING;
            }
            Utils.Logger.log(`${creep.name} generated error code ${result} while attempting to praise ${controller.structureType}${JSON.stringify(controller.pos)}.`, LogLevel.ERROR);
            return ProcessResult.INCOMPLETE;
        }

        creep.memory.task = Task.SCIENTIST_UPGRADING
        let newProcess = new Process(creep.name, ProcessPriority.LOW, upgradingTask)
        global.scheduler.addProcess(newProcess)
    }

    static dispatch(room: Room) {
        let scientists = room.localCreeps.scientists
        for (let scientist of scientists) {
            if (!scientist.memory.task) {
                global.scheduler.swapProcess(scientist, Task.SCIENTIST_UPGRADING)
            }
        }
    }

    static shouldSpawn(room: Room, rolesNeeded: Role[], min?: boolean): number {
        let controller = room.controller
        if (!controller) return 0
        let scientists = rolesNeeded.filter(x => x == Role.SCIENTIST).length
        if (min && min == true) return scientists < 1 ? 1 : 0;

        // let totalEnergyConsumption = 0
        // totalEnergyConsumption += room.scientistEnergyConsumption()
        // totalEnergyConsumption += room.engineerEnergyConsumption()
        // totalEnergyConsumption += (rolesNeeded.length * room.energyCapacityAvailable) / 1500

        // TODO: Modify to return correct amount to consume energy, limited by RCL 8 and income as necessary

        let shouldBe = Math.floor((Utils.Utility.getBodyFor(room, this.baseBody, this.segment).filter(p => p == WORK).length) / (room.controller!.level == 8 ? 15 : (room.sources.length * 10) / 3));
        return shouldBe < scientists ? shouldBe - scientists : 0;
    }
}
