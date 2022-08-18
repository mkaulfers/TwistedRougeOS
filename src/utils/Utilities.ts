import { Logger } from "../utils/Logger";

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
        let vis = new RoomVisual(roomName);

        let topDownPass = new PathFinder.CostMatrix();
        for (let y = 0; y < 50; ++y) {
            for (let x = 0; x < 50; ++x) {
                if (Game.map.getRoomTerrain(roomName).get(x, y) == TERRAIN_MASK_WALL) {
                    topDownPass.set(x, y, 0);
                }
                else {
                    topDownPass.set(x, y,
                        Math.min(topDownPass.get(x - 1, y - 1), topDownPass.get(x, y - 1),
                            topDownPass.get(x + 1, y - 1), topDownPass.get(x - 1, y)) + 1);
                }
            }
        }

        for (let y = 49; y >= 0; --y) {
            for (let x = 49; x >= 0; --x) {
                let value = Math.min(topDownPass.get(x, y),
                    topDownPass.get(x + 1, y + 1) + 1, topDownPass.get(x, y + 1) + 1,
                    topDownPass.get(x - 1, y + 1) + 1, topDownPass.get(x + 1, y) + 1);
                topDownPass.set(x, y, value);
                vis.circle(x, y, { radius: value / 15 });
            }
        }

        return topDownPass;
    }

    private static validPos(x: number, y: number, size: number, room: Room): boolean {
        if (x < 0 || y < 0) return false
        if (x >= 50 || y >= 50) return false
        if (x - Math.floor(size / 2) < 0 || y - Math.floor(size / 2) < 0) return false
        if (x + Math.floor(size / 2) >= 50 || y + Math.floor(size / 2) >= 50) return false

        let results = room.lookAtArea(
            y - Math.floor(size / 2),
            x - Math.floor(size / 2),
            y + Math.floor(size / 2),
            x + Math.floor(size / 2),
            true
        ).filter( x => x.type != LOOK_CREEPS &&
            x.terrain != 'plain' &&
            x.terrain != 'swamp' &&
            x.type != LOOK_POWER_CREEPS &&
            x.type != LOOK_TOMBSTONES &&
            x.type != LOOK_RUINS &&
            x.type != LOOK_NUKES)

        if (results.length > 0) return false

        return true
    }

    /**
     *
     * @param x - x of Pos/RoomPosition
     * @param y - y of Pos/RoomPosition
     * @param size - EVEN numbers are treated as a radius
     * - (EX: 2 sets a search size of 5x5, 4 sets a search of 9x9).
     *
     * ODD numbers are treated as a diameter
     * - (Ex 5 is 5x5, 7 is 7x7).
     */
    static findPosForStamp(x: number, y: number, size: number, room: Room): RoomPosition | undefined {
        if (size % 2 == 0) {
            size = size * 2 + 1
        }

        let queue: number[][] = []
        queue.push([x, y])
        let iteration = 0
        while (queue.length > 0 && iteration < 100) {
            let currPos = queue[queue.length - 1]
            queue.pop()

            let posX = currPos[0]
            let posY = currPos[1]

            if (this.validPos(posX + 1, posY, size, room)) {
                return new RoomPosition(posX + 1, posY, room.name)
            } else {
                queue.push([posX + 1, posY])
            }

            if (this.validPos(posX - 1, posY, size, room)) {
                return new RoomPosition(posX - 1, posY, room.name)
            } else {
                queue.push([Math.floor(posX - 1), posY])
            }

            if (this.validPos(posX, posY + 1, size, room)) {
                return new RoomPosition(posX, posY + 1, room.name)
            } else {
                queue.push([posX, posY + 1])
            }

            if (this.validPos(posX, posY - 1, size, room)) {
                return new RoomPosition(posX, posY - 1, room.name)
            } else {
                queue.push([posX, posY - 1])
            }
            iteration++
        }
        return
    }

    /**
     * Description: Finds a position in the room that is at a source, not a wall, and the position is closest to the creep.
     * @param creep the creep to find a source position for.
     * @returns a room position that is a valid source position for the creep, or undefined if no valid position was found.
     */
    static findPosForSource(creep: Creep): RoomPosition | undefined {
        let sources = creep.room.find(FIND_SOURCES)
        Logger.log(sources.length.toString(), LogLevel.WARN)
        for (let source of sources) {
            let creeps = source.pos.findInRange(FIND_MY_CREEPS, 1)
            if (creeps.length == 0) {
                let nearbyPositions = []
                for (let x = source.pos.x - 1; x <= source.pos.x + 1; x++) {
                    for (let y = source.pos.y - 1; y <= source.pos.y + 1; y++) {
                        nearbyPositions.push({x: x, y: y})
                    }
                }

                let validPositions = nearbyPositions.filter(m => Game.map.getRoomTerrain(creep.room.name).get(m.x, m.y) != TERRAIN_MASK_WALL)
                let closestPosition = validPositions[0]
                for (let i = 0; i < validPositions.length; i++) {
                    let position = validPositions[i]
                    if (creep.pos.getRangeTo(position.x, position.y) < creep.pos.getRangeTo(closestPosition.x, closestPosition.y)) {
                        closestPosition = position
                    }
                }
                return new RoomPosition(closestPosition.x, closestPosition.y, creep.room.name)
            }
        }
        return
    }

    /**
     * Description: Organizes potential targets based on ResourceConstant && StructureType, and sorts them in a defined order.
     * @param targets An array of potential targets: Creep | AnyStoreStructure | Resource | Tombstone.
     * @param options An object containing the following properties: `resource, structures, order`.
     * @returns An array of approved targets or undefined
     */
    static organizeTargets(targets: (Creep | AnyStructure | Resource | Tombstone)[], options?: {
        resource?: ResourceConstant,
        structures?: StructureConstant[],
        order?: ('desc' | 'asc')
        }): any[] {

        if (!targets) return targets;
        if (!options) options = {};
        if (!options.order) {
            options.order = 'desc';
        }

        targets = _
        .chain(targets) // s) => ('store' in s && wantedStructures.indexOf(s.structureType) >= 0 && s.store.energy > 0) || ('resourceType' in s && s.resourceType === RESOURCE_ENERGY)
        .filter(function(t) {

            if (!options || !options.structures && !options.resource) {
                return t;
            }
            if (options.structures) {
                if ('structureType' in t && options.structures.indexOf(t.structureType) == -1) return;
            }
            if (options.resource) {
                if (('store' in t && t.store[options?.resource!] == 0) ||
                ('amount' in t && t.amount < 5) ||
                (!('store' in t) && !('amount' in t))) return;
            }
            return t;

        })
        .sortByOrder(function(t: (Creep | AnyStructure | Resource | Tombstone)) {
            if (options?.resource) {
                if ('store' in t) {
                    return t.store[options.resource];
                } else if ('amount' in t) {
                    return t.amount;
                } else {
                    return;
                }
            } else {
                return;
            }
        }, options.order)
        .value();

        return targets;
    }
}
