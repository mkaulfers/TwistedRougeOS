import { Utils } from "./Index";
import { Role, Task, ProcessPriority, ProcessResult, LogLevel } from './Enums';

interface IPrototype {
    prototype?: any
}

export class Utility {
    static packPosition(pos: RoomPosition): number {
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
        let cost = 0;
        for (const part of body) {
            switch (part) {
                case TOUGH:
                    cost += 10;
                    break;
                case MOVE:
                case CARRY:
                    cost += 50;
                    break;
                case ATTACK:
                    cost += 80;
                    break;
                case WORK:
                    cost += 100;
                    break;
                case RANGED_ATTACK:
                    cost += 150;
                    break;
                case HEAL:
                    cost += 250;
                    break;
                case CLAIM:
                    cost += 600;
                    break;
            }
        }
        return cost;
    }
}
