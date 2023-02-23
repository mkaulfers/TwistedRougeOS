import { TRACE } from 'Constants/LogConstants';
import { HUB } from 'Constants/StampConstants';
import { Logger } from './Logger';
interface IPrototype {
    prototype?: any
}

export class Utility {
    static packPosition(pos: RoomPosition): number
    static packPosition(pos: { wx: number, wy: number }): number
    static packPosition(pos: any): number {
        return pos.x * 50 + pos.y
    }

    static packPositionArray(pos: RoomPosition[]): number[] {
        let result: number[] = []
        for (let i = 0; i < pos.length; i++) {
            result.push(Utility.packPosition(pos[i]))
        }
        return result
    }

    static unpackPostionToRoom(flatPos: number, roomName: string): RoomPosition {
        let x = Math.floor(flatPos / 50)
        let y = Math.floor(flatPos % 50)
        return new RoomPosition(x, y, roomName)
    }

    static truncateString(string: string, length: number = 3, fromFront: boolean = true) {
        if (fromFront) {
            return (string.length > length) ? `${string.substring(0, length)}` : string
        }
        return string.slice(length * -1)
    }

    static distanceTransform(roomName: string): CostMatrix {
        const terrain = Game.map.getRoomTerrain(roomName);
        const topDownPass = new PathFinder.CostMatrix();

        // Perform top-down pass
        for (let y = 0; y < 50; ++y) {
            for (let x = 0; x < 50; ++x) {
                if (terrain.get(x, y) === TERRAIN_MASK_WALL) {
                    topDownPass.set(x, y, 0);
                } else {
                    topDownPass.set(x, y,
                        Math.min(topDownPass.get(x - 1, y - 1) ?? Infinity, topDownPass.get(x, y - 1) ?? Infinity,
                            topDownPass.get(x + 1, y - 1) ?? Infinity, topDownPass.get(x - 1, y) ?? Infinity) + 1);
                }
            }
        }

        // Perform bottom-up pass
        for (let y = 49; y >= 0; --y) {
            for (let x = 49; x >= 0; --x) {
                const value = Math.min(topDownPass.get(x, y),
                    topDownPass.get(x + 1, y + 1) + 1, topDownPass.get(x, y + 1) + 1,
                    topDownPass.get(x - 1, y + 1) + 1, topDownPass.get(x + 1, y) + 1);
                topDownPass.set(x, y, value);
            }
        }

        return topDownPass;
    }

    /**
     * Description: Organizes potential targets based on ResourceConstant && StructureType, and sorts them in a defined order. Don't do both hits and resource.
     * @param targets An array of potential targets.
     * @param opts.needs Targets need the supplied purpose?
     * @param opts.structures Acceptable structures for the target to be, if it is a structure.
     * @param opts.order 'desc' or 'asc'. Defaults to descending.
     * @returns An array of targets that are filtered and sorted based on requisites.
     */
    static organizeTargets(purpose: ResourceConstant | 'hits', targets: (Creep | AnyStructure | Resource | Tombstone | ConstructionSite | Ruin)[], opts?: {
        needs?: boolean,
        structures?: StructureConstant[],
        order?: ('desc' | 'asc')
    }): any[] {
        // TODO: Find a way to infer return type based supplied target type where used.

        // Set default opts, overriding with provided.
        opts = Object.assign({
            order: 'desc'
        }, opts ?? {})

        // Separate logic based on purpose:
        switch (purpose) {
            case 'hits':
                targets = _
                .chain(targets)
                .filter(function(t) {
                    return (("hits" in t && (opts?.needs !== true || t.hitsMax !== t.hits)) || "progress" in t && (opts?.needs !== true || t.progressTotal !== t.progress)) && (!("structureType" in t) || (!opts?.structures || opts.structures.indexOf(t.structureType) >= 0))
                })
                .sortByOrder(function(t: (Creep | AnyStructure | Resource | Tombstone | ConstructionSite | Ruin)) {
                    if ("hits" in t) {
                        let value = t.hitsMax / t.hits;
                        return value === 1 ? t.hitsMax : value;
                    } else if ("progress" in t) {
                        let value = t.progressTotal / t.progress;
                        return value === 1 ? t.progressTotal : value;
                    } else {
                        return 1;
                    }
                }, opts.order)
                .value()
                break;
            default:
                targets = _
                .chain(targets)
                .filter(function(t) {
                    let result = false;
                    if ("store" in t && (opts?.needs !== true ? t.store[purpose] > 0 : t.store[purpose] !== undefined)) result = true;
                    if ("amount" in t && opts?.needs !== true) result = true;
                    if ("structureType" in t && !("destroyTime" in t) && (opts?.structures?.indexOf(t.structureType) === -1)) result = false;
                    return result;
                })
                .sortByOrder(function(t: (Creep | AnyStructure | Resource | Tombstone | ConstructionSite | Ruin)) {
                    if ("store" in t) return t.store[purpose];
                    if ("amount" in t) return t.amount;
                    return 0;
                }, opts.order)
                .value()
        }

        return targets;
    }

