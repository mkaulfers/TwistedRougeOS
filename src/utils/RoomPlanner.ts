import { LogLevel, StampType } from './Enums'
import { Process } from "Models/Process";
import { Logger } from "utils/Logger";
import { Roles } from "Creeps/Index";
import { Utils } from "utils/Index";
import { Stamp } from "Models/Stamps";
import { getCutTiles, Rectangle } from './RampartPlanner';

const buildOrder: (StampType)[] = [
    StampType.FAST_FILLER,
    StampType.ANCHOR,
    StampType.LABS,
    StampType.EXTENSIONS,
    StampType.EXTENSIONS,
    StampType.EXTENSIONS,
    StampType.EXTENSIONS,
    StampType.EXTENSIONS,
    StampType.EXTENSIONS,
    StampType.EXTENSIONS,
    StampType.EXTENSIONS,
    StampType.TOWER,
    StampType.TOWER,
    StampType.EXTENSION,
    StampType.EXTENSION,
    StampType.TOWER,
    StampType.TOWER,
    StampType.EXTENSION,
    StampType.EXTENSION,
    StampType.TOWER,
    StampType.TOWER,
]

export function planRoom(room: Room, visualize: boolean) {
    let blueprint = room.memory.blueprint
    if (blueprint && visualize) {
        visualizeFromMemory(room)
        return
    }
    generateNewPlan(room, visualize)
}

function visualizeFromMemory(room: Room) {
    let roomVisual = new RoomVisual(room.name)
    let blueprint = room.memory.blueprint

    for (let stamp of blueprint.stamps) {
        let pos = Utils.Utility.unpackPostionToRoom(stamp.stampPos, room.name)
        Stamp.plan(pos, stamp.type as StampType, [], roomVisual)
    }

    for (let step of blueprint.highways) {
        let pos = Utils.Utility.unpackPostionToRoom(step, room.name)
        roomVisual.structure(pos.x, pos.y, STRUCTURE_ROAD)
    }

    for (let container of blueprint.containers) {
        let pos = Utils.Utility.unpackPostionToRoom(container, room.name)
        roomVisual.structure(pos.x, pos.y, STRUCTURE_CONTAINER)
    }

    for (let rampart of blueprint.ramparts) {
        let pos = Utils.Utility.unpackPostionToRoom(rampart, room.name)
        roomVisual.structure(pos.x, pos.y, STRUCTURE_RAMPART)
    }

    roomVisual.connectRoads()
}

