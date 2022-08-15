import {Process} from "../../../Models/Process"
import { Task, ProcessPriority } from "../../../utils/Enums"

export function scientistUpgrading(creep: Creep) {
    let creepId = creep.id

    const upgradingTask = () => {
        let creep = Game.creeps[creepId]
    }

    creep.memory.task = Task.SCIENTIST_UPGRADING
    let newProcess = new Process(creep.name, ProcessPriority.LOW, upgradingTask)
    global.scheduler.addProcess(newProcess)
}
