import { Process } from "Models/Process";
import { Logger } from "utils/Logger"

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

            let controller = Game.rooms[creep.memory.homeRoom].controller;
            if (!controller) return ProcessResult.FAILED;

            var result = creep.praise(controller);
            if (result === OK) {
                return ProcessResult.RUNNING;
            }
            Logger.log(`${creep.name} generated error code ${result} while attempting to praise ${controller.structureType}${JSON.stringify(controller.pos)}.`, LogLevel.ERROR);
            return ProcessResult.INCOMPLETE;
        }

        creep.memory.task = Task.SCIENTIST_UPGRADING
        let newProcess = new Process(creep.name, ProcessPriority.LOW, upgradingTask)
        global.scheduler.addProcess(newProcess)
    },
    shouldSpawn: function(): boolean {
        return false
    },
    baseBody: [CARRY, MOVE, WORK, WORK],
    segment: [CARRY, WORK, WORK],
}

export default scientist;
