import { StampType } from './Enums'
import { Utils } from "utils/Index";
import { Stamps } from "Models/Stamps";
import { getCutTiles, Rectangle, Coord } from './RampartPlanner';
import { Utility } from './Utilities';

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
    StampType.OBSERVER,
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

export function planRoom(room: Room) {
    let blueprint = room.memory.blueprint

    if (!blueprint || blueprint.anchor == 0) {
        generateNewPlan(room)
    }
}

function generateNewPlan(room: Room) {
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

    let plannedPositions: RoomPosition[] = []
    let unsavedRoadPositions: RoomPosition[] = []
    let stamps: { type: StampType, stampPos: number, completed: boolean }[] = []

    for (let building of buildOrder) {
        let stampPos = floodFillSearch(room, blueprintAnchor, building, plannedPositions)
        if (stampPos) {
            stamps.push({ type: building, stampPos: Utils.Utility.packPosition(stampPos), completed: false })
            Stamps.plan(stampPos, building, plannedPositions, unsavedRoadPositions)
        }
    }

    room.memory.blueprint.stamps = room.memory.blueprint.stamps.concat(stamps)

    let savedRoadPositions: PathStep[] = []
    let sources = room.sources
    let mineral = room.mineral

    let leftExits = getLeftExits(room)
    for (let exit of leftExits) {
        let shortestExit = blueprintAnchor.findClosestByPath(exit, { ignoreCreeps: true, ignoreDestructibleStructures: true, swampCost: 2 })
        if (!shortestExit) continue;
        let path = blueprintAnchor.findPathTo(shortestExit, { ignoreCreeps: true, ignoreDestructibleStructures: true, swampCost: 2, costCallback: (roomName) => genPlannedRoadCM(Utility.genPathfindingCM(roomName), savedRoadPositions, unsavedRoadPositions) })
        path.splice(path.length - 1, 1)
        savedRoadPositions = savedRoadPositions.concat(path)
    }

    let rightExits = getRightExits(room)
    for (let exit of rightExits) {
        let shortestExit = blueprintAnchor.findClosestByPath(exit, { ignoreCreeps: true, ignoreDestructibleStructures: true, swampCost: 2 })
        if (!shortestExit) continue;
        let path = blueprintAnchor.findPathTo(shortestExit, { ignoreCreeps: true, ignoreDestructibleStructures: true, swampCost: 2, costCallback: (roomName) => genPlannedRoadCM(Utility.genPathfindingCM(roomName), savedRoadPositions, unsavedRoadPositions) })
        path.splice(path.length - 1, 1)
        savedRoadPositions = savedRoadPositions.concat(path)
    }

    let topExits = getTopExits(room)
    for (let exit of topExits) {
        let shortestExit = blueprintAnchor.findClosestByPath(exit, { ignoreCreeps: true, ignoreDestructibleStructures: true, swampCost: 2 })
        if (!shortestExit) continue;
        let path = blueprintAnchor.findPathTo(shortestExit, { ignoreCreeps: true, ignoreDestructibleStructures: true, swampCost: 2, costCallback: (roomName) => genPlannedRoadCM(Utility.genPathfindingCM(roomName), savedRoadPositions, unsavedRoadPositions) })
        path.splice(path.length - 1, 1)
        savedRoadPositions = savedRoadPositions.concat(path)
    }

    let bottomExits = getBottomExits(room)
    for (let exit of bottomExits) {
        let shortestExit = blueprintAnchor.findClosestByPath(exit, { ignoreCreeps: true, ignoreDestructibleStructures: true, swampCost: 2 })
        if (!shortestExit) continue;
        let path = blueprintAnchor.findPathTo(shortestExit, { ignoreCreeps: true, ignoreDestructibleStructures: true, swampCost: 2, costCallback: (roomName) => genPlannedRoadCM(Utility.genPathfindingCM(roomName), savedRoadPositions, unsavedRoadPositions) })
        path.splice(path.length - 1, 1)
        savedRoadPositions = savedRoadPositions.concat(path)
    }

    for (let source of sources) {
        // Handle Source Paths
        let sourcePath = blueprintAnchor.findPathTo(source, { ignoreCreeps: true, ignoreDestructibleStructures: true, swampCost: 2, costCallback: (roomName) => genPlannedRoadCM(Utility.genPathfindingCM(roomName), savedRoadPositions, unsavedRoadPositions) })
        let passToRoadPositions = [...sourcePath];
        passToRoadPositions.splice(sourcePath.length - 2, 2)
        savedRoadPositions = savedRoadPositions.concat(passToRoadPositions)

        // Handle Container Pos for source
        let containerPos = sourcePath[sourcePath.length - 2]
        room.memory.blueprint.containers.push(Utils.Utility.packPosition(new RoomPosition(containerPos.x, containerPos.y, room.name)))

        // Handle Link Pos for source
        let linkPos = sourcePath[sourcePath.length - 2]
        let adjustedPos = getValidPositionAroundPosition(linkPos, room, savedRoadPositions, plannedPositions)
        if (adjustedPos) room.memory.blueprint.links.push(Utils.Utility.packPosition(new RoomPosition(adjustedPos.x, adjustedPos.y, room.name)))
    }

    if (sources.length == 2) {
        let source1 = sources[0]
        let source2 = sources[1]
        let pathBetweenSources = source1.pos.findPathTo(source2, { ignoreCreeps: true, ignoreDestructibleStructures: true, swampCost: 2, costCallback: (roomName) => genPlannedRoadCM(Utility.genPathfindingCM(roomName), savedRoadPositions, unsavedRoadPositions) })
        pathBetweenSources.splice(pathBetweenSources.length - 1, 1)
        pathBetweenSources.splice(0, 1)
        savedRoadPositions = savedRoadPositions.concat(pathBetweenSources)
    }

    if (mineral) {
        let mineralPath: PathStep[] = blueprintAnchor.findPathTo(mineral, { ignoreCreeps: true, ignoreDestructibleStructures: true, swampCost: 2, costCallback: (roomName) => genPlannedRoadCM(Utility.genPathfindingCM(roomName), savedRoadPositions, unsavedRoadPositions) })

        let containerPos = mineralPath[mineralPath.length - 2]
        room.memory.blueprint.containers.push(Utils.Utility.packPosition(new RoomPosition(containerPos.x, containerPos.y, room.name)))

        mineralPath.splice(mineralPath.length - 2, 2)
        savedRoadPositions = savedRoadPositions.concat(mineralPath)
    }

    let pathToController = blueprintAnchor.findPathTo(room.controller.pos, { ignoreCreeps: true, ignoreDestructibleStructures: true, swampCost: 2, costCallback: (roomName) => genPlannedRoadCM(Utility.genPathfindingCM(roomName), savedRoadPositions, unsavedRoadPositions) })
    pathToController.splice(pathToController.length - 1, 1)
    savedRoadPositions = savedRoadPositions.concat(pathToController)

    let controllerLink = pathToController[pathToController.length - 2]
    let adjustedPos = getValidPositionAroundPosition(controllerLink, room, savedRoadPositions, plannedPositions)
    if (adjustedPos) room.memory.blueprint.links.push(Utils.Utility.packPosition(new RoomPosition(adjustedPos.x, adjustedPos.y, room.name)))

    /**
     * Find paths to remove.
     */
    let pathsToRemove: PathStep[] = []
    for (let stamp of stamps) {
        let stampX = Utils.Utility.unpackPostionToRoom(stamp.stampPos, room.name).x
        let stampY = Utils.Utility.unpackPostionToRoom(stamp.stampPos, room.name).y

        for (let roadPos of savedRoadPositions) {
            if (Stamps.containsPos(stamp.type, stampX, stampY, roadPos.x, roadPos.y)) {
                pathsToRemove.push(roadPos)
            }
        }
    }

    /**
     * Loop through in reverse order to remove the paths.
     */
    for (let i = savedRoadPositions.length - 1; i >= 0; i--) {
        for (let remove of pathsToRemove) {
            if (savedRoadPositions[i].x == remove.x && savedRoadPositions[i].y == remove.y) {
                savedRoadPositions.splice(i, 1)
            }
        }
    }

    /**
     * Save the road positions to memory.
     */
    for (let roadPos of savedRoadPositions) {
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
            case StampType.OBSERVER:
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

    let leftExitsPath = getLeftExits(room)
    let rightExitsPath = getRightExits(room)
    let topExitsPath = getTopExits(room)
    let bottomExitsPath = getBottomExits(room)

    for (let exitPath of [leftExitsPath, rightExitsPath, topExitsPath, bottomExitsPath]) {
        for (let exitPos of exitPath) {
            let closest = blueprintAnchor.findClosestByPath(exitPos, { ignoreCreeps: true, ignoreDestructibleStructures: true, swampCost: 2 })
            if (closest != null) {
                let path = blueprintAnchor.findPathTo(closest, { ignoreCreeps: true, ignoreDestructibleStructures: true, swampCost: 2, costCallback: (roomName) => genPlannedRoadCM(Utility.genPathfindingCM(roomName), savedRoadPositions, unsavedRoadPositions) })
                let pathLastTwoSteps: PathStep[] = []
                //iterate over every step. If we hit a rampart position go back two steps and add a rampart to each position.
                for (let step of path) {
                    pathLastTwoSteps.push(step)
                    //If the pathlasttwosteps array is longer than 2, remove the first step.
                    if (pathLastTwoSteps.length > 3) {
                        pathLastTwoSteps.splice(0, 1)
                    }

                    for (let rampart of rampartPositions) {
                        if (rampart.x == step.x && rampart.y == step.y && !new RoomPosition(rampart.x, rampart.y, room.name).inRangeTo(room.controller.pos, 1)) {
                            for (let i = 0; i < pathLastTwoSteps.length - 1; i++) {
                                room.memory.blueprint.ramparts = room.memory.blueprint.ramparts.concat(Utils.Utility.packPosition(new RoomPosition(pathLastTwoSteps[i].x, pathLastTwoSteps[i].y, room.name)))
                            }
                        }
                    }
                }
            }
        }
    }

    //remove duplicate rampart positions
    let uniqueRampartPositions: Coord[] = []
    for (let rampart of rampartPositions) {
        if (!uniqueRampartPositions.some(pos => pos.x == rampart.x && pos.y == rampart.y)) {
            uniqueRampartPositions.push(rampart)
        }
    }

    for (let rampartPos of uniqueRampartPositions) {
        room.memory.blueprint.ramparts = room.memory.blueprint.ramparts.concat(Utils.Utility.packPosition(new RoomPosition(rampartPos.x, rampartPos.y, room.name)))
    }
}

/**
 * This function will return a single position that is valid to place a link, undefined if nothing is found. It will check out to a range of 5.
 * @param position The position to look around.
 * @param room The room that the position exists in.
 * @param roadPositions The previously calculated road positions.
 * @returns
 */
function getValidPositionAroundPosition(position: PathStep | RoomPosition, room: Room, roadPositions: PathStep[] | RoomPosition[], plannedPositions: RoomPosition[]): RoomPosition | undefined {
        let positions: LookAtResultWithPos<LookConstant>[] = room.lookAtArea(position.y - 1, position.x - 1, position.y + 1, position.x + 1, true)
        for (let pos of positions) {
            if (pos.type == LOOK_TERRAIN && pos.terrain != 'wall' && !roadPositions.some(roadPos => roadPos.x == pos.x && roadPos.y == pos.y && !plannedPositions.some(roadPos => roadPos.x == pos.x && roadPos.y == pos.y))) {
                return new RoomPosition(pos.x, pos.y, room.name)
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

function doesStampFitAtPosition(x: number, y: number, room: Room, structure: StampType, plannedPositions: RoomPosition[], roomVisual?: RoomVisual, controllerOverride: boolean = false): boolean {
    if (x < 7 || y < 7) return false
    if (x > 42 || y > 42) return false
    let controller = room.controller
    if (controller && !controllerOverride) {
        let controllerPos = controller.pos
        let roomPos = new RoomPosition(x, y, room.name)
        if (roomPos.inRangeTo(controllerPos, 4)) return false

        for (let source in room.sources) {
            if (roomPos.inRangeTo(room.sources[source].pos, 2 + Math.ceil(Stamps.getStampSize(structure) / 2))) return false
        }
    }


    if (structure == StampType.ANCHOR ||
        structure == StampType.LABS ||
        structure == StampType.EXTENSIONS ||
        structure == StampType.FAST_FILLER ||
        structure == StampType.TOWER ||
        structure == StampType.EXTENSION ||
        structure == StampType.OBSERVER) {
        let rawStamp = Stamps.getStampParts(structure)

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
    let sources = room.sources

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

function genPlannedRoadCM(cm: CostMatrix, roadPositions: PathStep[], stampRoads: RoomPosition[]): CostMatrix {
    if (!cm) cm = new PathFinder.CostMatrix();
    for (const roadPos of roadPositions) cm.set(roadPos.x, roadPos.y, 1);
    for (const pos of stampRoads) cm.set(pos.x, pos.y, 1);
    return cm;
}

