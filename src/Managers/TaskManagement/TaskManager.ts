import { Process } from "Models/Process";
import { Logger } from "utils/Logger";
import { Roles } from "Creeps/Index";
import { Role, Task, ProcessPriority, ProcessResult, LogLevel, StampType } from '../../utils/Enums'
import { Utils } from "utils/Index";
import { Stamp } from "Models/Stamps";
import { planRoom } from "utils/RoomPlanner";


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
        let roles = _.keys(Roles) as Array<keyof typeof Roles>; // triage change to make this role-confirming section work.

        _.forEach(roles, function(role) {
            if (room.creeps().length < 1) { return }
            Roles[role].dispatch(room);
        });
    }

    let process = new Process(`${roomName}_task_monitor`, ProcessPriority.CRITICAL, roomTaskMonitor)
    global.scheduler.addProcess(process)
}

export function scheduleConstructionMonitor(room: Room): void | ProcessResult {
    const roomName = room.name

    if (global.scheduler.processQueue.has(`${roomName}_construction_monitor`)) { return }

    const constructionMonitor = () => {
        let room = Game.rooms[roomName]
        let controller = room.controller
        if (!controller) { return }

        if (Game.cpu.bucket > 500 && Game.time % 100 === 0) {
            planRoom(room, false)
        }

        let blueprint = room.memory.blueprint
        if (blueprint) {
            switch (controller.level) {
                case 8:
                case 7:
                case 6:
                case 5:
                case 4:
                case 3:
                case 2:
                    let fastFiller = blueprint.stamps.find(s => s.type === StampType.FAST_FILLER)
                    if (fastFiller) {
                        Logger.log(`Level ${controller.level}`, LogLevel.DEBUG)
                        Stamp.build(Utils.Utility.unpackPostionToRoom(fastFiller.stampPos, room.name), fastFiller.type as StampType, [STRUCTURE_CONTAINER, STRUCTURE_ROAD])
                    }

                    let containers = blueprint.containers
                    if (containers) {
                        for (let container of containers) {
                            let containerPos = Utils.Utility.unpackPostionToRoom(container, room.name)
                            //If container is adjacent to a source build it.
                            if (containerPos.findInRange(FIND_SOURCES, 2).length > 0) {
                                containerPos.createConstructionSite(STRUCTURE_CONTAINER)
                            }
                        }
                    }
            }
        }
    }

    let process = new Process(`${roomName}_construction_monitor`, ProcessPriority.MEDIUM, constructionMonitor)
    global.scheduler.addProcess(process)
}
