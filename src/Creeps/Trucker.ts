import { Process } from "Models/Process";
import { Utils } from "utils/Index"
import { Logger } from "utils/Logger";
import { Role, Task, ProcessPriority, ProcessResult, LogLevel } from '../utils/Enums'

var trucker = {
    truckerStorage: function(creep: Creep) {
        let creepId = creep.id

        const truckerHarvesterTask = () => {
            Utils.Logger.log("CreepTask -> truckerHarvesterTask()", LogLevel.TRACE)

            let creep = Game.getObjectById(creepId)
            if (!creep) { return ProcessResult.FAILED }

            let room = Game.rooms[creep.memory.homeRoom]

            if (creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
                let lowestSpawn = room.lowestSpawn()!
                creep.give(lowestSpawn, RESOURCE_ENERGY)
            } else {
                let source = room.sourceWithMostDroppedEnergy()
                let target = source?.droppedEnergy()
                if (!target) { return ProcessResult.FAILED }

                let result = creep.take(target, RESOURCE_ENERGY)
                if (result == OK) {
                    return ProcessResult.RUNNING
                }
            }

            return ProcessResult.INCOMPLETE
        }

        creep.memory.task = Task.TRUCKER_STORAGE
        let newProcess = new Process(creep.name, ProcessPriority.LOW, truckerHarvesterTask)
        global.scheduler.addProcess(newProcess)
    },
    truckerScientist: function(creep: Creep) {
        let creepId = creep.id;

        const truckerScientistTask = () => {
            Utils.Logger.log("CreepTask -> truckerScientistTask()", LogLevel.TRACE);
            let creep = Game.getObjectById(creepId);
            if (!creep) { return ProcessResult.FAILED; }

            let room = Game.rooms[creep.memory.homeRoom];

            if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                let lowestScientist = room.lowestScientist()!
                creep.give(lowestScientist, RESOURCE_ENERGY)
            } else {
                let source = room.sourceWithMostDroppedEnergy()
                let target = source?.droppedEnergy()
                if (!target) { return ProcessResult.FAILED }

                let result = creep.take(target, RESOURCE_ENERGY)
                if (result == OK) {
                    return ProcessResult.RUNNING
                }
            }
            return ProcessResult.INCOMPLETE
        }

        creep.memory.task = Task.TRUCKER_SCIENTIST
        let newProcess = new Process(creep.name, ProcessPriority.LOW, truckerScientistTask)
        global.scheduler.addProcess(newProcess)
    },
    shouldSpawn(room: Room): boolean {
        if (room.creeps().filter(x => x.memory.role == Role.HARVESTER).length < 1) { return false }
        Logger.log(`Trucker Carry Capacity: ${room.truckersCarryCapacity()}`, LogLevel.DEBUG)
        Logger.log(`Demand to Meet: ${room.currentHarvesterWorkPotential() * (room.averageDistanceFromSourcesToStructures() * this.carryModifier)}`, LogLevel.DEBUG)
        if (room.truckersCarryCapacity() > room.currentHarvesterWorkPotential() * (room.averageDistanceFromSourcesToStructures() * this.carryModifier)) { return false }
        return true
    },
    baseBody: [CARRY, CARRY, CARRY, MOVE, MOVE, MOVE],
    segment: [CARRY, CARRY, MOVE],
    carryModifier: 2
}

export default trucker;
