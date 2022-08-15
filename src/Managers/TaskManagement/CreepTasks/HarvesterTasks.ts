import { Utility } from "utils/Utilities"
import {Process} from "../../../Models/Process"
import { Task, ProcessPriority, ProcessResult } from "../../../utils/Enums"

export function harvesterEarlyTask(creep: Creep) {
    let creepId = creep.id

    const earlyTask = () => {
        let creep = Game.creeps[creepId]
        let sources = Game.rooms[creep.room.name].find(FIND_SOURCES)
        let closestSource = creep.pos.findClosestByPath(sources)
        let lowestEnergySpawn = Game.rooms[creep.room.name].find(FIND_MY_SPAWNS).sort((a, b) => a.store.energy - b.store.energy)[0]

        if (creep.store.energy == creep.store.getCapacity() && lowestEnergySpawn.store.energy < lowestEnergySpawn.store.getCapacity()!) {
            let result = creep.transfer(Game.spawns[creep.room.name], RESOURCE_ENERGY)
            if (result == ERR_NOT_IN_RANGE) {
                creep.moveTo(Game.spawns[creep.room.name])
            } else {
                return ProcessResult.FAILED
            }
        } else if (closestSource) {
            let result = creep.harvest(closestSource)
            switch (result) {
                case OK:
                    break;
                case ERR_NOT_IN_RANGE:
                    creep.moveTo(closestSource);
                    break;
                default:
                    return ProcessResult.INCOMPLETE
            }
        }

        return ProcessResult.RUNNING
    }

    creep.memory.task = Task.HARVESTER_EARLY
    let newProcess = new Process(creep.name, ProcessPriority.LOW, earlyTask)
    global.scheduler.addProcess(newProcess)
}

export function harvesterSource(creep: Creep) {
    let creepId = creep.id

    const sourceTask = () => {
        let creep = Game.creeps[creepId]
        let sourcePos = Utility.findPosForSource(creep)
        let source = sourcePos?.findInRange(FIND_SOURCES, 2)[0]

        if (source) {
            let result = creep.harvest(source)
            switch (result) {
                case OK:
                    break;
                case ERR_NOT_IN_RANGE:
                    creep.moveTo(source);
                    break;
                default:
                    return ProcessResult.INCOMPLETE
            }
        }

        return ProcessResult.RUNNING
    }

    creep.memory.task = Task.HARVESTER_SOURCE
    let newProcess = new Process(creep.name, ProcessPriority.LOW, sourceTask)
    global.scheduler.addProcess(newProcess)
}
