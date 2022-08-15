import {Process} from "../../../Models/Process"
import { Task, ProcessPriority } from "../../../utils/Enums"

export function engineerBuilding(creep: Creep) {
    let creepId = creep.id

    const buildingTask = () => {
        let creep = Game.creeps[creepId]
    }

    creep.memory.task = Task.ENGINEER_BUILDING
    let newProcess = new Process(creep.name, ProcessPriority.LOW, buildingTask)
    global.scheduler.addProcess(newProcess)
}

export function engineerRepairing(creep: Creep) {
    let creepId = creep.id

    const repairingTask = () => {
        let creep = Game.creeps[creepId]
    }

    creep.memory.task = Task.ENGINEER_REPAIRING
    let newProcess = new Process(creep.name, ProcessPriority.LOW, repairingTask)
    global.scheduler.addProcess(newProcess)
}

export function engineerUpgrading(creep: Creep) {
    let creepId = creep.id

    const upgradingTask = () => {
        let creep = Game.creeps[creepId]
    }

    creep.memory.task = Task.ENGINEER_UPGRADING
    let newProcess = new Process(creep.name, ProcessPriority.LOW, upgradingTask)
    global.scheduler.addProcess(newProcess)
}
