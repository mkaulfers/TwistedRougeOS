
import { HIGH } from "Constants/ProcessPriorityConstants";
import { RUNNING } from "Constants/ProcessStateConstants";
import { AGENT, ANCHOR, ENGINEER, FILLER, HARVESTER, Role, Roles, SCIENTIST, TRUCKER, nENGINEER, nHARVESTER, nRESERVER, nTRUCKER } from "Constants/RoleConstants"
import { Process } from "Models/Process";
import SpawnOrder from "Models/SpawnOrder";
import SpawnQueue from "Models/SpawnQueue";
import SpawnRule from "Models/SpawnRule";
import Utility from "utils/Utilities"

const creepConfig: {
    [role: string]: {
        baseBody: BodyPartConstant[],
        bodySegment: BodyPartConstant[],
        partLimits: { [rule: string]: number },
        spawnRule: SpawnRule
    }
} = {
    harvester: {
        baseBody: [CARRY, MOVE, WORK, WORK],
        bodySegment: [WORK],
        partLimits: { maxWork: 5, maxCarry: 1 },
        spawnRule: new SpawnRule({})
    },
    trucker: {
        baseBody: [CARRY, CARRY, CARRY, MOVE, MOVE, MOVE],
        bodySegment: [MOVE, CARRY, CARRY],
        partLimits: { maxCarry: 25, maxMove: 25 },
        spawnRule: new SpawnRule({ HARVESTER: 1 })
    },
    scientist: {
        baseBody: [CARRY, MOVE, WORK, WORK],
        bodySegment: [CARRY, WORK, WORK],
        partLimits: {},
        spawnRule: new SpawnRule({ HARVESTER: 1, TRUCKER: 1 })
    },
    agent: {
        baseBody: [MOVE],
        bodySegment: [],
        partLimits: { maxMove: 1 },
        spawnRule: new SpawnRule({ HARVESTER: 1, TRUCKER: 1 })
    },
    engineer: {
        baseBody: [CARRY, CARRY, MOVE, MOVE, WORK],
        bodySegment: [CARRY, WORK, MOVE, MOVE],
        partLimits: {},
        spawnRule: new SpawnRule({ HARVESTER: 1, TRUCKER: 1, AGENT: 1, SCIENTIST: 1, ENGINEER: 1 })
    },
    anchor: {
        baseBody: [CARRY, CARRY, CARRY, CARRY, CARRY, MOVE],
        bodySegment: [CARRY],
        partLimits: {},
        spawnRule: new SpawnRule({ HARVESTER: 1, TRUCKER: 1, AGENT: 1, FILLER: 1, ENGINEER: 1, SCIENTIST: 1 })
    },
    filler: {
        baseBody: [CARRY, CARRY, CARRY, CARRY, CARRY, MOVE],
        bodySegment: [CARRY],
        partLimits: {},
        spawnRule: new SpawnRule({ HARVESTER: 1, TRUCKER: 1, AGENT: 1, ENGINEER: 1, SCIENTIST: 1 })
    },
    nHarvester: {
        baseBody: [CARRY, MOVE, WORK],
        bodySegment: [CARRY, MOVE, WORK],
        partLimits: {},
        spawnRule: new SpawnRule({})
    },
    nTrucker: {
        baseBody: [CARRY, CARRY, CARRY, MOVE, MOVE, MOVE],
        bodySegment: [MOVE, CARRY],
        partLimits: {},
        spawnRule: new SpawnRule({})
    }
};

export default class SpawnManagerNew {
    spawnQueue: SpawnQueue

    private idealRoleCount: { [role: string]: (room: Room) => number } = {
        harvester: (room: Room): number => { return this.getIdealHarvesterCount(room) },
        trucker: (room: Room): number => { return this.getIdealTruckerCount(room) },
        scientist: (room: Room) => { return this.getIdealScientistCount(room) },
        engineer: (room: Room) => { return this.getIdealEngineerCount(room) },
        anchor: (room: Room) => { return this.getIdealAnchorCount(room) },
        filler: (room: Room) => { return this.getIdealFillerCount(room) },
        agent: (room: Room) => { return this.getIdealAgentCount(room) },
        nHarvester: (room: Room) => { return this.getIdealnHarvesterCount(room) },
        nTrucker: (room: Room) => { return this.getIdealnTruckerCount(room) }
    }

    private getIdealRoleCountFor(room: Room, role: Role): number {
        const CACHE_EXPIRY_TICKS = 50;  // Refresh the cache every 50 ticks (adjust as needed);

        if (!global.roleCountCache) {
            global.roleCountCache = {};
        }

        const cache = global.roleCountCache[room.name];
        if (cache && (Game.time - cache.timestamp < CACHE_EXPIRY_TICKS)) {
            return cache.roleCounts[role];
        }

        const newRoleCounts: { [role: string]: number } = {};
        for (const roleKey in this.idealRoleCount) {
            newRoleCounts[roleKey] = this.idealRoleCount[roleKey](room);
        }

        global.roleCountCache[room.name] = {
            timestamp: Game.time,
            roleCounts: newRoleCounts
        };

        return newRoleCounts[role];
    }

    private getIdealHarvesterCount(room: Room): number {
        const idealWorkParts = room.sources.length * 5
        const sourcePositionsAvailable = room.sources.reduce((total, source) => total + source.pos.validPositions.length, 0)
        const workPartsCount = this.countBodyPart(WORK, this.getCreepBodyFor(HARVESTER, room))
        return Math.min(Math.ceil(idealWorkParts / workPartsCount), sourcePositionsAvailable)
    }

