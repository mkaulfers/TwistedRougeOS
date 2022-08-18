import {Process} from "../Models/Process"


var engineer = {
    engineerBuilding: function(creep: Creep) {
        let creepId = creep.id

        const buildingTask = () => {
            let creep = Game.getObjectById(creepId)
            // if (!creep) return ProcessResult.FAILED
        }

        creep.memory.task = Task.ENGINEER_BUILDING
        let newProcess = new Process(creep.name, ProcessPriority.LOW, buildingTask)
        global.scheduler.addProcess(newProcess)
    },
    engineerRepairing: function(creep: Creep) {
        let creepId = creep.id

        const repairingTask = () => {
            let creep = Game.getObjectById(creepId)
            // if (!creep) return ProcessResult.FAILED
        }

        creep.memory.task = Task.ENGINEER_REPAIRING
        let newProcess = new Process(creep.name, ProcessPriority.LOW, repairingTask)
        global.scheduler.addProcess(newProcess)
    },
    engineerUpgrading: function(creep: Creep) {
        let creepId = creep.id

        const upgradingTask = () => {
            let creep = Game.getObjectById(creepId)
            // if (!creep) return ProcessResult.FAILED
        }

        creep.memory.task = Task.ENGINEER_UPGRADING
        let newProcess = new Process(creep.name, ProcessPriority.LOW, upgradingTask)
        global.scheduler.addProcess(newProcess)
    },
    shouldSpawn: function(): boolean {
        return false
    },
    baseBody: [CARRY, MOVE, WORK, WORK],
    segment: [CARRY, MOVE, WORK, WORK],
}

export default engineer;
