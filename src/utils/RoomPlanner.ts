import { LogLevel, StampType } from './Enums'
import { Process } from "Models/Process";
import { Logger } from "utils/Logger";
import { Roles } from "Creeps/Index";
import { Utils } from "utils/Index";
import { Stamp } from "Models/Stamps";
import { getCutTiles, Rectangle } from './RampartPlanner';
import { start } from 'repl';
import { all } from 'lodash';

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
        roomVisual.structure(pos.x, pos.y, STRUCTURE_RAMPART, { opacity: 0.3 })
    }

    for (let link of blueprint.links) {
        let pos = Utils.Utility.unpackPostionToRoom(link, room.name)
        roomVisual.structure(pos.x, pos.y, STRUCTURE_LINK)
    }

    roomVisual.connectRoads()
}

function generateNewPlan(room: Room, isVisualizing: boolean) {
    if (!room.controller?.my || !room) { return }

    room.memory.blueprint = {
        anchor: 0,
        containers: [],
        links: [],
        highways: [],
        ramparts: [],
        stamps: []
    }

    let blueprintAnchor = generateBluePrintAnchor(room)
    if (!blueprintAnchor) { return }
    room.memory.blueprint.anchor = Utils.Utility.packPosition(blueprintAnchor)

    let roomVisual = isVisualizing ? new RoomVisual(room.name) : undefined
    let plannedPositions: RoomPosition[] = []
    let stamps: { type: StampType, stampPos: number, completed: boolean }[] = []

    for (let building of buildOrder) {
        let stampPos = floodFillSearch(room, blueprintAnchor, building, plannedPositions)
        if (stampPos) {
            stamps.push({ type: building, stampPos: Utils.Utility.packPosition(stampPos), completed: false })
            Stamp.plan(stampPos, building, plannedPositions, roomVisual)
        }
    }

    room.memory.blueprint.stamps = room.memory.blueprint.stamps.concat(stamps)

    let roadPositions: PathStep[] = []
    let sources = room.find(FIND_SOURCES)
    let minerals = room.find(FIND_MINERALS)

    let leftExits = getLeftExits(room)
    for (let exit of leftExits) {
        let shortestExit = blueprintAnchor.findClosestByPath(exit, { ignoreCreeps: true, ignoreDestructibleStructures: true, swampCost: 2 })
        let path = blueprintAnchor.findPathTo(shortestExit!, { ignoreCreeps: true, ignoreDestructibleStructures: true, swampCost: 2 })
        path.splice(path.length - 1, 1)
        roadPositions = roadPositions.concat(path)
    }

    let rightExits = getRightExits(room)
    for (let exit of rightExits) {
        let shortestExit = blueprintAnchor.findClosestByPath(exit, { ignoreCreeps: true, ignoreDestructibleStructures: true, swampCost: 2 })
        let path = blueprintAnchor.findPathTo(shortestExit!, { ignoreCreeps: true, ignoreDestructibleStructures: true, swampCost: 2 })
        path.splice(path.length - 1, 1)
        roadPositions = roadPositions.concat(path)
    }

    let topExits = getTopExits(room)
    for (let exit of topExits) {
        let shortestExit = blueprintAnchor.findClosestByPath(exit, { ignoreCreeps: true, ignoreDestructibleStructures: true, swampCost: 2 })
        let path = blueprintAnchor.findPathTo(shortestExit!, { ignoreCreeps: true, ignoreDestructibleStructures: true, swampCost: 2 })
        path.splice(path.length - 1, 1)
        roadPositions = roadPositions.concat(path)
    }

    let bottomExits = getBottomExits(room)
    for (let exit of bottomExits) {
        let shortestExit = blueprintAnchor.findClosestByPath(exit, { ignoreCreeps: true, ignoreDestructibleStructures: true, swampCost: 2 })
        let path = blueprintAnchor.findPathTo(shortestExit!, { ignoreCreeps: true, ignoreDestructibleStructures: true, swampCost: 2 })
        path.splice(path.length - 1, 1)
        roadPositions = roadPositions.concat(path)
    }

    for (let source of sources) {
        let sourcePath = blueprintAnchor.findPathTo(source, { ignoreCreeps: true, ignoreDestructibleStructures: true, swampCost: 2 })

        let containerPos = sourcePath[sourcePath.length - 2]
        room.memory.blueprint.containers.push(Utils.Utility.packPosition(new RoomPosition(containerPos.x, containerPos.y, room.name)))

        let linkPos = sourcePath[sourcePath.length - 3]
        room.memory.blueprint.links.push(Utils.Utility.packPosition(new RoomPosition(linkPos.x, linkPos.y, room.name)))

        sourcePath.splice(sourcePath.length - 2, 2)
        roadPositions = roadPositions.concat(sourcePath)
    }

    if (sources.length == 2) {
        let source1 = sources[0]
        let source2 = sources[1]
        let pathBetweenSources = source1.pos.findPathTo(source2, { ignoreCreeps: true, ignoreDestructibleStructures: true, swampCost: 2 })
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

    let pathToController = blueprintAnchor.findPathTo(room.controller.pos, { ignoreCreeps: true, ignoreDestructibleStructures: true, swampCost: 2 })
    roadPositions = roadPositions.concat(pathToController)

    let controllerLink = pathToController[pathToController.length - 2]
    room.memory.blueprint.links.push(Utils.Utility.packPosition(new RoomPosition(controllerLink.x, controllerLink.y, room.name)))

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
        rectsToProtect.push({ x1: stampPos.x - modifier - 2, y1: stampPos.y - modifier - 2, x2: stampPos.x + modifier + 2, y2: stampPos.y + modifier + 2 })
    }

    let rampartPositions: Coord[] = getCutTiles(room.name, rectsToProtect, false, undefined, false)


    let controllerRect: Rectangle = { x1: room.controller.pos.x - 1, y1: room.controller?.pos.y - 1, x2: room.controller.pos.x + 1, y2: room.controller.pos.y + 1 }
    for (let x = controllerRect.x1; x <= controllerRect.x2; x++) {
        for (let y = controllerRect.y1; y <= controllerRect.y2; y++) {
            if (!room.lookForAt(LOOK_TERRAIN, x, y).includes('wall')) {
                rampartPositions.push({ x: x, y: y })
            }
        }
    }


    for (let rampartPos of rampartPositions) {
        room.memory.blueprint.ramparts = room.memory.blueprint.ramparts.concat(Utils.Utility.packPosition(new RoomPosition(rampartPos.x, rampartPos.y, room.name)))
    }
}

