import { LogLevel, StampType } from './Enums'
import { Process } from "Models/Process";
import { Logger } from "utils/Logger";
import { Roles } from "Creeps/Index";
import { Utils } from "utils/Index";
import { Stamp } from "Models/Stamps";
import { result } from 'lodash';

const buildOrder: (StampType | BuildableStructureConstant)[] = [
    // STRUCTURE_CONTAINER,
    // STRUCTURE_CONTAINER,
    StampType.FAST_FILLER,
    StampType.ANCHOR,
    StampType.LABS,
    // STRUCTURE_SPAWN,
    // STRUCTURE_SPAWN,
    // STRUCTURE_SPAWN,
    StampType.EXTENSIONS,
    StampType.EXTENSIONS,
    StampType.EXTENSIONS,
    StampType.EXTENSIONS,
    StampType.EXTENSIONS,
    StampType.EXTENSIONS,
    StampType.EXTENSIONS,
    StampType.EXTENSIONS,
    // STRUCTURE_TOWER,
    // STRUCTURE_TOWER,
    // STRUCTURE_EXTENSION,
    // STRUCTURE_EXTENSION,
    // STRUCTURE_TOWER,
    // STRUCTURE_TOWER,
    // STRUCTURE_EXTENSION,
    // STRUCTURE_EXTENSION,
    // STRUCTURE_TOWER,
    // STRUCTURE_TOWER,
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

            let stampPos = findPosForStamp(blueprintAnchor, building, visualizedPositons)
            if (stampPos) {
                Stamp.build(stampPos, building, visualizedPositons, roomVisual)
            }
        } else {
            // let size = 1
            // switch (building) {
            //     case STRUCTURE_SPAWN:
            //         size = 3; break
            //     case STRUCTURE_EXTENSION:
            //         size = 1; break
            //     case STRUCTURE_TOWER:
            //         size = 3; break
            // }

            // let partPos = findPosForStamp(blueprintAnchor, size, visualizedPositons)

            // if (partPos) {
            //     visualizedPositons.push(partPos)
            //     roomVisual.structure(partPos.x, partPos.y, building)
            // }
        }
    }

    let roadPositions: PathStep[] = []
    let sources = room.find(FIND_SOURCES)
    let minerals = room.find(FIND_MINERALS)

    // for (let source of sources) {
    //     roadPositions = roadPositions.concat(getRoadPositionsFrom(source.pos, blueprintAnchor))
    // }

    // for (let mineral of minerals) {
    //     roadPositions = roadPositions.concat(getRoadPositionsFrom(mineral.pos, blueprintAnchor))
    // }

    // for (let visualizedPos of visualizedPositons) {
    //     //Remove any visualized positions from the road positions.
    //     roadPositions = roadPositions.filter(pos => !(pos.x == visualizedPos.x && pos.y == visualizedPos.y))
    // }

    // for (let roadPos of roadPositions) {
    //     roomVisual.structure(roadPos.x, roadPos.y, STRUCTURE_ROAD)
    // }

    roomVisual.connectRoads()
}

function generateNewRoomPlan(room: Room) {
    let blueprint: { type: string, stampPos: number, completed: boolean }[] = []

    room.memory.blueprint = blueprint
}

function getRoadPositionsFrom(startPos: RoomPosition, endPos: RoomPosition): PathStep[] {
    let positions: PathStep[] = []
    positions = positions.concat(startPos.findPathTo(endPos, { ignoreCreeps: true }))
    return positions
}

function validPosV2(x: number, y: number, room: Room, structure: StampType | BuildableStructureConstant, visualizedPositions?: RoomPosition[]): boolean {
    if (x < 0 || y < 0) return false
    if (x > 49 || y > 49) return false



    if (structure == StampType.ANCHOR ||
        structure == StampType.LABS ||
        structure == StampType.EXTENSIONS ||
        structure == StampType.FAST_FILLER) {
        let rawStamp = Stamp.getStamp(structure)
        let stampPositions: { x: number, y: number }[] = []
        for (let part of rawStamp) {
            stampPositions.push({ x: x + part.xMod, y: y + part.yMod })
        }

        if (visualizedPositions) {
            for (let stampPos of stampPositions) {
                for (let vizualizedPos of visualizedPositions) {
                    if (stampPos.x == vizualizedPos.x && stampPos.y == vizualizedPos.y) {
                        return false
                    }
                }
            }
        }

        for (let partPosition of stampPositions) {
            if (partPosition.x < 0 || partPosition.y < 0) return false
            if (partPosition.x > 49 || partPosition.y > 49) return false
            Logger.log(`Part Position - X: ${partPosition.x}, Y: ${partPosition.y}`, LogLevel.DEBUG)

            let position = new RoomPosition(partPosition.x, partPosition.y, room.name)

            let positionResult = position.look()

            for (let result of positionResult) {
                if (result.terrain == 'wall' ||
                    result.type == LOOK_NUKES ||
                    result.type == LOOK_CONSTRUCTION_SITES ||
                    result.type == LOOK_STRUCTURES) {
                    return false
                }
            }
        }
        return true
    }
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
function findPosForStamp(startPosition: RoomPosition, structure: StampType | BuildableStructureConstant, vizualizedPositions?: RoomPosition[]): RoomPosition | undefined {
    Logger.log(`Start Position: ${startPosition.x}, ${startPosition.y}`, LogLevel.DEBUG)

    let deltaX = 1;
    let deltaY = 0;

    let segmentLength = 1;

    let x = 0;
    let y = 0;
    let segmentPassed = 0;

    for (let k = 0; k < 1000; ++k) {
        x += deltaX;
        y += deltaY;
        ++segmentPassed;

        if (validPosV2(startPosition.x + x, startPosition.y + y, Game.rooms[startPosition.roomName], structure, vizualizedPositions)) {
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