    /**
     * A function that converts class properties to prototypes.
     * @param base The class you wish to add prototypes to
     * @param extra The class containing the prototypes
     */
    static extendClass(base: IPrototype, extra: IPrototype) {
        let descs = Object.getOwnPropertyDescriptors(extra.prototype)
        delete descs.prototype
        Object.defineProperties(base.prototype, descs)
    }

    static roomNameToCoords = (roomName: string) => {
        let match = roomName.match(/^([WE])([0-9]+)([NS])([0-9]+)$/)
        if (!match) throw new Error('Invalid room name')
        let [, h, wx, v, wy] = match
        return {
            wx: h == 'W' ? Number(wx) : ~Number(wx),
            wy: v == 'S' ? Number(wy) : ~Number(wy)
        }
    }

    static roomNameFromCoords = (x: number, y: number) => {
        let h = x < 0 ? 'E' : 'W'
        let v = y < 0 ? 'N' : 'S'
        x = x < 0 ? ~x : x
        y = y < 0 ? ~y : y
        return `${h}${x}${v}${y}`
    }

    static bodyCost(body: BodyPartConstant[]): number {
        if (!body || body.length == 0) return ERR_INVALID_ARGS;
        let sum = 0;
        for (let i in body)
            sum += BODYPART_COST[body[i]];
        return sum;
    }

    /**
     * Generates a body for a creep taking into account factors such as maximum cost, supportable cost given income, etc.
     * @param opts.overrideELimit Overrides energy income body cost limitations.
     * @param opts.sortOrder Sort order override, in ascending order numerically.
     * @param opts.sizeLimit Set max body size. Defaults to 50.
     * Defaults to TOUGH, WORK, ATTACK, RANGED_ATTACK, CARRY, MOVE, HEAL, and CLAIM with values ranging from 0-7 respectively.
     */
    static getBodyFor(room: Room, baseBody: BodyPartConstant[], segment: BodyPartConstant[], partLimits?: number[], opts?: { sizeLimit?: number, overrideELimit?: boolean, sortOrder?: { [key in BodyPartConstant]?: number } }): BodyPartConstant[] {
        Logger.log("SpawnManager -> getBodyFor()", TRACE)

        let tempBody = [...baseBody];
        let tempSegment = [...segment];

        // Build partLimits
        if (!partLimits) partLimits = [];
        const refPartLimitsArray = tempSegment.filter((p, i) => tempSegment.indexOf(p) === i);

        // Fallback partLimits Missing Catcher
        if (partLimits.length === 0 && tempSegment.length !== 0) {
            partLimits = this.buildPartLimits(tempBody, tempSegment);
        }

        // SizeLimit Handler
        let sizeLimit = 50;
        if (opts?.sizeLimit && opts.sizeLimit > 0 && opts.sizeLimit <= 50) sizeLimit = opts.sizeLimit;

        // Determine energy limit for body generation
        // Current limit: No single creep consumes more than a 20th of our income.
        let eLimit: number = room.spawnEnergyLimit;
        if (opts && opts.overrideELimit === true) eLimit = room.energyCapacityAvailable;

        // Expand tempBody to correct size given limits
        let baseCost = Utility.bodyCost(tempBody)
        if (baseCost > eLimit || tempBody.length > sizeLimit) return [];
        if (baseCost <= eLimit && tempSegment.length > 0) {
            let additionalSegmentCount = Math.floor((eLimit - baseCost) / Utility.bodyCost(tempSegment)) + 1

            // Built partCounts
            let partCounts: number[] = [];
            refPartLimitsArray.forEach((p, i) => partCounts[i] = 0);
            tempBody.forEach(function (p) {
                let i = refPartLimitsArray.indexOf(p);
                if (i >= 0) partCounts[i]++;
            });
            for (let i = 0; i < additionalSegmentCount && tempBody.length < sizeLimit; i++) {
                for (const part of tempSegment) {
                    if (tempBody.length + 1 > sizeLimit) break;
                    if (Utility.bodyCost(tempBody.concat([part])) >= eLimit) break;
                    let refIndex = refPartLimitsArray.indexOf(part);
                    if (refIndex >= 0 && partCounts[refIndex] >= partLimits[refIndex]) continue
                    partCounts[refIndex]++;
                    tempBody.push(part);
                }
            }
        }

        // Sort tempBody
        tempBody = _.sortBy(tempBody, function (p) {
            switch (p) {
                case TOUGH:
                    return opts?.sortOrder && opts.sortOrder.tough ? opts.sortOrder.tough : 0;
                case WORK:
                    return opts?.sortOrder && opts.sortOrder.work ? opts.sortOrder.work : 1;
                case ATTACK:
                    return opts?.sortOrder && opts.sortOrder.attack ? opts.sortOrder.attack : 2;
                case RANGED_ATTACK:
                    return opts?.sortOrder && opts.sortOrder.ranged_attack ? opts.sortOrder.ranged_attack : 3;
                case CARRY:
                    return opts?.sortOrder && opts.sortOrder.carry ? opts.sortOrder.carry : 4;
                case MOVE:
                    return opts?.sortOrder && opts.sortOrder.move ? opts.sortOrder.move : 5;
                case HEAL:
                    return opts?.sortOrder && opts.sortOrder.heal ? opts.sortOrder.heal : 6;
                case CLAIM:
                    return opts?.sortOrder && opts.sortOrder.claim ? opts.sortOrder.claim : 7;
            }
        });

        Logger.log(`Temp Body Length: ${tempBody.length}`, TRACE)
        return tempBody
    }

