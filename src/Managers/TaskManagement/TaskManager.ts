import { Process } from "Models/Process"
import { Task } from "utils/Enums"
import { Logger, LogLevel } from "utils/Logger"
import { ProcessPriority, ProcessResult } from "../../utils/Enums"
import { harvesterEarlyTask, harvesterSource } from "./CreepTasks/HarvesterTasks"
import { truckerHarvester, truckerScientist, truckerStorage} from "./CreepTasks/TruckerTasks"
import { scientistUpgrading } from "./CreepTasks/ScientistTasks"
import { engineerBuilding, engineerRepairing, engineerUpgrading } from "./CreepTasks/EngineerTasks"
import { schedulePixelSale, scheduleThreatMonitor} from "./UtilityTasks"


Room.prototype.scheduleTasks = function () {
    Logger.log("Room -> setupTasks()", LogLevel.TRACE)
    schedulePixelSale()
    scheduleThreatMonitor(this)
    scheduleCreepTask(this)
    // scheduleSpawnMonitor(this)
}

function scheduleCreepTask(room: Room) {
    let creeps = _.filter(Game.creeps, (c) => c.room.name === room.name)
    for (let i = 0; i < creeps.length; i++) {
        let creep = creeps[i]
        if (global.scheduler.processQueue.has(creep.name)) { return }

        switch (creep.memory.task as Task) {
            case Task.HARVESTER_EARLY:
                harvesterEarlyTask(creep)
                break
            case Task.HARVESTER_SOURCE:
                harvesterSource(creep)
                break
            case Task.TRUCKER_HARVESTER:
                truckerHarvester(creep)
                break
            case Task.TRUCKER_SCIENTIST:
                truckerScientist(creep)
                break
            case Task.TRUCKER_STORAGE:
                truckerStorage(creep)
                break
            case Task.SCIENTIST_UPGRADING:
                scientistUpgrading(creep)
                break
            case Task.ENGINEER_BUILDING:
                engineerBuilding(creep)
                break
            case Task.ENGINEER_REPAIRING:
                engineerRepairing(creep)
                break
            case Task.ENGINEER_UPGRADING:
                engineerUpgrading(creep)
                break
        }
    }
}


