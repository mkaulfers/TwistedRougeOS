
import { AGENT, ANCHOR, ENGINEER, FILLER, HARVESTER, Role, SCIENTIST, TRUCKER, nENGINEER, nHARVESTER, nRESERVER, nTRUCKER } from "Constants/RoleConstants";

class SpawnRule {
    constructor(
        public minHarvesters: number,
        public minTruckers: number,
        public minAgents: number,
        public minAnchors: number,
        public minFillers: number,
        public minEngineers: number,
        public minScientists: number,
        public minNHarvester: number,
        public minNTrucker: number,
        public minNEngineer: number,
        public minNReserver: number
    ) {}
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
        HARVESTER: (room: Room) => { return 2 },
        TRUCKER: (room: Room) => { return 2 },
        SCIENTIST: (room: Room) => { return 1 },
        AGENT: (room: Room) => { return 0 },
        ENGINEER: (room: Room) => { return 1 },
        ANCHOR: (room: Room) => { return 0 },
        FILLER: (room: Room) => { return 0 },
        nHARVESTER: (room: Room) => { return 0 },
        nTRUCKER: (room: Room) => { return 0 },
        nENGINEER: (room: Room) => { return 0 },
        nRESERVER: (room: Room) => { return 0 },
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
        HARVESTER: [WORK, CARRY, MOVE],
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
        HARVESTER:  new SpawnRule(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
        TRUCKER:    new SpawnRule(1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
        AGENT:      new SpawnRule(1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0),
        ANCHOR:     new SpawnRule(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
        FILLER:     new SpawnRule(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
        ENGINEER:   new SpawnRule(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
        SCIENTIST:  new SpawnRule(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
        nHARVESTER: new SpawnRule(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
        nTRUCKER:   new SpawnRule(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
        nENGINEER:  new SpawnRule(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
        nRESERVER:  new SpawnRule(0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0)
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
