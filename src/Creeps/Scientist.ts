import { Process } from "Models/Process";
import { Logger } from "utils/Logger"
import { Role, Task, ProcessPriority, ProcessResult, LogLevel } from '../utils/Enums'

export class Scientist extends Creep {

    static baseBody = [CARRY, MOVE, WORK, WORK]
    static segment = [CARRY, WORK, WORK]

    static scientistUpgrading(creep: Creep) {
        let creepId = creep.id

        const upgradingTask = () => {
            Logger.log("CreepTask -> upgradingTask()", LogLevel.TRACE);

            let creep = Game.getObjectById(creepId);
            if (!creep) {
                Logger.log(creepId, LogLevel.FATAL);
                return ProcessResult.FAILED;
            }

            if (!Game.rooms[creep.memory.homeRoom]) return ProcessResult.FAILED;
            let controller = Game.rooms[creep.memory.homeRoom].controller;
            if (!controller) return ProcessResult.FAILED;

            var result = creep.praise(controller);
            if (result === OK || result === ERR_NOT_ENOUGH_ENERGY) {
                return ProcessResult.RUNNING;
            }
            Logger.log(`${creep.name} generated error code ${result} while attempting to praise ${controller.structureType}${JSON.stringify(controller.pos)}.`, LogLevel.ERROR);
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

    static shouldSpawn(room: Room): boolean {
        let scientists = room.localCreeps.scientists
        let controller = room.controller
        if (!controller) return false

        if (room.scientistsWorkCapacity() >= 15 && controller.level == 8) { return false }

        let sources = room.sources
        let areAllSourcesRealized = sources.every(source => source.isHarvestingAtMaxEfficiency)

        let totalEnergyConsumption = 0
        totalEnergyConsumption += room.scientistEnergyConsumption()
        totalEnergyConsumption += room.engineerEnergyConsumption()

        let hasRemainingEnergyToUse = room.currentHarvesterWorkPotential() >= totalEnergyConsumption
        return areAllSourcesRealized && hasRemainingEnergyToUse || scientists.length < controller.level && room.localCreeps.harvesters.length > 0
    }
}
