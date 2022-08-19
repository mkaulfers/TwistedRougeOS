import { Utils } from '../utils/Index'
import { Roles } from '../Creeps/Index';
import { Role, Task, ProcessPriority, ProcessResult, LogLevel } from '../utils/Enums'

/**
* ------------------------------------------------------------------
* GENERATE BODY
* ------------------------------------------------------------------
*/

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

/**
 * ------------------------------------------------------------------
 * SPAWN UTILITY FUNCTIONS
 * ------------------------------------------------------------------
 */

 export function bodyCost(body: BodyPartConstant[]): number {
    let sum = 0;
    for (let i in body)
        sum += BODYPART_COST[body[i]];
    return sum;
}

export function generateNameFor(role: Role) {
    return Utils.Utility.truncateString(role) + "_" + Utils.Utility.truncateString(Game.time.toString(), 4, false)
}

/**
 * This will need to generate a task for the creeps memory to hold on to so that it knows what to do after spawning.
 */
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
