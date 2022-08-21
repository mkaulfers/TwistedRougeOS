import { Process } from "Models/Process";
import { Logger } from "utils/Logger";
import { Roles } from "Creeps/Index";
import { Role, Task, ProcessPriority, ProcessResult, LogLevel, StampType } from '../../utils/Enums'
import { Utils } from "utils/Index";
import { Stamp } from "Models/Stamps";


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
        let costMatrix: CostMatrix | undefined = undefined
        if (!room.memory.costMatrix) {
            costMatrix = Utils.Utility.distanceTransform(roomName)
            room.memory.costMatrix = JSON.stringify(costMatrix.serialize())
        } else {
            costMatrix = PathFinder.CostMatrix.deserialize(JSON.parse(room.memory.costMatrix))
        }

        let result = costMatrix.get(21, 29)
        Logger.log(`Cost: ${result}`, LogLevel.DEBUG)
        let biggestSpace = 0
        let roomPosition: RoomPosition | undefined = undefined
        for (let x = 0; x < 50; x++) {
            for (let y = 0; y < 50; y++) {
                let cost = costMatrix.get(x, y)
                if (!roomPosition) {
                    roomPosition = new RoomPosition(x, y, roomName)
                } else {
                    if (cost > biggestSpace) {
                        biggestSpace = cost
                        roomPosition = new RoomPosition(x, y, roomName)
                    }
                }
            }
        }

        if (!roomPosition) { return }
        vizualizeRoom(roomPosition)
    }

    let process = new Process(`${roomName}_construction_monitor`, ProcessPriority.MEDIUM, constructionMonitor)
    global.scheduler.addProcess(process)
}

function vizualizeRoom(startPos: RoomPosition) {
    let room = Game.rooms[startPos.roomName]
    let stampsToBuild: { type: StampType, size: number }[] = [
        { type: StampType.FAST_FILLER, size: 5 },
        { type: StampType.EXTENSIONS, size: 5 },
        { type: StampType.EXTENSIONS, size: 5 },
        { type: StampType.EXTENSIONS, size: 5 },
        { type: StampType.EXTENSIONS, size: 5 },
        { type: StampType.EXTENSIONS, size: 5 },
        { type: StampType.EXTENSIONS, size: 5 },
        { type: StampType.EXTENSIONS, size: 5 },
        { type: StampType.EXTENSIONS, size: 5 },
        { type: StampType.ANCHOR, size: 3 },
        { type: StampType.LABS, size: 5 }
    ]

    let vizualizedPositions: RoomPosition[] = []

    for (let stamp of stampsToBuild) {
        let pos = Utils.Utility.findPosForStamp(startPos.x, startPos.y, stamp.size, room, vizualizedPositions.length > 0 ? vizualizedPositions : undefined)

        if (pos) {
            Logger.log(`Build Position: x ${pos.x}, y ${pos.y}`, LogLevel.DEBUG)
            let visualized = Stamp.build(pos, stamp.type, true)
            if (visualized) {
                vizualizedPositions.concat(visualized)
            }
        }
    }
}
