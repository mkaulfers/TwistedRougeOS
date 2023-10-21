
import { HIGH } from "Constants/ProcessPriorityConstants";
import { RUNNING } from "Constants/ProcessStateConstants";
import { AGENT, ANCHOR, ENGINEER, FILLER, HARVESTER, Role, SCIENTIST, TRUCKER, nENGINEER, nHARVESTER, nRESERVER, nTRUCKER } from "Constants/RoleConstants"
import { Process } from "Models/Process";
import SpawnOrder from "Models/SpawnOrder";
import SpawnQueue from "Models/SpawnQueue";
import Utility from "utils/Utilities"

type SpawnRuleDependencies = {
    [role: string]: number;
}

class SpawnRule {
    dependencies: SpawnRuleDependencies;

    constructor(deps: SpawnRuleDependencies) {
        this.dependencies = deps;
    }
}

const creepConfig: {
    [role: string]: {
        baseBody: BodyPartConstant[],
        bodySegment: BodyPartConstant[],
        partLimits: { [rule: string]: number },
        spawnRule: SpawnRule
    }
} = {
    HARVESTER: {
        baseBody: [CARRY, MOVE, WORK, WORK],
        bodySegment: [WORK],
        partLimits: { maxWork: 5, maxCarry: 1 },
        spawnRule: new SpawnRule({})
    },
    TRUCKER: {
        baseBody: [CARRY, CARRY, CARRY, MOVE, MOVE, MOVE],
        bodySegment: [MOVE, CARRY, CARRY],
        partLimits: { maxCarry: 25, maxMove: 25 },
        spawnRule: new SpawnRule({ HARVESTER: 1 })
    },
    SCIENTIST: {
        baseBody: [CARRY, MOVE, WORK, WORK],
        bodySegment: [CARRY, WORK, WORK],
        partLimits: {},
        spawnRule: new SpawnRule({ HARVESTER: 1, TRUCKER: 1 })
    },
    AGENT: {
        baseBody: [MOVE],
        bodySegment: [],
        partLimits: { maxMove: 1 },
        spawnRule: new SpawnRule({ HARVESTER: 1, TRUCKER: 1 })
    },
    ENGINEER: {
        baseBody: [CARRY, CARRY, MOVE, MOVE, WORK],
        bodySegment: [CARRY, WORK, MOVE, MOVE],
        partLimits: {},
        spawnRule: new SpawnRule({ HARVESTER: 1, TRUCKER: 1, AGENT: 1, SCIENTIST: 1, ENGINEER: 1 })
    },
    ANCHOR: {
        baseBody: [CARRY, CARRY, CARRY, CARRY, CARRY, MOVE],
        bodySegment: [CARRY],
        partLimits: {},
        spawnRule: new SpawnRule({ HARVESTER: 1, TRUCKER: 1, AGENT: 1, FILLER: 1, ENGINEER: 1, SCIENTIST: 1 })
    },
    FILLER: {
        baseBody: [CARRY, CARRY, CARRY, CARRY, CARRY, MOVE],
        bodySegment: [CARRY],
        partLimits: {},
        spawnRule: new SpawnRule({ HARVESTER: 1, TRUCKER: 1, AGENT: 1, ENGINEER: 1, SCIENTIST: 1 })
    },
    nHARVESTER: {
        baseBody: [CARRY, MOVE, WORK],
        bodySegment: [CARRY, MOVE, WORK],
        partLimits: {},
        spawnRule: new SpawnRule({})
    },
    nTRUCKER: {
        baseBody: [CARRY, CARRY, CARRY, MOVE, MOVE, MOVE],
        bodySegment: [MOVE, CARRY],
        partLimits: {},
        spawnRule: new SpawnRule({})
    }
};

export default class SpawnManagerNew {
    spawnQueue: SpawnQueue

    // TODO: Add a backing field to prevent duplicate computations. (e.g., _idealRoleCount)
    idealRoleCount: { [role: string]: (room: Room) => number } = {
        HARVESTER: (room: Room): number => { return this.getIdealHarvesterCount(room) },
        TRUCKER: (room: Room): number => { return this.getIdealTruckerCount(room) },
        SCIENTIST: (room: Room) => { return this.getIdealScientistCount(room) },
        ENGINEER: (room: Room) => { return this.getIdealEngineerCount(room) },
        ANCHOR: (room: Room) => { return this.getIdealAnchorCount(room) },
        FILLER: (room: Room) => { return this.getIdealFillerCount(room) },
        AGENT: (room: Room) => { return this.getIdealAgentCount(room) },
        nHARVESTER: (room: Room) => { return this.getIdealnHarvesterCount(room) },
        nTRUCKER: (room: Room) => { return this.getIdealnTruckerCount(room) }
    }