/**
* @Deprecated Notice - Use floodFillSearch() instead.
 * DO NOT CHANGE THIS CODE
 * @Reference https://stackoverflow.com/questions/3706219/algorithm-for-iterating-over-an-outward-spiral-on-a-discrete-2d-grid-from-the-or
 * @param startPosition - Searching starts from this position, going in a spiral, clockwise.
 * @param size - The size of the item to fit into a space.
 *             - If the size is odd, the item will be centered on the startPosition.
 *             - If the size is 4, the item will be centered on top-left corner of the center square.
 *             - DO NOT PASS AN EVEN NUMBER GREATER THAN 4.
 * @param plannedPositions - Required to simulate the next positions for addition to the blueprint.
 * @returns - A position that your stamp will fit into.
 */
function spiralSearch(startPosition: RoomPosition, structure: StampType, plannedPositions: RoomPosition[]): RoomPosition | undefined {
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

function floodFillSearch(room: Room, startPosition: RoomPosition, structure: StampType, plannedPositions?: RoomPosition[]): RoomPosition | undefined {
    const queue: Set<number> = new Set()
    queue.add(startPosition.x + startPosition.y * 50)

    for (const coord of queue) {
        const x = coord % 50
        const y = (coord - x) / 50

        if (doesStampFitAtPosition(x, y, room, structure, plannedPositions ? plannedPositions : [])) {
            return new RoomPosition(x, y, room.name)
        }

        if (y > 0) queue.add(coord - 50)
        if (x > 0) queue.add(coord - 1)
        if (y < 49) queue.add(coord + 50)
        if (x < 49) queue.add(coord + 1)
    }
    return
}

function doesStampFitAtPosition(x: number, y: number, room: Room, structure: StampType, plannedPositions: RoomPosition[], roomVisual?: RoomVisual): boolean {
    if (x < 5 || y < 5) return false
    if (x > 44 || y > 44) return false

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

function getLeftExits(room: Room): RoomPosition[][] {
    let posCache: RoomPosition[] = []
    let splitSections: RoomPosition[][] = []

    for (let y = 0; y < 50; y++) {
        let position = room.lookAt(new RoomPosition(0, y, room.name))
        let hasWall = false
        for (let result of position) {
            if (result.terrain == 'wall') {
                hasWall = true
                break
            }
        }

        if (!hasWall) {
            posCache.push(new RoomPosition(0, y, room.name))
        } else {
            splitSections.push(posCache)
            posCache = []
        }
    }

    for (let i = splitSections.length - 1; i >= 0; i--) {
        if (splitSections[i].length == 0) {
            splitSections.splice(i, 1)
        }
    }

    return splitSections
}

function getRightExits(room: Room): RoomPosition[][] {
    let posCache: RoomPosition[] = []
    let splitSections: RoomPosition[][] = []

    for (let y = 0; y < 50; y++) {
        let position = room.lookAt(new RoomPosition(49, y, room.name))
        let hasWall = false
        for (let result of position) {
            if (result.terrain == 'wall') {
                hasWall = true
                break
            }
        }

        if (!hasWall) {
            posCache.push(new RoomPosition(49, y, room.name))
        }
        else {
            splitSections.push(posCache)
            posCache = []
        }
    }

    for (let i = splitSections.length - 1; i >= 0; i--) {
        if (splitSections[i].length == 0) {
            splitSections.splice(i, 1)
        }
    }

    return splitSections
}

function getTopExits(room: Room): RoomPosition[][] {
    let posCache: RoomPosition[] = []
    let splitSections: RoomPosition[][] = []

    for (let x = 0; x < 50; x++) {
        let position = room.lookAt(new RoomPosition(x, 0, room.name))
        let hasWall = false
        for (let result of position) {
            if (result.terrain == 'wall') {
                hasWall = true
                break
            }
        }

        if (!hasWall) {
            posCache.push(new RoomPosition(x, 0, room.name))
        }
        else {
            splitSections.push(posCache)
            posCache = []
        }
    }

    for (let i = splitSections.length - 1; i >= 0; i--) {
        if (splitSections[i].length == 0) {
            splitSections.splice(i, 1)
        }
    }

    return splitSections
}

    function getBottomExits(room: Room): RoomPosition[][] {
    let posCache: RoomPosition[] = []
    let splitSections: RoomPosition[][] = []

    for (let x = 0; x < 50; x++) {
        let position = room.lookAt(new RoomPosition(x, 49, room.name))
        let hasWall = false
        for (let result of position) {
            if (result.terrain == 'wall') {
                hasWall = true
                break
            }
        }

        if (!hasWall) {
            posCache.push(new RoomPosition(x, 49, room.name))
        }
        else {
            splitSections.push(posCache)
            posCache = []
        }
    }

    for (let i = splitSections.length - 1; i >= 0; i--) {
        if (splitSections[i].length == 0) {
            splitSections.splice(i, 1)
        }
    }

    return splitSections
}

function generateBluePrintAnchor(room: Room, positions: RoomPosition[] = []): RoomPosition | undefined {
    let controller = room.controller
    if (!controller) return undefined
    let sources = room.sources()

    positions.push(new RoomPosition(controller.pos.x, controller.pos.y, room.name))
    for (let source of sources) {
        positions.push(new RoomPosition(source.pos.x, source.pos.y, room.name))
    }

    let centeredPositions: PathStep[] = []
    for (let i = 0; i < positions.length; i++) {
        for (let j = 0; j < positions.length; j++) {
            if (i != j) {
                let path = room.findPath(positions[i], positions[j], { ignoreCreeps: true })
                centeredPositions.push(path[Math.floor(path.length - 1 / 2)])
            }
        }
    }

    let x = 0
    let y = 0

    for (let i = 0; i < centeredPositions.length; ++i) {
        x += centeredPositions[i].x
        y += centeredPositions[i].y
    }

    x /= centeredPositions.length
    y /= centeredPositions.length

    let returningPosition = floodFillSearch(room, new RoomPosition(x, y, room.name), StampType.FAST_FILLER, positions)
    return returningPosition
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
