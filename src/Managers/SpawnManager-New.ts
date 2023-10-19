
import { AGENT, ANCHOR, ENGINEER, FILLER, HARVESTER, Role, SCIENTIST, TRUCKER, nENGINEER, nHARVESTER, nRESERVER, nTRUCKER } from "Constants/RoleConstants"
import Utility from "utils/Utilities"

class SpawnRule {
    constructor(
        public rule: { [role in Role]?: number }
    ) { }

    getRequirement(role: Role): number {
        return this.rule[role] || 0
    }
}

export default class SpawnManagerNew {
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
        nTRUCKER: (room: Room) => { return this.getIdealnTruckerCount(room) },
        nENGINEER: (room: Room) => { return this.getIdealnEngineerCount(room) },
        nRESERVER: (room: Room) => { return this.getIdealnReserverCount(room) },
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

    private getIdealnEngineerCount(room: Room): number {
        return 0
    }

    private getIdealnReserverCount(room: Room): number {
        return 0
    }

    minimumRoleCount: { [role: string]: number } = {
        HARVESTER: 1,
        TRUCKER: 1,
        SCIENTIST: 1,
        AGENT: 1,
        ENGINEER: 1,
        ANCHOR: 0,
        FILLER: 0,
        nHARVESTER: 0,
        nTRUCKER: 0,
        nENGINEER: 0,
        nRESERVER: 0,
    }

