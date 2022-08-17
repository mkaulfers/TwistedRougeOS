import { Logger, LogLevel } from "utils/Logger"
import { Utility } from "utils/Utilities"
import { Process } from "../../../Models/Process"
import { Task, ProcessPriority, ProcessResult } from "../../../utils/Enums"

export function scientistUpgrading(creep: Creep) {
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
}
