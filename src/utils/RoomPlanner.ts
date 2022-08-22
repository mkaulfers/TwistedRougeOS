import { LogLevel, StampType } from './Enums'
import { Process } from "Models/Process";
import { Logger } from "utils/Logger";
import { Roles } from "Creeps/Index";
import { Utils } from "utils/Index";
import { Stamp } from "Models/Stamps";

const buildOrder: (StampType | BuildableStructureConstant)[] = [
    // STRUCTURE_CONTAINER,
    // STRUCTURE_CONTAINER,
    StampType.LABS,
    StampType.ANCHOR,
    StampType.EXTENSIONS,
    StampType.EXTENSIONS,
    StampType.EXTENSIONS,
    StampType.EXTENSIONS,
    StampType.EXTENSIONS,
    StampType.EXTENSIONS,
    StampType.EXTENSIONS,
    StampType.EXTENSIONS,
    StampType.FAST_FILLER,
    STRUCTURE_TOWER,
    STRUCTURE_TOWER,
    STRUCTURE_TOWER,
    STRUCTURE_TOWER,
    STRUCTURE_TOWER,
    STRUCTURE_TOWER,
    STRUCTURE_EXTENSION,
    STRUCTURE_EXTENSION,
    STRUCTURE_EXTENSION,
    STRUCTURE_EXTENSION
]

export function planRoom(room: Room, visualize: boolean, planAgain: boolean = false) {
    generateRoomCostMatrix(room, planAgain)
    if (visualize) {
        visualizeRoom(room)
        return
    }

    //GENERATE NEW ROOM PLAN
}

function visualizeRoom(room: Room) {
    let blueprint = room.memory.blueprint
    if (blueprint) {
        visualizeFromMemory(blueprint)
        return
    }
    generateNewVisual(room)
}

function visualizeFromMemory(blueprint: { type: string, stampPos: number, completed: boolean }[]) {

}

function generateNewVisual(room: Room) {
    let roomVisual = new RoomVisual(room.name)
    //TODO: Get new position from cost matrix.
    //TODO: Add min-cut algo.
    let blueprintAnchor = Utils.Utility.unpackPostionToRoom(room.memory.blueprintAnchor, room.name)
    let visualizedPositons: RoomPosition[] = []
    for (let building of buildOrder) {
        if (building == StampType.ANCHOR ||
            building == StampType.LABS ||
            building == StampType.EXTENSIONS ||
            building == StampType.FAST_FILLER) {

            let stampPos = findPosForStamp(blueprintAnchor, Stamp.getStampSize(building), visualizedPositons)
            if (stampPos) {
                Stamp.build(stampPos, building, visualizedPositons, roomVisual)
            }
        } else {
            let partPos = findPosForStamp(blueprintAnchor, 3, visualizedPositons)

            if (partPos) {
                visualizedPositons.push(partPos)
                Logger.log(`Visualized Count: ${visualizedPositons.length}`, LogLevel.DEBUG)
                roomVisual.structure(partPos.x, partPos.y, building)
            }
        }
    }
    roomVisual.connectRoads()
}

function generateNewRoomPlan(room: Room) {
    let blueprint: { type: string, stampPos: number, completed: boolean }[] = []

    room.memory.blueprint = blueprint
}

