
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

    // The ideal count for harvesters is either the number of sources in the room
    // Or the number of bodyPartConstant [WORK] such that there are 5 WORK parts per source
    // We should calculate the feasibility of spawning a harvester that can support 5 work parts.
    // Early game, we are limited to 300 energy in one spawn, and with each extension we gain an additional
    // 50 energy. So we can calculate the number of extensions we need to support a harvester with 5 work parts.
    // If we are unable to support a single harvester with 5 work parts, we should spawn as many harvesters as we can
    // with as many work parts as we can, until we reach 10 per source, provided that source has enough space for those harvesters.
    private getIdealHarvesterCount(room: Room): number {
        const idealWorkParts = room.sources.length * 5;
        const potentialSpawnEnergy = room.energyCapacityAvailable

        // Can fulfil ideal work parts on one harvester per spawn
        if (potentialSpawnEnergy >= this.getBodyCost(this.idealCreepBody[HARVESTER])) {
            return room.sources.length
        }

        // Cannot fulfil ideal work parts on one harvester per spawn
        // We can only spawn minimum body parts, aka 1 work part per harvester
        // Return the number of valid positions in the room
        // If there are more than 10 * sourceCount, return 10 * sourceCount
        // Otherwise return the number of valid positions in the room
        if (potentialSpawnEnergy <= 300) {
            const sourcePositionsAvailable = room.sources
                .map(source => source.validPositions.length)
                .reduce((total, count) => total + count, 0)

            return Math.min(sourcePositionsAvailable, room.sources.length * 10)
        }

        // Can fulfil some of the work parts requirements
        const sourcePositionsAvailable = room.sources
            .map(source => source.validPositions.length)
            .reduce((total, count) => total + count, 0)

        return 0
    }

    private getIdealTruckerCount(room: Room): number {
        return 0
    }

    private getIdealScientistCount(room: Room): number {
        return 0
    }

    private getIdealEngineerCount(room: Room): number {
        return 0
    }

    private getIdealAnchorCount(room: Room): number {
        return 0
    }

    private getIdealFillerCount(room: Room): number {
        return 0
    }

    private getIdealAgentCount(room: Room): number {
        return 0
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
        HARVESTER: [WORK, CARRY, CARRY, MOVE, MOVE],
        TRUCKER: [CARRY, MOVE],
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
