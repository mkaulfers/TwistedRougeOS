import { Console } from "console"
import { Logger, LogLevel } from "utils/Logger"
import { Utility } from "utils/Utilities"
import { Process } from "../../../Models/Process"
import { Task, ProcessPriority, ProcessResult } from "../../../utils/Enums"

export function harvesterEarlyTask(creep: Creep) {
    let creepId = creep.id

    const earlyTask = () => {
        let creep = Game.creeps[creepId]
        let sources = Game.rooms[creep.room.name].find(FIND_SOURCES)
        let closestSource = creep.pos.findClosestByPath(sources)
        let lowestEnergySpawn = Game.rooms[creep.room.name].find(FIND_MY_SPAWNS).sort((a, b) => a.store.energy - b.store.energy)[0]

        if (creep.store.energy == creep.store.getCapacity() && lowestEnergySpawn.store.energy < lowestEnergySpawn.store.getCapacity()!) {
            let result = creep.transfer(Game.spawns[lowestEnergySpawn.name], RESOURCE_ENERGY)
            if (result == ERR_NOT_IN_RANGE) {
                creep.moveTo(Game.spawns[lowestEnergySpawn.name])
            }
            return ProcessResult.RUNNING
        } else if (closestSource) {
            let result = creep.harvest(closestSource)
            if (result == ERR_NOT_IN_RANGE) {
                creep.moveTo(closestSource);
            }
            return ProcessResult.RUNNING
        }
        return ProcessResult.INCOMPLETE
    }

    creep.memory.task = Task.HARVESTER_EARLY
    let newProcess = new Process(creep.name, ProcessPriority.LOW, earlyTask)
    global.scheduler.addProcess(newProcess)
}

export function harvesterSource(creep: Creep) {
    let creepId = creep.id

    const sourceTask = () => {
        let creep = Game.getObjectById(creepId)
        if (!creep) { return ProcessResult.FAILED }
        //log creepId
        Logger.log(creepId, LogLevel.WARN)
        let sourcePos = Utility.findPosForSource(creep)
        let source = sourcePos?.findInRange(FIND_SOURCES, 2)[0]

        if (source) {
            let result = creep.harvest(source)
            if (result == ERR_NOT_IN_RANGE) {
                creep.moveTo(source);
            }
            return ProcessResult.RUNNING
        }
        return ProcessResult.INCOMPLETE
    }

    creep.memory.task = Task.HARVESTER_SOURCE
    let newProcess = new Process(creep.name, ProcessPriority.LOW, sourceTask)
    global.scheduler.addProcess(newProcess)
}
