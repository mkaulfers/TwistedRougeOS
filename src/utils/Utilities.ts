import { Logger } from './Logger';
import { Role, Task, ProcessPriority, ProcessResult, LogLevel } from './Enums';
import { Coord } from 'screeps-cartographer/dist/utils/packrat';

interface IPrototype {
    prototype?: any
}

export class Utility {
    static packPosition(pos: RoomPosition): number
    static packPosition(pos: {wx: number, wy: number}): number
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
        let vis = new RoomVisual(roomName)

        let topDownPass = new PathFinder.CostMatrix();
        for (let y = 0; y < 50; ++y) {
            for (let x = 0; x < 50; ++x) {
                if (Game.map.getRoomTerrain(roomName).get(x, y) == TERRAIN_MASK_WALL) {
                    topDownPass.set(x, y, 0)
                }
                else {
                    topDownPass.set(x, y,
                        Math.min(topDownPass.get(x - 1, y - 1), topDownPass.get(x, y - 1),
                            topDownPass.get(x + 1, y - 1), topDownPass.get(x - 1, y)) + 1)
                }
            }
        }

        for (let y = 49; y >= 0; --y) {
            for (let x = 49; x >= 0; --x) {
                let value = Math.min(topDownPass.get(x, y),
                    topDownPass.get(x + 1, y + 1) + 1, topDownPass.get(x, y + 1) + 1,
                    topDownPass.get(x - 1, y + 1) + 1, topDownPass.get(x + 1, y) + 1)
                topDownPass.set(x, y, value)
                // vis.circle(x, y, { radius: value / 15 });
            }
        }

