
import { AGENT, ANCHOR, ENGINEER, FILLER, HARVESTER, Role, SCIENTIST, TRUCKER, nENGINEER, nHARVESTER, nRESERVER, nTRUCKER } from "Constants/RoleConstants";

class SpawnRule {
    constructor(
        public rule: { [role in Role]?: number }
    ) { }

    getRequirement(role: Role): number {
        return this.rule[role] || 0;
    }
}

export default class SpawnManagerNew {
    partCosts: { [part: string]: number } = {
        MOVE: 50,
        WORK: 100,
        CARRY: 50,
        ATTACK: 80,
        RANGED_ATTACK: 150,
        HEAL: 250,
        CLAIM: 600,
        TOUGH: 10
    }

    rolePriority: Role[] = [
        HARVESTER,
        TRUCKER,
        SCIENTIST,
        AGENT,
        ENGINEER,
        ANCHOR,
        FILLER,
        nHARVESTER,
        nTRUCKER,
        nENGINEER,
        nRESERVER,
    ]

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
        const idealWorkParts = room.sources.length * 5;
        const sourcePositionsAvailable = room.sources.reduce((total, source) => total + source.validPositions.length, 0);
        const workPartsCount = this.countBodyPart(WORK, this.getCreepBodyFor(HARVESTER, room));
        return Math.min(Math.ceil(idealWorkParts / workPartsCount), sourcePositionsAvailable);
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
        const totalEnergyHarvested = this.getIdealHarvesterCount(room) * this.countBodyPart(WORK, this.getCreepBodyFor(HARVESTER, room)) * 2;
        const truckerCarryCapacity = this.countBodyPart(CARRY, this.getCreepBodyFor(TRUCKER, room)) * 50;
        const worstCaseEnergyTransport = 500;
        return Math.ceil(totalEnergyHarvested / Math.max(truckerCarryCapacity, worstCaseEnergyTransport));
    }

    private getIdealScientistCount(room: Room): number {
        return 0
    }

    private getIdealEngineerCount(room: Room): number {
        return 0
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

    getCreepBodyFor(role: Role, room: Room): BodyPartConstant[] {
        const availableEnergy = room.energyAvailable;
        const idealBody = this.idealCreepBody[role];
        const minBody = this.minimumCreepBody[role];
        const rules = this.creepBodyRules[role];
        const minBodyCost = this.getBodyCost(minBody);

        if (availableEnergy < minBodyCost) {
            return [];
        }

        if (availableEnergy === minBodyCost) {
            return minBody;
        }

        let currentBody: BodyPartConstant[] = [...minBody];
        let currentCost = minBodyCost;
        let uniqueParts = [...new Set(idealBody)];

        while (uniqueParts.length > 0 && currentCost < availableEnergy) {
            uniqueParts = uniqueParts.filter(part => this.countBodyPart(part, currentBody) < rules[`max${part[0].toUpperCase() + part.slice(1).toLowerCase()}`]);
            const uniquePartCost = uniqueParts.reduce((cost, part) => cost + this.partCosts[part], 0);

            if (currentCost + uniquePartCost > availableEnergy) {
                break;
            }

            currentBody = [...currentBody, ...uniqueParts];
            currentCost += uniquePartCost;
        }

        return currentBody;
    }

    countBodyPart(part: BodyPartConstant, body: BodyPartConstant[]): number {
        return body.filter(p => p === part).length;
    }

    getBodyCost(body: BodyPartConstant[]): number {
        return body.reduce((cost, part) => cost + this.partCosts[part], 0);
    }

    static runFor(room: Room) {

    }
}
