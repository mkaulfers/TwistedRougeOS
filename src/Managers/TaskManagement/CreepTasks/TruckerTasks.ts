import {Process} from "../../../Models/Process"
import { Task, ProcessPriority } from "../../../utils/Enums"

export function truckerHarvester(creep: Creep) {
    let creepId = creep.id

    const harvesterTask = () => {
        let creep = Game.creeps[creepId]
    }

    creep.memory.task = Task.TRUCKER_HARVESTER
    let newProcess = new Process(creep.name, ProcessPriority.LOW, harvesterTask)
    global.scheduler.addProcess(newProcess)
}

export function truckerScientist(creep: Creep) {
    let creepId = creep.id

    const scientistTask = () => {
        let creep = Game.creeps[creepId]
    }

    creep.memory.task = Task.TRUCKER_SCIENTIST
    let newProcess = new Process(creep.name, ProcessPriority.LOW, scientistTask)
    global.scheduler.addProcess(newProcess)
}

export function truckerStorage(creep: Creep) {
    let creepId = creep.id

    const storageTask = () => {
        let creep = Game.creeps[creepId]
    }

    creep.memory.task = Task.TRUCKER_STORAGE
    let newProcess = new Process(creep.name, ProcessPriority.LOW, storageTask)
    global.scheduler.addProcess(newProcess)
}
