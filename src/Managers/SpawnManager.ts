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
* Spawn Flags
* ------------------------------------------------------------------
*/

Room.prototype.shouldSpawn = function (role: Role): boolean {
    switch (role) {
        case Role.ENGINEER:
            return shouldSpawnEngineer()
        case Role.HARVESTER:
            return shouldSpawnHarvester()
        case Role.SCIENTIST:
            return shouldSpawnScientist()
        case Role.TRUCKER:
            return shouldSpawnTrucker()
    }
}

Room.prototype.roleToPreSpawn = function (): Role {
    return Role.HARVESTER
}

function shouldSpawnEngineer(): boolean {
    return false
}

function shouldSpawnHarvester(): boolean {
    return true
}

function shouldSpawnScientist(): boolean {
    return false
}

function shouldSpawnTrucker(): boolean {
    return false
}

/**
* ------------------------------------------------------------------
* GENERATE BODY
* ------------------------------------------------------------------
*/

function getBodyFor(room: Room, role: Role): BodyPartConstant[] {
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

Room.prototype.spawnCreep = function(role: Role) {
    Logger.log("Spawn -> spawnCreep()", LogLevel.TRACE)
    let body = getBodyFor(this, role)
    let name = generateNameFor(role)
    let task = generateTaskFor(role, this)
    let availableSpawn = getAvailableSpawn(this)

    if (availableSpawn) {
        availableSpawn.spawnCreep(
            body,
            name, {
            memory: {
                task: task,
                role: role,
                working: false,
                target: undefined,
                homeRoom: this.name
            }
        })
    }
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
function generateTaskFor(role: Role, room: Room): Task | undefined {
    Logger.log("Spawn -> generateTaskFor()", LogLevel.TRACE)
    switch (role) {
        case Role.HARVESTER:
            if (room.creeps(Role.TRUCKER).length > 0) {
                return Task.HARVESTER_EARLY
            }
            return Task.HARVESTER_SOURCE
        case Role.TRUCKER:
            break;
    }
    return undefined
}

function getAvailableSpawn(room: Room): StructureSpawn | undefined {
    Logger.log("Spawn -> getAvailableSpawn()", LogLevel.TRACE)
    //Loop over all spawns in the room and return the first one that is not busy.
    for (let spawn of room.find(FIND_MY_SPAWNS)) {
        if (spawn.spawning == null) {
            return spawn
        }
    }
    return undefined
}