    /**
     * Calculate the ideal number of harvesters for a given room.
     *
     * The ideal harvester count is determined based on:
     * 1. The desired work parts count, calculated as 5 times the number of sources in the room.
     * 2. The number of available positions around each source in the room.
     * 3. The number of WORK parts in the harvester's body configuration.
     *
     * The function returns the minimum of:
     * a) The number of harvesters needed to fulfill the desired work parts count.
     * b) The number of harvesters that can be placed around sources based on available positions.
     *
     * @param {Room} room - The room for which to calculate the ideal harvester count.
     * @returns {number} The ideal number of harvesters for the room.
     */
    private getIdealHarvesterCount(room: Room): number {
        const idealWorkParts = room.sources.length * 5
        const sourcePositionsAvailable = room.sources.reduce((total, source) => total + source.validPositions.length, 0)
        const workPartsCount = this.countBodyPart(WORK, this.getCreepBodyFor(HARVESTER, room))
        return Math.min(Math.ceil(idealWorkParts / workPartsCount), sourcePositionsAvailable)
    }

    /**
     * Calculate the ideal number of truckers for a given room.
     *
     * The ideal trucker count is based on:
     * 1. The total energy harvested in the room, calculated using the ideal harvester count and the number of WORK parts in the harvester's body configuration.
     * 2. The capacity of a single trucker, derived from the number of CARRY parts in the trucker's body configuration.
     * 3. A worst-case scenario where a trucker would need to transport energy over a distance of 50 tiles.
     *
     * The function returns the number of truckers needed to transport the harvested energy, considering the larger of the actual trucker capacity and the worst-case scenario.
     *
     * @param {Room} room - The room for which to calculate the ideal trucker count.
     * @returns {number} The ideal number of truckers for the room.
     */
    private getIdealTruckerCount(room: Room): number {
        const totalEnergyHarvested = this.getIdealHarvesterCount(room) * this.countBodyPart(WORK, this.getCreepBodyFor(HARVESTER, room)) * 2
        const truckerCarryCapacity = this.countBodyPart(CARRY, this.getCreepBodyFor(TRUCKER, room)) * 50
        const worstCaseEnergyTransport = 500
        return Math.ceil(totalEnergyHarvested / Math.max(truckerCarryCapacity, worstCaseEnergyTransport))
    }

    /**
     * Calculate the ideal number of scientists for a given room.
     *
     * The ideal scientist count is determined based on several factors:
     *
     * 1. **Controller Level**: If the controller's level is 8, then the scientist count is primarily based on a fixed value (15 in this context).
     * 2. **Energy Income**: The room's energy income is calculated using the number of sources if no prior value exists. This energy income is used to determine the potential workload for the scientists.
     * 3. **Scientist's Work Capability**: The total WORK parts in a scientist's body configuration determine how effectively a scientist can process energy.
     * 4. **Room Storage**: If the energy in room storage exceeds a threshold (e.g., 500,000), this indicates a surplus, and the number of scientists should potentially be increased to utilize this surplus effectively.
     *
     * Based on these factors, the function computes the ideal number of scientists required for the room. If the room lacks a controller or storage, it's assumed that no scientists are needed.
     *
     * @param {Room} room - The room for which to calculate the ideal scientist count.
     * @returns {number} The ideal number of scientists for the room.
     */
    private getIdealScientistCount(room: Room): number {
        let controller = room.controller
        if (!controller || !room.storage) return 0

        let sourceCount = room.sources.length
        let energyIncome = room.energyIncome == 0 ? sourceCount * 10 : room.energyIncome
        let bodyWorkCount = this.countBodyPart(WORK, this.getCreepBodyFor(SCIENTIST, room))

        let idealScientistCount

        if (controller.level === 8) {
            idealScientistCount = Math.ceil(15 / bodyWorkCount)
        } else if (room.storage.store.energy > 500000) {
            idealScientistCount = Math.ceil(energyIncome * 2 / bodyWorkCount)
        } else {
            idealScientistCount = Math.ceil(energyIncome / 4 / bodyWorkCount)
        }

        return idealScientistCount
    }

    /**
     * Calculate the ideal number of engineers for a given room.
     *
     * The function determines the optimal number of engineers based on various room-specific conditions:
     *
     * 1. **Controller Ownership and Level**: The room must have a controller owned by the player and be of at least level 2.
     * 3. **Construction Sites**: The number of construction sites in a room influences the number of engineers. More sites might require more engineers for faster building.
     * 4. **Energy Storage**: If the room has storage with energy below a threshold (e.g., 50,000), it's considered optimal to have at least one engineer.
     *
     * Based on these criteria, the function returns the ideal number of engineers a room should have.
     *
     * @param {Room} room - The room for which to calculate the ideal engineer count.
     * @returns {number} The ideal number of engineers for the room.
     */
    private getIdealEngineerCount(room: Room): number {
        const constructionSitesCount = room.constructionSites().length
        if (!(room.controller && room.controller.my && room.controller.level >= 2)) return 0
        if (constructionSitesCount === 0 && room.find(FIND_STRUCTURES).length === 0) return 0
        if (room.storage && room.storage.store.energy < 50000) return 1
        if (constructionSitesCount > 10) return 3
        if (constructionSitesCount > 5) return 2
        return 1
    }

