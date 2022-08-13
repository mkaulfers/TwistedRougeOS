import { Role, Task } from "../utils/Enums";
import { Logger, LogLevel } from "../utils/Logger";
import { Utility } from "utils/Utilities";

/**
 * ------------------------------------------------------------------
 * SPAWN PROPERTIES
 * ------------------------------------------------------------------
 */

 const baseEngBody: BodyPartConstant[] = [CARRY, MOVE, WORK, WORK]
 const baseHarBody: BodyPartConstant[] = [MOVE, MOVE, WORK, WORK]
 const baseSciBody: BodyPartConstant[] = [CARRY, MOVE, WORK, WORK]
 const baseTruBody: BodyPartConstant[] = [CARRY, CARRY, CARRY, MOVE, MOVE, MOVE]

 const engSegment: BodyPartConstant[] = [CARRY, WORK, WORK]
 const harSegment: BodyPartConstant[] = [WORK]
 const sciSegment: BodyPartConstant[] = [CARRY, WORK, WORK]
 const truSegment: BodyPartConstant[] = [CARRY, CARRY, MOVE]

 /**
 * ------------------------------------------------------------------
 * GENERATE BODY
 * ------------------------------------------------------------------
 */

export function getBodyFor(room: Room, role: Role): BodyPartConstant[] {
    Logger.log("Spawn -> getBodyFor()", LogLevel.TRACE)
    let tempBody: BodyPartConstant[] = []
    let tempSegment: BodyPartConstant[] = []

    switch (role) {
        case Role.ENGINEER:
            tempBody = baseEngBody
            tempSegment = engSegment
            break
        case Role.HARVESTER:
            tempBody = baseHarBody
            tempSegment = harSegment
            break
        case Role.SCIENTIST:
            tempBody = baseSciBody
            tempSegment = sciSegment
            break
        case Role.TRUCKER:
            tempBody = baseTruBody
            tempSegment = truSegment
            break
    }

    let baseCost = bodyCost(tempBody)
    if (baseCost > room.energyAvailable) {
        return []
    }
    if (baseCost <= room.energyAvailable) {
        let additionalSegmentCount = Math.floor(( room.energyAvailable - baseCost) / bodyCost(tempSegment))
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

 function bodyCost(body: BodyPartConstant[]): number {
    let sum = 0;
    for (let i in body)
        sum += BODYPART_COST[body[i]];
    return sum;
}

function generateNameFor(role: Role) {
    return Utility.truncateString(role) + "_" + Utility.truncateString(Game.time.toString(), 4, false)
}

/**
 * This will need to generate a task for the creeps memory to hold on to so that it knows what to do after spawning.
 */
function generateTaskFor(role: Role): Task | undefined {
    switch (role) {
        case Role.TRUCKER:
            break;
    }
    return undefined
}
