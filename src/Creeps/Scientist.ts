import { Process } from "Models/Process";
import { Logger } from "utils/Logger"
import { Role, Task, ProcessPriority, ProcessResult, LogLevel } from '../utils/Enums'

var scientist = {
    scientistUpgrading: function(creep: Creep) {
        let creepId = creep.id

        const upgradingTask = () => {
            Logger.log("CreepTask -> upgradingTask()", LogLevel.TRACE);

            let creep = Game.getObjectById(creepId);
            if (!creep) {
                Logger.log(creepId, LogLevel.FATAL);
                return ProcessResult.FAILED ;
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
    },
    dispatch: function(room: Room) {
        let scientists = room.creeps(Role.SCIENTIST)
        for (let scientist of scientists) {
            if (!scientist.memory.task) {
                global.scheduler.swapProcess(scientist, Task.SCIENTIST_UPGRADING)
            }
        }
    },
    shouldSpawn: function(room: Room): boolean {
        let sources = room.sources()
        let areAllSourcesRealized = sources.every(source => source.isHarvestingAtMaxEfficiency())

        let totalEnergyConsumption = 0
        totalEnergyConsumption += room.scientistEnergyConsumption()
        totalEnergyConsumption += room.engineerEnergyConsumption()
        Logger.log(`Total energy consumption: ${totalEnergyConsumption}`, LogLevel.DEBUG)
        Logger.log(`Harvester Work Potential: ${room.currentHarvesterWorkPotential()}`, LogLevel.DEBUG)

        let hasRemainingEnergyToUse = room.currentHarvesterWorkPotential() >= totalEnergyConsumption
        return areAllSourcesRealized && hasRemainingEnergyToUse
    },
    baseBody: [CARRY, MOVE, WORK, WORK],
    segment: [CARRY, WORK, WORK],
}

export default scientist;
