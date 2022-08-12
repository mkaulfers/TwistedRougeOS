export class Utility {
    static packPosition(pos: RoomPosition): number {
        return pos.x * 50 + pos.y
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
}