    private getIdealTruckerCount(room: Room): number {
        const totalEnergyHarvested = this.getIdealHarvesterCount(room) * this.countBodyPart(WORK, this.getCreepBodyFor(HARVESTER, room)) * 2
        const truckerCarryCapacity = this.countBodyPart(CARRY, this.getCreepBodyFor(TRUCKER, room)) * 50
        const worstCaseEnergyTransport = 500
        return Math.ceil(totalEnergyHarvested / Math.max(truckerCarryCapacity, worstCaseEnergyTransport))
    }

    private getIdealScientistCount(room: Room): number {
        let controller = room.controller
        if (!controller) return 0

        let sourceCount = room.sources.length
        let energyIncome = room.energyIncome == 0 ? sourceCount * 10 : room.energyIncome
        let bodyWorkCount = this.countBodyPart(WORK, this.getCreepBodyFor(SCIENTIST, room))

        let idealScientistCount

        if (controller.level === 8) {
            idealScientistCount = Math.ceil(15 / bodyWorkCount)
        } else if (room.storage && room.storage.store.energy > 500000) {
            idealScientistCount = Math.ceil(energyIncome * 2 / bodyWorkCount)
        } else {
            idealScientistCount = Math.ceil(energyIncome / 4 / bodyWorkCount)
        }

        return idealScientistCount
    }

    private getIdealEngineerCount(room: Room): number {
        const constructionSitesCount = room.constructionSites().length
        if (!(room.controller && room.controller.my && room.controller.level >= 2)) return 0
        if (constructionSitesCount === 0 && room.find(FIND_STRUCTURES).length === 0) return 0
        if (room.storage && room.storage.store.energy < 50000) return 1
        if (constructionSitesCount > 10) return 3
        if (constructionSitesCount > 5) return 2
        return 1
    }

    private getIdealAnchorCount(room: Room): number {
        return room.isAnchorFunctional ? 1 : 0
    }

    private getIdealFillerCount(room: Room): number {
        return room.areFastFillerExtensionsBuilt ? 4 : 0
    }

    private getIdealAgentCount(room: Room): number {
        return 1
    }

    private getIdealnHarvesterCount(room: Room): number {
        return 0
    }

    private getIdealnTruckerCount(room: Room): number {
        return 0
    }

    private getCreepBodyFor(role: Role, room: Room): BodyPartConstant[] {
        const energyCapacity = room.energyCapacityAvailable
        const baseBody = creepConfig[role].baseBody
        const bodySegment = creepConfig[role].bodySegment
        const baseBodyCost = Utility.bodyCost(baseBody)
        const segmentCost = Utility.bodyCost(bodySegment)

        if (energyCapacity < baseBodyCost + segmentCost) return baseBody

        const maxSegments = Math.floor((energyCapacity - baseBodyCost) / segmentCost)
        let currentBody = baseBody.slice()
        let allowedSegments = 0;

        for (let i = 0; i < maxSegments; i++) {
            if (this.willExceedRules(role, currentBody, bodySegment)) break
            if (currentBody.length + bodySegment.length >= 50) break
            allowedSegments++
        }

        for (let i = 0; i < allowedSegments; i++) {
            currentBody = currentBody.concat(bodySegment)
        }

        return currentBody
    }

    private willExceedRules(role: Role, body: BodyPartConstant[], segment: BodyPartConstant[]): boolean {
        const newBody = body.concat(segment)
        const rules = creepConfig[role].partLimits
        for (const [part, max] of Object.entries(rules)) {
            const count = this.countBodyPart(part as BodyPartConstant, newBody)
            if (count > max) return true
        }
        return false
    }

    private countBodyPart(part: BodyPartConstant, body: BodyPartConstant[]): number {
        return body.filter(p => p === part).length
    }

    static scheduleSpawnManager(room: Room) {
        const roomId = room.name

        const spawnManagerTask = () => {
            const room = Game.rooms[roomId]

            if (!global.spawnManager) {
                global.spawnManager = {};
            }

            if (!global.spawnManager[room.name]) {
                global.spawnManager[room.name] = new SpawnManagerNew(roomId);
            }

            const manager = global.spawnManager[room.name]
            const queue = manager.spawnQueue
            const timeToNextCreepDeath = room.nextCreepToDie?.ticksToLive ?? 0

            if (queue.canTakeOrders && timeToNextCreepDeath < 150 || room.stationedCreeps.all.length === 0) {
                for (const role of Roles) {

                    const allCreeps = [...room.stationedCreeps.all];
                    const idealCountForRole = manager.getIdealRoleCountFor(room, role as Role);
                    let currentCount = allCreeps.filter(creep => creep.memory.role === role).length;

                    if (currentCount < idealCountForRole) {
                        let order = new SpawnOrder(
                            manager.getCreepBodyFor(role as Role, room),
                            role as Role
                        );
                        queue.queueOrder(order);
                    }
                }
            }

            manager.spawnQueue.processSpawnOrders()

            return RUNNING;
        }

        let newProcess = new Process(`${room.name}_spawn_manager`, HIGH, spawnManagerTask)
        global.scheduler.addProcess(newProcess)
    }

    private constructor(roomId: string) {
        this.spawnQueue = new SpawnQueue(roomId)
    }
}
