import {Process} from "../../../Models/Process"
import { Task, ProcessPriority } from "../../../utils/Enums"

export function harvesterEarlyTask(creep: Creep) {
    let creepId = creep.id

    const earlyTask = () => {
        let creep = Game.creeps[creepId]
    }

    creep.memory.task = Task.HARVESTER_EARLY
    let newProcess = new Process(creep.name, ProcessPriority.LOW, earlyTask)
    global.scheduler.addProcess(newProcess)
}

export function harvesterSource(creep: Creep) {
    let creepId = creep.id

    const sourceTask = () => {
        let creep = Game.creeps[creepId]
    }

    creep.memory.task = Task.HARVESTER_SOURCE
    let newProcess = new Process(creep.name, ProcessPriority.LOW, sourceTask)
    global.scheduler.addProcess(newProcess)
}
