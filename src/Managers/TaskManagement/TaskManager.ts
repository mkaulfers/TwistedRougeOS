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
            case Task.TRUCKER_HARVESTER:
                Roles.Trucker.truckerHarvester(creep)
                break
            case Task.TRUCKER_SCIENTIST:
                Roles.Trucker.truckerScientist(creep)
                break
            case Task.TRUCKER_STORAGE:
                Roles.Trucker.truckerStorage(creep)
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
        dispatchHarvesters(room.creeps(undefined))
        dispatchTruckers(room)
    }

    let process = new Process(`${roomName}_task_monitor`, ProcessPriority.CRITICAL, roomTaskMonitor)
    global.scheduler.addProcess(process)
}

function dispatchHarvesters(creeps: Creep[]) {
    let harvesters = creeps.filter(x => x.memory.role == Role.HARVESTER)
    if (creeps.filter(x => x.memory.role == Role.TRUCKER).length < 1) {
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

function dispatchTruckers(room: Room) {
    dispatchScientistsTruckers(room)
}

function dispatchScientistsTruckers(room: Room) {
    Logger.log(`Scientist Demand: ${scientistEnergyDemand(room)}`, LogLevel.DEBUG)
    Logger.log(`Trucker Demand Met: ${truckerScientistDemandMet(room)}`, LogLevel.DEBUG)

    if (scientistEnergyDemand(room) > truckerScientistDemandMet(room)) {
        let truckers = room.creeps(undefined).filter(x => x.memory.role == Role.TRUCKER)
        for (let trucker of truckers) {
            if (!trucker.memory.task || trucker.memory.task != Task.TRUCKER_SCIENTIST) {
                global.scheduler.swapProcess(trucker, Task.TRUCKER_SCIENTIST)
            }
        }
    } else {
        let truckers = room.creeps(undefined).filter(x => x.memory.role == Role.TRUCKER)
        for (let trucker of truckers) {
            if (!trucker.memory.task || trucker.memory.task != Task.TRUCKER_HARVESTER) {
                global.scheduler.swapProcess(trucker, Task.TRUCKER_HARVESTER)
            }
        }
    }
}


function scientistEnergyDemand(room: Room): number {
    let scientists = room.creeps(undefined).filter(x => x.memory.role == Role.SCIENTIST)
    let totalWorkParts = 0
    for (let scientist of scientists) {
        totalWorkParts += scientist.getActiveBodyparts(WORK)
    }

    let averageDistanceFromSourcesToStructures = room.averageDistanceFromSourcesToStructures()
    let totalDemand = totalWorkParts * (averageDistanceFromSourcesToStructures * trucker.carryModifier)
    return totalDemand
}

function truckerScientistDemandMet(room: Room): number {
    let demandMetByTrucker = 0
    let truckers = room.creeps(undefined).filter(x => x.memory.role == Role.TRUCKER)
    for (let _trucker of truckers) {
        demandMetByTrucker += _trucker.getActiveBodyparts(CARRY) * trucker.carryModifier
    }
    return demandMetByTrucker
}
