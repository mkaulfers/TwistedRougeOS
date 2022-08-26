import { Utils } from '../utils/Index'
import { Roles } from '../Creeps/Index';
import { Role, Task, ProcessPriority, ProcessResult, LogLevel } from '../utils/Enums'
import { Process } from 'Models/Process';

export function scheduleSpawnMonitor(room: Room) {
    const roomId = room.name

    const spawnMonitorTask = () => {
        let room = Game.rooms[roomId]
        let availableSpawn = room.getAvailableSpawn()

        if (availableSpawn) {
            for (let i = 0; i < Object.keys(Role).length; i++) {
                let role = Object.values(Role)[i]
                Utils.Logger.log(`Room -> scheduleSpawnMonitor() -> role: ${role}`, LogLevel.TRACE)
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

export function getBodyFor(room: Room, role: Role): BodyPartConstant[] {
    Utils.Logger.log("Spawn -> getBodyFor()", LogLevel.TRACE)
    let tempBody: BodyPartConstant[] = []
    let tempSegment: BodyPartConstant[] = []

    switch (role) {
        case Role.ENGINEER:
            tempBody = Roles.Engineer.baseBody
            tempSegment = Roles.Engineer.segment
            break
        case Role.HARVESTER:
            tempBody = Roles.Harvester.baseBody
            tempSegment = Roles.Harvester.segment
            break
        case Role.SCIENTIST:
            tempBody = Roles.Scientist.baseBody
            tempSegment = Roles.Scientist.segment
            break
        case Role.TRUCKER:
            tempBody = Roles.Trucker.baseBody
            tempSegment = Roles.Trucker.segment
            break
    }

    let baseCost = bodyCost(tempBody)
    if (baseCost > room.energyAvailable) {
        return []
    }
    if (baseCost <= room.energyAvailable) {
        let additionalSegmentCount = Math.floor((room.energyAvailable - baseCost) / bodyCost(tempSegment))
        for (let i = 0; i < additionalSegmentCount && tempBody.length < 50; i++) {
            switch (role) {
                case Role.HARVESTER:
                    if (tempBody.filter(x => x == WORK).length >= 5) { return tempBody }
                    tempBody = tempBody.concat(tempSegment)
                    break
                default:
                    tempBody = tempBody.concat(tempSegment)
            }
        }
    }
    return tempBody
}


 export function bodyCost(body: BodyPartConstant[]): number {
    let sum = 0;
    for (let i in body)
        sum += BODYPART_COST[body[i]];
    return sum;
}

export function generateNameFor(role: Role) {
    return Utils.Utility.truncateString(role) + "_" + Utils.Utility.truncateString(Game.time.toString(), 4, false)
}

 export function generateTaskFor(role: Role, room: Room): Task | undefined {
    Utils.Logger.log("Spawn -> generateTaskFor()", LogLevel.TRACE)
    switch (role) {
        case Role.HARVESTER:
            if (room.creeps(Role.TRUCKER).length < room.find(FIND_SOURCES).length) {
                return Task.HARVESTER_EARLY
            }
            return Task.HARVESTER_SOURCE
        case Role.TRUCKER:
            break;
        case Role.ENGINEER:
            return Task.ENGINEER_BUILDING;
    }
    return undefined
}
