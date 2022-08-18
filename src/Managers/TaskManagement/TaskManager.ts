import { Process } from "Models/Process"
import { Logger } from "utils/Logger"
import { harvesterEarlyTask, harvesterSource } from "./CreepTasks/HarvesterTasks"
import { truckerHarvester, truckerScientist, truckerStorage} from "./CreepTasks/TruckerTasks"
import { scientistUpgrading } from "./CreepTasks/ScientistTasks"
import { engineerBuilding, engineerRepairing, engineerUpgrading } from "./CreepTasks/EngineerTasks"
import "../SpawnManager"

export function scheduleSpawnMonitor(room: Room) {
    const roomId = room.name

    const spawnMonitorTask = () => {
        let room = Game.rooms[roomId]
        let availableSpawn = room.getAvailableSpawn()

        if (availableSpawn) {
            for (let i = 0; i < Object.keys(Role).length; i++) {
                let role = Object.values(Role)[i]
                Logger.log(`Room -> scheduleSpawnMonitor() -> role: ${role}`, LogLevel.TRACE)
                let result = room.shouldSpawn(role)
                if (result) {
                    room.spawnCreep(role, availableSpawn)
                }
            }
        }
    }

    let newProcess = new Process(`${room.name}_spawn_monitor`, ProcessPriority.LOW, spawnMonitorTask)
    global.scheduler.addProcess(newProcess)
}

export function scheduleCreepTask(room: Room) {
    Logger.log("Room -> scheduleCreepTask()", LogLevel.TRACE)
    let creeps = room.creeps(undefined)
    for (let i = 0; i < creeps.length; i++) {
        let creep = creeps[i]
        if (global.scheduler.processQueue.has(creep.name)) { continue }

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