        return topDownPass;
    }

    /**
     * Description: Organizes potential targets based on ResourceConstant && StructureType, and sorts them in a defined order. Don't do both hits and resource.
     * @param targets An array of potential targets: Creep | AnyStoreStructure | Resource | Tombstone.
     * @param options An object containing the following properties: `resource, structures, order`.
     * @returns An array of approved targets or undefined
     */
    static organizeTargets(targets: (Creep | AnyStructure | Resource | Tombstone | ConstructionSite | Ruin)[], options?: {

        hits?: boolean,
        resource?: ResourceConstant,
        rNeed?: boolean,
        structures?: StructureConstant[],
        order?: ('desc' | 'asc')
    }): any[] {

        if (!targets) return targets
        if (!options) options = {}
        if (!options.order) {
            options.order = 'desc'
        }
        if (options.hits && options.resource) return targets; // Need to modify to return error codes.

        targets = _
            .chain(targets)
            .filter(function (t) {

                if (!options || !options.structures && !options.resource) {
                    return t
                }
                if (options.structures) {
                    if ('structureType' in t && options.structures.indexOf(t.structureType) == -1) return;
                }
                if (options.hits) {
                    if (('hits' in t && t.hits === t.hitsMax) ||
                        ('remove' in t && t.progress === t.progressTotal) ||
                        (!('hits' in t) && !('remove' in t))) return
                }
                if (options.resource) {
                    if (('store' in t && t.store[options?.resource!] == 0) ||
                        ('amount' in t && t.amount < 5) ||
                        (!('store' in t) && !('amount' in t))) {
                        if (options.rNeed) {
                            return t;
                        } else {
                            return;
                        }
                    }
                }
                return t;

            })
            .sortByOrder(function (t: (Creep | AnyStructure | Resource | Tombstone | ConstructionSite)) {
                if (options?.resource) {
                    if ('store' in t) {
                        return t.store[options.resource];
                    } else if ('amount' in t) {
                        return t.amount
                    } else {
                        return
                    }
                } else if (options?.hits) {
                    if ('hits' in t) {
                        return t.hitsMax / t.hits;
                    } else if ('remove' in t) {
                        return t.progressTotal / t.progress;
                    } else {
                        return
                    }
                }
                return t
            }, options.order)
            .value()

        return targets
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
     * @param override Overrides energy income body cost limitations.
     * @param sortOrder Sort order override, in ascending order numerically.
     * Defaults to TOUGH, WORK, ATTACK, RANGED_ATTACK, CARRY, MOVE, HEAL, and CLAIM with values ranging from 0-7 respectively.
     */
     static getBodyFor(room: Room, baseBody: BodyPartConstant[], segment: BodyPartConstant[], partLimits?: number[], override?: boolean, sortOrder?: {[key in BodyPartConstant]?: number}): BodyPartConstant[] {
        Logger.log("SpawnManager -> getBodyFor()", LogLevel.TRACE)

        let tempBody = baseBody;
        let tempSegment = segment;

        // Build partLimits
        /**
         * Each number represents max number of each part in the tempSegment, when only the first of each unique bodypart used is kept.
         * Example: [CARRY, CARRY, MOVE, CARRY, MOVE, WORK] would have a partLimits reference array of [CARRY, MOVE, WORK]
         */
        if (!partLimits) partLimits = [];
        const refPartLimitsArray = tempSegment.filter((p, i) => tempSegment.indexOf(p) === i);

        // Fallback partLimits Missing Catcher
        if (partLimits.length === 0 && tempSegment.length !== 0) {
            partLimits = this.buildPartLimits(tempBody, tempSegment);
        }

        // Determine energy limit for body generation
        // Current limit: No single creep consumes more than a 20th of our income.
        let eLimit: number;
        if (!override) {
            let roomIncome = (room.energyIncome * 1500)
            eLimit = roomIncome == 0 ? 300 : (room.energyCapacityAvailable > (roomIncome / 20)) ? roomIncome / 20 : room.energyCapacityAvailable;
        } else {
            eLimit = room.energyCapacityAvailable;
        }

        //room.energyCapacityAvailable
        // Expand tempBody to correct size given limits
        let baseCost = Utility.bodyCost(tempBody)
        if (baseCost > eLimit) return [];
        if (baseCost <= eLimit && tempSegment.length > 0) {
            let additionalSegmentCount = Math.floor((eLimit - baseCost) / Utility.bodyCost(tempSegment)) + 1

            // Built partCounts
            let partCounts: number[] = [];
            refPartLimitsArray.forEach((p, i) => partCounts[i] = 0);
            tempBody.forEach(function(p) {
                let i = refPartLimitsArray.indexOf(p);
                if (i >= 0) partCounts[i]++;
            });

            for (let i = 0; i < additionalSegmentCount && tempBody.length < 50; i++) {
                for (const part of tempSegment) {
                    if (tempBody.length + 1 > 50) break;
                    if (Utility.bodyCost(tempBody.concat([part])) >= eLimit) break;
                    let refIndex = refPartLimitsArray.indexOf(part);
                    if (refIndex >= 0 && partCounts[refIndex] >= partLimits[refIndex]) continue
                    partCounts[refIndex]++;
                    tempBody.push(part);
                }
            }
        }

        // Sort tempBody
        tempBody = _.sortBy(tempBody, function(p) {
            switch (p) {
                case TOUGH:
                    return sortOrder && sortOrder.tough ? sortOrder.tough : 0;
                case WORK:
                    return sortOrder && sortOrder.work ? sortOrder.work : 1;
                case ATTACK:
                    return sortOrder && sortOrder.attack ? sortOrder.attack : 2;
                case RANGED_ATTACK:
                    return sortOrder && sortOrder.ranged_attack ? sortOrder.ranged_attack : 3;
                case CARRY:
                    return sortOrder && sortOrder.carry ? sortOrder.carry : 4;
                case MOVE:
                    return sortOrder && sortOrder.move ? sortOrder.move : 5;
                case HEAL:
                    return sortOrder && sortOrder.heal ? sortOrder.heal : 6;
                case CLAIM:
                    return sortOrder && sortOrder.claim ? sortOrder.claim : 7;
            }
        });

        Logger.log(`Temp Body Length: ${tempBody.length}`, LogLevel.TRACE)
        return tempBody
    }

    static buildPartLimits(tempBody: BodyPartConstant[], tempSegment: BodyPartConstant[]): number[] {
        if (tempSegment.length == 0) return [];
        // Builds a proportional partLimits that mimics the segments ratios while fully utilizing the max body size.
        const refPartLimitsArray = tempSegment.filter((p, i) => tempSegment.indexOf(p) === i);
        let freePartsPortion = Math.floor((50 - tempBody.length) / tempSegment.length);
        let partLimits: number[] = [];

        refPartLimitsArray.forEach((p, i) => partLimits![i] = 0);
        tempBody.forEach(function(p) {
            let i = refPartLimitsArray.indexOf(p);
            if (i >= 0) partLimits![i] += partLimits![i]
        });

        tempSegment.forEach(function(p) {
            partLimits![refPartLimitsArray.indexOf(p)] += freePartsPortion;
        })
        let unusedParts = 50 - (tempBody.length + (partLimits.reduce((previousValue, currentValue) => previousValue + currentValue)));
        for (let i = 0; unusedParts < 50; i >= tempSegment.length ? i = 0 : i++) {
            partLimits[refPartLimitsArray.indexOf(tempSegment[i])] += 1;
            unusedParts++;
        }

        return partLimits;
    }
}