function validPos(startPos: RoomPosition, size: number, vizualizedPositions?: RoomPosition[]): boolean {
    let room = Game.rooms[startPos.roomName]
    let x = startPos.x
    let y = startPos.y
    let isOffset = size % 2 == 0

    if (x < 0 || y < 0) return false
    if (x >= 50 || y >= 50) return false
    if (x - Math.floor(size / 2) < 0 || y - Math.floor(size / 2) < 0) return false
    if (x + Math.floor(size / 2) >= 50 || y + Math.floor(size / 2) >= 50) return false

    let results = room.lookAtArea(
        y - Math.floor(isOffset ? 1 : size / 2),
        x - Math.floor(isOffset ? 1 : size / 2),
        y + Math.floor(isOffset ? 2 : size / 2),
        x + Math.floor(isOffset ? 2 : size / 2),
        true
    ).filter(x => x.type != LOOK_CREEPS &&
        x.terrain != 'plain' &&
        x.terrain != 'swamp' &&
        x.type != LOOK_POWER_CREEPS &&
        x.type != LOOK_TOMBSTONES &&
        x.type != LOOK_RUINS &&
        x.type != LOOK_NUKES &&
        x.type != LOOK_CONSTRUCTION_SITES &&
        x.type != LOOK_STRUCTURES
    )

    if (vizualizedPositions) {
        let visArea = room.lookAtArea(
            y - Math.floor(isOffset ? 1 : size / 2),
            x - Math.floor(isOffset ? 1 : size / 2),
            y + Math.floor(isOffset ? 2 : size / 2),
            x + Math.floor(isOffset ? 2 : size / 2),
            true
        )

        for (let result of visArea) {
            for (let vizPos of vizualizedPositions) {
                if (result.x == vizPos.x && result.y == vizPos.y) {
                    return false
                }
            }
        }
    }

    if (results.length > 0) return false

    return true
}

/**
 * Description:
 * DO NOT CHANGE THIS CODE
 * REFERENCE: https://stackoverflow.com/questions/3706219/algorithm-for-iterating-over-an-outward-spiral-on-a-discrete-2d-grid-from-the-or
 *
 * @param startPosition - Searching starts from this position, going in a spiral, clockwise.
 * @param size - The size of the item to fit into a space.
 *             - If the size is odd, the item will be centered on the startPosition.
 *             - If the size is 4, the item will be centered on top-left corner of the center square.
 *             - DO NOT PASS AN EVEN NUMBER GREATER THAN 4.
 * @param vizualizedPositions - Only provide if you wish to vizualize, it will not add construction sites to the room.
 * @returns - A position that your stamp will fit into.
 */
function findPosForStamp(startPosition: RoomPosition, size: number, vizualizedPositions?: RoomPosition[]): RoomPosition | undefined {
    let deltaX = 1;
    let deltaY = 0;

    let segmentLength = 1;

    let x = 0;
    let y = 0;
    let segmentPassed = 0;

    for (let k = 0; k < 2000; ++k) {
        x += deltaX;
        y += deltaY;
        ++segmentPassed;

        if (validPos(new RoomPosition(startPosition.x + x, startPosition.y + y, startPosition.roomName), size, vizualizedPositions)) {
            return new RoomPosition(startPosition.x + x, startPosition.y + y, startPosition.roomName)
        }

        if (segmentPassed == segmentLength) {
            segmentPassed = 0;
            let buffer = deltaX
            deltaX = -deltaY;
            deltaY = buffer;

            if (deltaY == 0) {
                ++segmentLength;
            }
        }
    }

    return undefined
}

function generateRoomCostMatrix(room: Room, generateNew: boolean) {
    if (room.memory.costMatrix && !generateNew) { return }

    let costMatrix: CostMatrix | undefined = undefined
    if (!room.memory.costMatrix) {
        costMatrix = Utils.Utility.distanceTransform(room.name)
        room.memory.costMatrix = JSON.stringify(costMatrix.serialize())
    } else {
        costMatrix = PathFinder.CostMatrix.deserialize(JSON.parse(room.memory.costMatrix))
    }

    let biggestSpace = 0
    let roomPosition: RoomPosition | undefined = undefined
    for (let x = 0; x < 50; x++) {
        for (let y = 0; y < 50; y++) {
            let cost = costMatrix.get(x, y)
            if (!roomPosition) {
                roomPosition = new RoomPosition(x, y, room.name)
            } else {
                if (cost > biggestSpace) {
                    biggestSpace = cost
                    roomPosition = new RoomPosition(x, y, room.name)
                }
            }
        }
    }

    room.memory.blueprintAnchor = Utils.Utility.packPosition(roomPosition!)
    room.memory.costMatrix = JSON.stringify(costMatrix.serialize())
}