function generateNewPlan(room: Room, isVisualizing: boolean) {
    room.memory.blueprint = {
        anchor: 0,
        containers: [],
        links: [],
        highways: [],
        ramparts: [],
        stamps: []
    }

    generateRoomCostMatrix(room)

    let roomVisual = isVisualizing ? new RoomVisual(room.name) : undefined
    let blueprintAnchor = Utils.Utility.unpackPostionToRoom(room.memory.blueprint.anchor, room.name)
    let plannedPositions: RoomPosition[] = []
    let stamps: { type: StampType, stampPos: number, completed: boolean }[] = []

    for (let building of buildOrder) {
        let stampPos = findPosForStamp(blueprintAnchor, building, plannedPositions)
        if (stampPos) {
            stamps.push({ type: building, stampPos: Utils.Utility.packPosition(stampPos), completed: false })
            Stamp.plan(stampPos, building, plannedPositions, roomVisual)
        }
    }

    room.memory.blueprint.stamps = room.memory.blueprint.stamps.concat(stamps)

    let roadPositions: PathStep[] = []
    let sources = room.find(FIND_SOURCES)
    let minerals = room.find(FIND_MINERALS)

    // Get the PathStep[] from blueprintAnchor to the nearest exit on the left.
    let leftExitPos = blueprintAnchor.findClosestByPath(FIND_EXIT_LEFT)
    let rightExitPos = blueprintAnchor.findClosestByPath(FIND_EXIT_RIGHT)
    let topExitPos = blueprintAnchor.findClosestByPath(FIND_EXIT_TOP)
    let bottomExitPos = blueprintAnchor.findClosestByPath(FIND_EXIT_BOTTOM)

    if (leftExitPos) {
        let leftExitPath = blueprintAnchor.findPathTo(leftExitPos, { ignoreCreeps: true, ignoreDestructibleStructures: true, swampCost: 2  })
        leftExitPath.splice(leftExitPath.length - 1, 1)
        roadPositions = roadPositions.concat(leftExitPath)
    }

    if (rightExitPos) {
        let rightExitPath = blueprintAnchor.findPathTo(rightExitPos, { ignoreCreeps: true, ignoreDestructibleStructures: true, swampCost: 2  })
        rightExitPath.splice(rightExitPath.length - 1, 1)
        roadPositions = roadPositions.concat(rightExitPath)
    }

    if (topExitPos) {
        let topExitPath = blueprintAnchor.findPathTo(topExitPos, { ignoreCreeps: true, ignoreDestructibleStructures: true, swampCost: 2  })
        topExitPath.splice(topExitPath.length - 1, 1)
        roadPositions = roadPositions.concat(topExitPath)
    }

    if (bottomExitPos) {
        let bottomExitPath = blueprintAnchor.findPathTo(bottomExitPos, { ignoreCreeps: true, ignoreDestructibleStructures: true, swampCost: 2  })
        bottomExitPath.splice(bottomExitPath.length - 1, 1)
        roadPositions = roadPositions.concat(bottomExitPath)
    }

    for (let source of sources) {
        let sourcePath = blueprintAnchor.findPathTo(source, { ignoreCreeps: true, ignoreDestructibleStructures: true, swampCost: 2  })

        let containerPos = sourcePath[sourcePath.length - 2]
        room.memory.blueprint.containers.push(Utils.Utility.packPosition(new RoomPosition(containerPos.x, containerPos.y, room.name)))
        sourcePath.splice(sourcePath.length - 2, 2)
        roadPositions = roadPositions.concat(sourcePath)
    }

    if (sources.length == 2) {
        let source1 = sources[0]
        let source2 = sources[1]
        let pathBetweenSources = source1.pos.findPathTo(source2, { ignoreCreeps: true, ignoreDestructibleStructures: true, swampCost: 2  })
        pathBetweenSources.splice(pathBetweenSources.length - 1, 1)
        pathBetweenSources.splice(0, 1)
        roadPositions = roadPositions.concat(pathBetweenSources)
    }

    for (let mineral of minerals) {
        let mineralPath: PathStep[] = blueprintAnchor.findPathTo(mineral, { ignoreCreeps: true, ignoreDestructibleStructures: true, swampCost: 2 })

        let containerPos = mineralPath[mineralPath.length - 2]
        room.memory.blueprint.containers.push(Utils.Utility.packPosition(new RoomPosition(containerPos.x, containerPos.y, room.name)))

        mineralPath.splice(mineralPath.length - 2, 2)
        roadPositions = roadPositions.concat(mineralPath)
    }

    /**
     * Find paths to remove.
     */
    let pathsToRemove: PathStep[] = []
    for (let stamp of stamps) {
        let stampX = Utils.Utility.unpackPostionToRoom(stamp.stampPos, room.name).x
        let stampY = Utils.Utility.unpackPostionToRoom(stamp.stampPos, room.name).y

        for (let roadPos of roadPositions) {
            if (Stamp.containsPos(stamp.type, stampX, stampY, roadPos.x, roadPos.y)) {
                pathsToRemove.push(roadPos)
            }
        }
    }

    /**
     * Loop through in reverse order to remove the paths.
     */
    for (let i = roadPositions.length - 1; i >= 0; i--) {
        for (let remove of pathsToRemove) {
            if (roadPositions[i].x == remove.x && roadPositions[i].y == remove.y) {
                roadPositions.splice(i, 1)
            }
        }
    }

    /**
     * Save the road positions to memory.
     */
    for (let roadPos of roadPositions) {
        room.memory.blueprint.highways = room.memory.blueprint.highways.concat(Utils.Utility
            .packPosition(new RoomPosition(roadPos.x, roadPos.y, room.name)))
    }


    let rectsToProtect: Rectangle[] = []
    for (let stamp of stamps) {
        let stampPos = Utils.Utility.unpackPostionToRoom(stamp.stampPos, room.name)
        let stampType = stamp.type

        let modifier = 0
        switch (stampType) {
            case StampType.FAST_FILLER:
            case StampType.ANCHOR:
            case StampType.LABS:
                modifier = 2; break
            case StampType.EXTENSIONS:
            case StampType.TOWER:
            case StampType.EXTENSION:
                modifier = 1; break
        }
        rectsToProtect.push({x1: stampPos.x - modifier, y1: stampPos.y - modifier, x2: stampPos.x + modifier, y2: stampPos.y + modifier})
    }

    let rampartPositions: Coord[] =  getCutTiles(room.name, rectsToProtect, false, undefined, false)
    for (let rampartPos of rampartPositions) {
        room.memory.blueprint.ramparts = room.memory.blueprint.ramparts.concat(Utils.Utility.packPosition(new RoomPosition(rampartPos.x, rampartPos.y, room.name)))
    }
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
 * @param plannedPositions - Required to simulate the next positions for addition to the blueprint.
 * @returns - A position that your stamp will fit into.
 */
function findPosForStamp(startPosition: RoomPosition, structure: StampType, plannedPositions: RoomPosition[]): RoomPosition | undefined {
    let deltaX = 1;
    let deltaY = 0;

    let segmentLength = 1;

    let x = 0;
    let y = 0;
    let segmentPassed = 0;

    for (let k = 0; k < 1500; ++k) {
        x += deltaX;
        y += deltaY;
        ++segmentPassed;

        if (doesStampFitAtPosition(startPosition.x + x, startPosition.y + y, Game.rooms[startPosition.roomName], structure, plannedPositions)) {
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

function doesStampFitAtPosition(x: number, y: number, room: Room, structure: StampType, plannedPositions: RoomPosition[], roomVisual?: RoomVisual): boolean {
    if (x < 0 || y < 0) return false
    if (x > 49 || y > 49) return false

    if (structure == StampType.ANCHOR ||
        structure == StampType.LABS ||
        structure == StampType.EXTENSIONS ||
        structure == StampType.FAST_FILLER ||
        structure == StampType.TOWER ||
        structure == StampType.EXTENSION) {
        let rawStamp = Stamp.getStamp(structure)
        let stampPositions: { x: number, y: number }[] = []
        for (let part of rawStamp) {
            stampPositions.push({ x: x + part.xMod, y: y + part.yMod })
        }

        if (plannedPositions) {
            for (let stampPos of stampPositions) {
                for (let plannedPosition of plannedPositions) {
                    if (stampPos.x == plannedPosition.x && stampPos.y == plannedPosition.y) {
                        return false
                    }
                }
            }
        }

        for (let partPosition of stampPositions) {
            if (partPosition.x < 0 || partPosition.y < 0) return false
            if (partPosition.x > 49 || partPosition.y > 49) return false

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

function generateRoomCostMatrix(room: Room) {
    if (room.memory.costMatrix && room.memory.blueprint.anchor != 0) { return }

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

    room.memory.blueprint.anchor = Utils.Utility.packPosition(roomPosition!)
    room.memory.costMatrix = JSON.stringify(costMatrix.serialize())
}

function doesLocationExistInPlannedPositions(room: Room, plannedPositions: RoomPosition[], x: number, y: number): boolean {
    for (let plannedPosition of plannedPositions) {
        if (plannedPosition.x == x && plannedPosition.y == y) {
            return true
        }
    }
    return false
}

function isLocationNearAStructure(room: Room, x: number, y: number): boolean {
    let structures = room.find(FIND_STRUCTURES)
    for (let structure of structures) {
        if (Math.abs(structure.pos.x - x) <= 6 && Math.abs(structure.pos.y - y) <= 6) {
            return true
        }
    }
    return false
}
