import { Process } from "Models/Process"
import { Task } from "utils/Enums"
import { Logger, LogLevel } from "utils/Logger"
import { ProcessPriority, ProcessResult, Role } from "../../utils/Enums"
import { harvesterEarlyTask, harvesterSource } from "./CreepTasks/HarvesterTasks"
import { truckerHarvester, truckerScientist, truckerStorage} from "./CreepTasks/TruckerTasks"
import { scientistUpgrading } from "./CreepTasks/ScientistTasks"
import { engineerBuilding, engineerRepairing, engineerUpgrading } from "./CreepTasks/EngineerTasks"
import { schedulePixelSale, scheduleThreatMonitor} from "./UtilityTasks"
import "../SpawnManager"


Room.prototype.scheduleTasks = function () {
    Logger.log("Room -> setupTasks()", LogLevel.TRACE)
    schedulePixelSale()
    scheduleThreatMonitor(this)
    scheduleCreepTask(this)
    scheduleSpawnMonitor(this)
}

function scheduleSpawnMonitor(room: Room) {
    const roomId = room.name

    const spawnMonitorTask = () => {
        let room = Game.rooms[roomId]
        // Loop through all role enum and check if a creep should spawn
        for (let i = 0; i < Object.keys(Role).length; i++) {
            let role = Object.values(Role)[i]
            Logger.log(`Room -> scheduleSpawnMonitor() -> role: ${role}`, LogLevel.TRACE)
            let result = room.shouldSpawn(role)
            if (result) {
                room.spawnCreep(role)
            }
        }
    }

    let newProcess = new Process(`${room.name}_spawn_monitor`, ProcessPriority.LOW, spawnMonitorTask)
    global.scheduler.addProcess(newProcess)
}

function scheduleCreepTask(room: Room) {
    Logger.log("Room -> scheduleCreepTask()", LogLevel.TRACE)
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