    idealCreepBody: { [role: string]: BodyPartConstant[] } = {
        HARVESTER: [WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
        TRUCKER: [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
        SCIENTIST: [WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
        AGENT: [MOVE],
        ENGINEER: [WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
        ANCHOR: [CLAIM, MOVE],
        FILLER: [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
        nHARVESTER: [WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
        nTRUCKER: [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
        nENGINEER: [WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
        nRESERVER: [CLAIM, MOVE]
    }

    minimumCreepBody: { [role: string]: BodyPartConstant[] } = {
        HARVESTER: [WORK, CARRY, CARRY, MOVE, MOVE], // Cost: 300
        TRUCKER: [CARRY, CARRY, CARRY, MOVE, MOVE, MOVE], // Cost: 300
        SCIENTIST: [WORK, CARRY, MOVE],
        AGENT: [MOVE],
        ENGINEER: [WORK, CARRY, MOVE],
        ANCHOR: [CLAIM, MOVE],
        FILLER: [CARRY, MOVE],
        nHARVESTER: [WORK, CARRY, MOVE],
        nTRUCKER: [CARRY, MOVE],
        nENGINEER: [WORK, CARRY, MOVE],
        nRESERVER: [CLAIM, MOVE]
    }

    creepBodyRules: { [role: string]: { [rule: string]: number } } = {
        HARVESTER: { maxWork: 5, maxCarry: 1, maxMove: 6 },
        TRUCKER: { maxCarry: 6, maxMove: 6 },
        SCIENTIST: { maxWork: 5, maxCarry: 1, maxMove: 6 },
        AGENT: { maxMove: 1 },
        ENGINEER: { maxWork: 5, maxCarry: 1, maxMove: 6 },
        ANCHOR: { maxClaim: 1, maxMove: 1 },
        FILLER: { maxCarry: 6, maxMove: 6 },
        nHARVESTER: { maxWork: 5, maxCarry: 1, maxMove: 6 },
        nTRUCKER: { maxCarry: 6, maxMove: 6 },
        nENGINEER: { maxWork: 5, maxCarry: 1, maxMove: 6 },
        nRESERVER: { maxClaim: 1, maxMove: 1 }
    }

    creepSpawnRules: { [role: string]: SpawnRule } = {
        HARVESTER: new SpawnRule({}),
        TRUCKER: new SpawnRule({ [HARVESTER]: 1 }),
        AGENT: new SpawnRule({ [HARVESTER]: 1, [TRUCKER]: 1 }),
        ANCHOR: new SpawnRule({ [HARVESTER]: 1, [TRUCKER]: 1, [AGENT]: 1, [FILLER]: 1, [ENGINEER]: 1, [SCIENTIST]: 1 }),
        FILLER: new SpawnRule({ [HARVESTER]: 1, [TRUCKER]: 1, [AGENT]: 1, [ENGINEER]: 1, [SCIENTIST]: 1 }),
        ENGINEER: new SpawnRule({ [HARVESTER]: 1, [TRUCKER]: 1, [AGENT]: 1, [FILLER]: 1, [SCIENTIST]: 1 }),
        SCIENTIST: new SpawnRule({ [HARVESTER]: 1, [TRUCKER]: 1 }),
        nHARVESTER: new SpawnRule({}),
        nTRUCKER: new SpawnRule({}),
        nENGINEER: new SpawnRule({}),
        nRESERVER: new SpawnRule({})
    }

    private getSpawnableRoles(room: Room): Role[] {
        let localCreeps = room.localCreeps;
        let stationedCreeps = room.stationedCreeps;

        let roomHarvesters = localCreeps.harvester.length;
        let roomTruckers = localCreeps.trucker.length;
        let roomAgents = localCreeps.agent.length;
        let roomEngineers = localCreeps.engineer.length;
        let roomScientists = localCreeps.scientist.length;
        let roomAnchors = localCreeps.anchor.length;
        let roomFillers = localCreeps.filler.length;
        let roomnHarvesters = stationedCreeps.nHarvester.length;
        let roomnTruckers = stationedCreeps.nTrucker.length;
        let roomnEngineers = stationedCreeps.nEngineer.length;
        let roomnReservers = stationedCreeps.nReserver.length;

        let spawnableRoles: Role[] = [];
        spawnableRoles.push(HARVESTER);

        if (roomHarvesters > 0) {
            spawnableRoles.push(TRUCKER);
            spawnableRoles.push(AGENT);
            spawnableRoles.push(SCIENTIST);
        }

        if (roomHarvesters > 0 &&
            roomTruckers > 0) {
            spawnableRoles.push(ENGINEER);
            spawnableRoles.push(FILLER);
        }

        if (roomHarvesters > 0 &&
            roomTruckers > 0 &&
            roomAgents > 0 &&
            roomEngineers > 0 &&
            roomScientists > 0 &&
            roomFillers > 0) {
            spawnableRoles.push(ANCHOR);
        }

        spawnableRoles.push(nHARVESTER);
        spawnableRoles.push(nTRUCKER);
        spawnableRoles.push(nENGINEER);
        spawnableRoles.push(nRESERVER);

        return spawnableRoles;
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
        const availableEnergy = room.energyAvailable
        const idealBody = this.idealCreepBody[role]
        const minBody = this.minimumCreepBody[role]
        const rules = this.creepBodyRules[role]
        const minBodyCost = Utility.bodyCost(minBody)

        if (availableEnergy < minBodyCost) {
            return []
        }

        if (availableEnergy === minBodyCost) {
            return minBody
        }

        let currentBody: BodyPartConstant[] = [...minBody]
        let currentCost = minBodyCost
        let uniqueParts = [...new Set(idealBody)]

        while (uniqueParts.length > 0 && currentCost < availableEnergy) {
            uniqueParts = uniqueParts.filter(part => this.countBodyPart(part, currentBody) < rules[`max${part[0].toUpperCase() + part.slice(1).toLowerCase()}`])
            const uniquePartCost = Utility.bodyCost(uniqueParts)

            if (currentCost + uniquePartCost > availableEnergy) {
                break
            }

            currentBody = [...currentBody, ...uniqueParts]
            currentCost += uniquePartCost
        }

        return currentBody
    }

    private countBodyPart(part: BodyPartConstant, body: BodyPartConstant[]): number {
        return body.filter(p => p === part).length
    }

    static runFor(room: Room) {

    }
}