    /**
     * Each number represents max number of each part in the tempSegment, when only the first of each unique bodypart used is kept.
     * Example: [CARRY, CARRY, MOVE, CARRY, MOVE, WORK] would have a partLimits reference array of [CARRY, MOVE, WORK]
     */
    static buildPartLimits(tempBody: BodyPartConstant[], tempSegment: BodyPartConstant[]): number[] {
        Logger.log("SpawnManager -> buildPartLimits()", TRACE)
        // Separate delivered from used
        let usedBody = [...tempBody];
        let usedSegment = [...tempSegment];

        if (usedSegment.length == 0) return [];
        // Builds a proportional partLimits that mimics the segments ratios while fully utilizing the max body size.
        const refPartLimitsArray = usedSegment.filter((p, i) => usedSegment.indexOf(p) === i);
        let freePartsPortion = Math.floor((50 - usedBody.length) / usedSegment.length);
        let partLimits: number[] = [];

        refPartLimitsArray.forEach((p, i) => partLimits[i] = 0);
        usedBody.forEach(function (p) {
            let i = refPartLimitsArray.indexOf(p);
            if (i >= 0) partLimits[i] += partLimits[i]
        });
        usedSegment.forEach(function (p) {
            partLimits[refPartLimitsArray.indexOf(p)] += freePartsPortion;
        })
        let unusedParts = 50 - partLimits.reduce((previousValue, currentValue) => previousValue + currentValue);
        for (let i = 0; i < unusedParts; i++) {
            let segIndex: number = i;
            while (segIndex >= usedSegment.length) segIndex -= usedSegment.length;

            partLimits[refPartLimitsArray.indexOf(usedSegment[segIndex])] += 1;
        }
        return partLimits;
    }

    /** Checks room's threat level for pathing purposes. */
    static checkRoomSafety(roomName: string) {
        let roomMemory = Memory.rooms[roomName];
        if (!roomMemory || !roomMemory.intel) return
        if (roomMemory.intel.threatLevel > 1) return Infinity
        return undefined
    }

    static genPathfindingCM(roomName: string): CostMatrix {
        let cm = new PathFinder.CostMatrix();
        const room = Game.rooms[roomName];
        if (!room) return cm;

        if (!room.cache.pathfindingCM || Game.time % 1500 == 0 || (Game.time % 100 == 0 && room.cache.recentlyAttacked)) {
            const terrain = Game.map.getRoomTerrain(roomName);

            // Consider source and mineral adjacent positions
            let consider: (Mineral | Source)[] = [...room.sources];
            room.mineral ? consider.push(room.mineral) : 0;
            for (const thing of consider) {
                for (let x = -1; x <= 1; x++) {
                    for (let y = -1; y <= 1; y++) {
                        if (terrain.get(thing.pos.x + x, thing.pos.y + y) == TERRAIN_MASK_WALL) continue;
                        let lookArray = room.lookForAt(LOOK_STRUCTURES, thing.pos.x + x, thing.pos.y + y)
                        if (lookArray.findIndex((s) => s.structureType == STRUCTURE_CONTAINER) >= 0) {
                            cm.set(thing.pos.x + x, thing.pos.y + y, 45);
                        } else {
                            cm.set(thing.pos.x + x, thing.pos.y + y, 50);
                        }
                    }
                }
            }

            // Consider finished Fast Filler stamp
            if (room.memory.blueprint && room.areFastFillerExtensionsBuilt) {
                let anchorPos = this.unpackPostionToRoom(room.memory.blueprint.anchor, room.name)
                for (let x = -2; x <= 2; x++) {
                    for (let y = -2; y <= 2; y++) {
                        cm.set(anchorPos.x + x, anchorPos.y + y, 50);
                    }
                }
            }

            // Consider Anchor
            if (room.memory.blueprint && room.isAnchorFunctional) {
                const anchorStamp = room.memory.blueprint.stamps.find((s) => s.type === HUB);
                let anchorStampPos: RoomPosition | undefined;
                if (anchorStamp) anchorStampPos = this.unpackPostionToRoom(anchorStamp.stampPos, room.name);
                if (anchorStampPos) cm.set(anchorStampPos.x, anchorStampPos.y, 50);
            }

            // Consider Portals
            for (const portal of room.portals) cm.set(portal.pos.x, portal.pos.y, 255);

            room.cache.pathfindingCM = JSON.stringify(cm.serialize());
        }

        return PathFinder.CostMatrix.deserialize(JSON.parse(room.cache.pathfindingCM));
    }
}
