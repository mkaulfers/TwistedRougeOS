import { Process } from "Models/Process";
import { Logger } from "utils/Logger";
import { Roles } from "Creeps/Index";
import { Role, Task, ProcessPriority, ProcessResult, LogLevel } from '../../utils/Enums'
import trucker from "Creeps/Trucker";


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
                    return;
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
                Roles.Harvester.harvesterEarlyTask(creep)
                break
            case Task.HARVESTER_SOURCE:
                Roles.Harvester.harvesterSource(creep)
                break
            case Task.TRUCKER_STORAGE:
                Roles.Trucker.truckerStorage(creep)
                break
            case Task.TRUCKER_SCIENTIST:
                Roles.Trucker.truckerScientist(creep)
                break
            case Task.SCIENTIST_UPGRADING:
                Roles.Scientist.scientistUpgrading(creep)
                break
            case Task.ENGINEER_BUILDING:
                Roles.Engineer.engineerBuilding(creep)
                break
            case Task.ENGINEER_REPAIRING:
                Roles.Engineer.engineerRepairing(creep)
                break
            case Task.ENGINEER_UPGRADING:
                Roles.Engineer.engineerUpgrading(creep)
                break
        }
    }
}

export function scheduleRoomTaskMonitor(room: Room): void | ProcessResult {
    const roomName = room.name
    if (global.scheduler.processQueue.has(`${roomName}_task_monitor`)) { return }

    const roomTaskMonitor = () => {
        let room = Game.rooms[roomName]
        dispatchHarvesters(room)
        dispatchScientists(room)
        dispatchTruckers(room)
    }

    let process = new Process(`${roomName}_task_monitor`, ProcessPriority.CRITICAL, roomTaskMonitor)
    global.scheduler.addProcess(process)
}

function dispatchHarvesters(room: Room) {
    let harvesters = room.creeps(Role.HARVESTER)
    let truckers = room.creeps(Role.TRUCKER)
    if (truckers.length < 1) {
        for (let harvester of harvesters) {
            if (!harvester.memory.task || harvester.memory.task == Task.HARVESTER_SOURCE) {
                global.scheduler.swapProcess(harvester, Task.HARVESTER_EARLY)
            }
        }
    } else {
        for (let harvester of harvesters) {
            if (!harvester.memory.task || harvester.memory.task == Task.HARVESTER_EARLY) {
                global.scheduler.swapProcess(harvester, Task.HARVESTER_SOURCE)
            }
        }
    }
}

function dispatchScientists(room: Room) {
    let scientists = room.creeps(Role.SCIENTIST)
    for (let scientist of scientists) {
        if (!scientist.memory.task) {
            global.scheduler.swapProcess(scientist, Task.SCIENTIST_UPGRADING)
        }
    }
}

function dispatchTruckers(room: Room) {
    let truckersCapacity = room.truckersCarryCapacity()
    let isSpawnDemandMet = room.isSpawnDemandMet()
    let isScientistDemandMet = room.isScientistDemandMet()

    Logger.log(`Trucker Capacity: ${truckersCapacity}`, LogLevel.DEBUG)
    Logger.log(`Spawn Demand: ${isSpawnDemandMet.demand}`, LogLevel.DEBUG)
    Logger.log(`Scientist Demand: ${isScientistDemandMet.demand}`, LogLevel.DEBUG)

    if (!isSpawnDemandMet.met || room.creeps(Role.SCIENTIST).length < 1) {
        dispatchStorageTruckers(room)
    } else {
        dispatchScientistTruckers(room)
    }
}

function dispatchStorageTruckers(room: Room) {
    let truckers = room.creeps(Role.TRUCKER)

    for (let trucker of truckers) {
        if (!trucker.memory.task) {
            global.scheduler.swapProcess(trucker, Task.TRUCKER_STORAGE)
        }
    }
}

function dispatchScientistTruckers(room: Room) {
    let truckers = room.creeps(Role.TRUCKER)

    for (let trucker of truckers) {
        if (!trucker.memory.task) {
            global.scheduler.swapProcess(trucker, Task.TRUCKER_SCIENTIST)
        }
    }

    if (truckers.filter(trucker => trucker.memory.task == Task.TRUCKER_SCIENTIST).length < 1) {
        for (let trucker of truckers) {
            trucker.memory.task = undefined
        }
    }
}