    /**
     * Determines the ideal number of Anchors for a given room.
     *
     * An Anchor is a specific type of unit that performs a particular role or set of actions.
     * This function determines whether the room requires an Anchor based on its functional status.
     *
     * @param {Room} room - The room in which the Anchor count is to be determined.
     * @returns {number} - Returns 1 if the room's anchor is functional, otherwise 0.
     */
    private getIdealAnchorCount(room: Room): number {
        return room.isAnchorFunctional ? 1 : 0
    }

    /**
     * Determines the ideal number of Fillers for a given room.
     *
     * A Filler is a specific type of unit designed to fill certain structures in a room.
     * This function determines the number of Fillers required based on the construction status
     * of specific extensions known as 'FastFillerExtensions' in the room.
     *
     * @param {Room} room - The room in which the Filler count is to be determined.
     * @returns {number} - Returns 4 if the room's FastFillerExtensions are built, otherwise 0.
     */
    private getIdealFillerCount(room: Room): number {
        return room.areFastFillerExtensionsBuilt ? 4 : 0
    }

    /**
     * Determines the ideal number of Agents for a given room.
     *
     * An Agent is a general-purpose unit that can perform various scouting and intelligence tasks.
     * Currently, the game logic dictates that each room should always have a single Agent
     * irrespective of other conditions. This may be subject to change based on future requirements.
     *
     * @param {Room} room - The room in which the Agent count is to be determined.
     * @returns {number} - Always returns 1, indicating the consistent need for one Agent in every room.
     */
    private getIdealAgentCount(room: Room): number {
        return 1
    }

    private getIdealnHarvesterCount(room: Room): number {
        return 0
    }

    private getIdealnTruckerCount(room: Room): number {
        return 0
    }

    /**
     * Determines the optimal body configuration for a creep based on its role and the energy available in the room.
     *
     * Creeps in the game are customizable units with different body parts that dictate their abilities.
     * This function generates the body configuration for a given creep role based on two primary factors:
     * 1. The amount of energy available in the room.
     * 2. Pre-defined ideal and minimum body configurations for the given role.
     *
     * The function returns an array of body parts based on these factors and certain rules
     * set for each role, ensuring the best possible configuration without exceeding the
     * available energy. If the available energy is insufficient even for the minimum body
     * configuration, an empty array is returned.
     *
     * @param {Role} role - The role for which the body configuration needs to be determined.
     * @param {Room} room - The room in which the creep will be spawned.
     *
     * @returns {BodyPartConstant[]} - An array of body parts forming the optimal body configuration
     *                                 for the given role based on the available energy in the room.
     */
    private getCreepBodyFor(role: Role, room: Room): BodyPartConstant[] {
        const energyCapacity = room.energyCapacityAvailable
        const baseBody = creepConfig[role].baseBody
        const bodySegment = creepConfig[role].bodySegment
        const baseBodyCost = Utility.bodyCost(baseBody)
        const segmentCost = Utility.bodyCost(bodySegment)

        if (energyCapacity < baseBodyCost + segmentCost) return baseBody

        const maxSegments = Math.floor((energyCapacity - baseBodyCost) / segmentCost)

        let currentBody = baseBody.slice()  // clone to avoid modifying the original

        let allowedSegments = 0;

        // Check how many segments can be added without violating the rules
        for (let i = 0; i < maxSegments; i++) {
            if (this.willExceedRules(role, currentBody, bodySegment)) break
            if (currentBody.length + bodySegment.length >= 50) break
            allowedSegments++
        }

        // Add all allowed segments at once
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
        const spawnManagerTask = () => {
            if (!global.spawnManager[room.name]) {
                global.spawnManager[room.name] = new SpawnManagerNew(room)
            }

            const manager = global.spawnManager[room.name]
            const queue = manager.spawnQueue

            if (queue.canTakeOrders) {
                // Loop over roles and check their ideal count
                // If the current count is less than the ideal count, add a spawn order
                for (const [role, idealCount] of Object.entries(manager.idealRoleCount)) {
                    const allCreeps = [...room.localCreeps.all, ...room.stationedCreeps.all]
                    let currentCount = allCreeps.filter(creep => creep.memory.role === role).length

                    if (currentCount < idealCount(room)) {
                        let order = new SpawnOrder(
                            manager.getCreepBodyFor(role as Role, room),
                            role as Role
                        )
                        queue.queueOrder(order)
                    }
                }
            }

            return RUNNING;
        }

        let newProcess = new Process(`${room.name}_spawn_manager`, HIGH, spawnManagerTask)
        global.scheduler.addProcess(newProcess)
    }

    private constructor(room: Room) {
        this.spawnQueue = new SpawnQueue(room)
    }
}
