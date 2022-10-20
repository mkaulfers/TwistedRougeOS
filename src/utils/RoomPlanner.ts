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

    let allExitSections = getExits(room)
    let plannedPositions: RoomPosition[] = []
    let savedRoadPositions: PathStep[] = []
    let unsavedRoadPositions: RoomPosition[] = []
    let stamps: { type: StampType, stampPos: number, completed: boolean }[] = []

    setStampSites(room, blueprintAnchor, stamps, plannedPositions, unsavedRoadPositions)
    setExitPaths(allExitSections, blueprintAnchor, savedRoadPositions, unsavedRoadPositions)
    setSourceSites(room, blueprintAnchor, plannedPositions, savedRoadPositions, unsavedRoadPositions)
    setMineralSite(room, blueprintAnchor, savedRoadPositions, unsavedRoadPositions)
    setControllerSite(room, blueprintAnchor, plannedPositions, savedRoadPositions, unsavedRoadPositions)
    removeRoadsGennedAtStampPositions(room, stamps, savedRoadPositions)
    setRampartPositions(room, allExitSections, blueprintAnchor, stamps, savedRoadPositions, unsavedRoadPositions)
}

/**
 * Sets the initial stamps for the room.
 * @param room - The room to plan in.
 * @param blueprintAnchor - The anchor position of the blueprint.
 * @param stamps - The array of stamps to be placed.
 * @param plannedPositions - The array of positions that have been planned for.
 * @param unsavedRoadPositions - The array of positions that have been planned for, but not saved to the roadPositions array.
 * @returns
 */
function setStampSites(room: Room, blueprintAnchor: RoomPosition, stamps: { type: StampType, stampPos: number, completed: boolean }[], plannedPositions: RoomPosition[], unsavedRoadPositions: RoomPosition[]) {
    for (let building of buildOrder) {
        let stampPos = floodFillSearch(room, blueprintAnchor, building, plannedPositions)
        if (stampPos) {
            stamps.push({ type: building, stampPos: Utils.Utility.packPosition(stampPos), completed: false })
            Stamps.plan(stampPos, building, plannedPositions, unsavedRoadPositions)
        }
    }
    if (!room || !room.memory || !room.memory.blueprint) return;
    room.memory.blueprint.stamps.push(...stamps)
}

/**
 * Sets a path to each of the exits in the room.
 * @param allExitSections - The array of exit sections.
 * @param blueprintAnchor - The anchor position of the blueprint.
 * @param savedRoadPositions - The array of positions that have been planned for, and saved to the roadPositions array.
 * @param unsavedRoadPositions - The array of positions that have been planned for, but not saved to the roadPositions array.
 */
function setExitPaths(allExitSections: RoomPosition[][][], blueprintAnchor: RoomPosition, savedRoadPositions: PathStep[], unsavedRoadPositions: RoomPosition[]) {
    for (let exitSectionsOnSide of allExitSections) {
        for (let section of exitSectionsOnSide) {
            let shortestExit = blueprintAnchor.findClosestByPath(section, { ignoreCreeps: true, ignoreDestructibleStructures: true, swampCost: 2 })
            if (!shortestExit) continue;
            let path = blueprintAnchor.findPathTo(shortestExit, { ignoreCreeps: true, ignoreDestructibleStructures: true, swampCost: 2, costCallback: (roomName) => genPlannedRoadCM(Utility.genPathfindingCM(roomName), savedRoadPositions, unsavedRoadPositions) })
            path.splice(path.length - 1, 1)
            savedRoadPositions.push(...path)
        }
    }
}

/**
 * Sets the path to sources, their respective container and link positions.
 * @param room - The room to plan in.
 * @param blueprintAnchor - The anchor position of the blueprint.
 * @param plannedPositions - The array of positions that have been planned for.
 * @param savedRoadPositions - The array of positions that have been planned for, and saved to the roadPositions array.
 * @param unsavedRoadPositions - The array of positions that have been planned for, but not saved to the roadPositions array.
 */
function setSourceSites(room: Room, blueprintAnchor: RoomPosition, plannedPositions: RoomPosition[], savedRoadPositions: PathStep[], unsavedRoadPositions: RoomPosition[]) {
    let sources = room.sources
    for (const source of sources) {
        // Handle Source Paths
        let sourcePath = blueprintAnchor.findPathTo(source, { ignoreCreeps: true, ignoreDestructibleStructures: true, swampCost: 2, costCallback: (roomName) => genPlannedRoadCM(Utility.genPathfindingCM(roomName), savedRoadPositions, unsavedRoadPositions) })
        for (let i = 0; i < sourcePath.length - 3; i++) savedRoadPositions.push(sourcePath[i])

        // Handle Container Pos for source
        let containerPos = sourcePath[sourcePath.length - 2]
        if (!room || !room.memory || !room.memory.blueprint) continue;
        room.memory.blueprint.containers.push(Utils.Utility.packPosition(new RoomPosition(containerPos.x, containerPos.y, room.name)))

        // Handle Link Pos for source
        let adjustedPos = getValidPositionAroundPosition(containerPos, room, savedRoadPositions, plannedPositions)
        if (adjustedPos) room.memory.blueprint.links.push(Utils.Utility.packPosition(new RoomPosition(adjustedPos.x, adjustedPos.y, room.name)))
    }
    if (sources.length == 2) {
        let source1 = sources[0]
        let source2 = sources[1]
        let pathBetweenSources = source1.pos.findPathTo(source2, { ignoreCreeps: true, ignoreDestructibleStructures: true, swampCost: 2, costCallback: (roomName) => genPlannedRoadCM(Utility.genPathfindingCM(roomName), savedRoadPositions, unsavedRoadPositions) })
        pathBetweenSources.splice(pathBetweenSources.length - 1, 1)
        pathBetweenSources.splice(0, 1)
        savedRoadPositions.push(...pathBetweenSources)
    }

}

/**
 * Sets the path to the mineral site and the position of the container.
 * @param room - The room to plan in.
 * @param blueprintAnchor - The anchor position of the blueprint.
 * @param savedRoadPositions - The array of positions that have been planned for, and saved to the roadPositions array.
 * @param unsavedRoadPositions - The array of positions that have been planned for, but not saved to the roadPositions array.
 * @returns
 */
function setMineralSite(room: Room, blueprintAnchor: RoomPosition, savedRoadPositions: PathStep[], unsavedRoadPositions: RoomPosition[]) {
    let mineral = room.mineral
    if (mineral) {
        let mineralPath: PathStep[] = blueprintAnchor.findPathTo(mineral, { ignoreCreeps: true, ignoreDestructibleStructures: true, swampCost: 2, costCallback: (roomName) => genPlannedRoadCM(Utility.genPathfindingCM(roomName), savedRoadPositions, unsavedRoadPositions) })

        let containerPos = mineralPath[mineralPath.length - 2]
        if (!room || !room.memory || !room.memory.blueprint) return;
        room.memory.blueprint.containers.push(Utils.Utility.packPosition(new RoomPosition(containerPos.x, containerPos.y, room.name)))

        mineralPath.splice(mineralPath.length - 2, 2)
        savedRoadPositions.push(...mineralPath)
    }
}

/**
 * Sets the path to the controller and the link position for the controller.
 * @param room - The room to plan in.
 * @param blueprintAnchor - The anchor position of the blueprint.
 * @param plannedPositions - The array of positions that have been planned for.
 * @param savedRoadPositions - The array of positions that have been planned for, and saved to the roadPositions array.
 * @param unsavedRoadPositions - The array of positions that have been planned for, but not saved to the roadPositions array.
 * @returns
 */
function setControllerSite(room: Room, blueprintAnchor: RoomPosition, plannedPositions: RoomPosition[], savedRoadPositions: PathStep[], unsavedRoadPositions: RoomPosition[]) {
    if (!room || !room.memory || !room.controller || !room.memory.blueprint) return;
    let pathToController = blueprintAnchor.findPathTo(room.controller.pos, { ignoreCreeps: true, ignoreDestructibleStructures: true, swampCost: 2, costCallback: (roomName) => genPlannedRoadCM(Utility.genPathfindingCM(roomName), savedRoadPositions, unsavedRoadPositions) })
    pathToController.splice(pathToController.length - 1, 1)
    savedRoadPositions.push(...pathToController)

    let controllerLink = pathToController[pathToController.length - 1]
    let adjustedPos = getValidPositionAroundPosition(controllerLink, room, savedRoadPositions, plannedPositions)
    if (adjustedPos) room.memory.blueprint.links.push(Utils.Utility.packPosition(new RoomPosition(adjustedPos.x, adjustedPos.y, room.name)))
}

/**
 * Removes any previously generated roads from the savedRoadPositions if they are already planned in a stamp. This is to prevent roads under unpathable structures.
 * @param room - The room to plan in.
 * @param stamps - The array of stamps to use.
 * @param savedRoadPositions - The array of positions that have been planned for, and saved to the roadPositions array.
 * @returns
 */
function removeRoadsGennedAtStampPositions(room: Room, stamps: { type: StampType, stampPos: number, completed: boolean }[], savedRoadPositions: PathStep[]) {
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

    for (let i = savedRoadPositions.length - 1; i >= 0; i--) {
        for (let remove of pathsToRemove) {
            if (savedRoadPositions[i].x == remove.x && savedRoadPositions[i].y == remove.y) {
                savedRoadPositions.splice(i, 1)
            }
        }
    }

    for (let roadPos of savedRoadPositions) {
        if (!room || !room.memory || !room.memory.blueprint) return;
        room.memory.blueprint.highways.push(Utils.Utility
            .packPosition(new RoomPosition(roadPos.x, roadPos.y, room.name)))
    }
}

/**
 * Sets the rampart positions for min-cut, controller, anchor, turrets, and exit tunnels out of the base.
 * @param room - The room to plan in.
 * @param allExitSections - The array of all exit sections.
 * @param blueprintAnchor - The anchor position of the blueprint.
 * @param stamps - The array of stamps to use.
 * @param savedRoadPositions - The array of positions that have been planned for, and saved to the roadPositions array.
 * @param unsavedRoadPositions - The array of positions that have been planned for, but not saved to the roadPositions array.
 * @returns
 */
function setRampartPositions(room: Room, allExitSections: RoomPosition[][][], blueprintAnchor: RoomPosition, stamps: { type: StampType, stampPos: number, completed: boolean }[], savedRoadPositions: PathStep[], unsavedRoadPositions: RoomPosition[]) {
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

    if (!room || !room.memory || !room.controller ||!room.memory.blueprint) return;
    let controllerRect: Rectangle = { x1: room.controller.pos.x - 1, y1: room.controller?.pos.y - 1, x2: room.controller.pos.x + 1, y2: room.controller.pos.y + 1 }
    for (let x = controllerRect.x1; x <= controllerRect.x2; x++) {
        for (let y = controllerRect.y1; y <= controllerRect.y2; y++) {
            if (!room.lookForAt(LOOK_TERRAIN, x, y).includes('wall')) {
                rampartPositions.push({ x: x, y: y })
            }
        }
    }

    for (let exitPath of allExitSections) {
        for (let exitPos of exitPath) {
            let closest = blueprintAnchor.findClosestByPath(exitPos, { ignoreCreeps: true, ignoreDestructibleStructures: true, swampCost: 2 })
            if (closest != null) {
                let path = blueprintAnchor.findPathTo(closest, { ignoreCreeps: true, ignoreDestructibleStructures: true, swampCost: 2, costCallback: (roomName) => genPlannedRoadCM(Utility.genPathfindingCM(roomName), savedRoadPositions, unsavedRoadPositions) })

                path.reverse();

                // Iterate over every step. If we hit a rampart position go back two steps and add a rampart to each position.
                for (let step of path) {
                    // Find rampart at step
                    let rampartIndex = rampartPositions.findIndex((pos) => step.x === pos.x && step.y === pos.y);
                    if (rampartIndex === -1) continue;

                    // Get index of step and add two beyond it for entering ramparts for defenders.
                    let i = path.indexOf(step);
                    rampartPositions.push({ x: path[i + 1].x, y: path[i + 1].y });
                    rampartPositions.push({ x: path[i + 2].x, y: path[i + 2].y });
                    break;
                }
            }
        }
    }

    // Remove duplicate rampart positions
    let uniqueRampartPositions: Coord[] = []
    for (let rampart of rampartPositions) {
        if (!uniqueRampartPositions.some(pos => pos.x == rampart.x && pos.y == rampart.y)) {
            uniqueRampartPositions.push(rampart)
        }
    }

    for (let rampartPos of uniqueRampartPositions) {
        room.memory.blueprint.ramparts.push(Utils.Utility.packPosition(new RoomPosition(rampartPos.x, rampartPos.y, room.name)))
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
        if (pos.x === position.x && pos.y === position.y) continue;
        if (pos.type == LOOK_TERRAIN && pos.terrain != 'wall' && !roadPositions.some(roadPos => roadPos.x == pos.x && roadPos.y == pos.y && !plannedPositions.some(roadPos => roadPos.x == pos.x && roadPos.y == pos.y))) {
            return new RoomPosition(pos.x, pos.y, room.name)
        }
    }

    return undefined
}

/**
 * @param room The room to plan in.
 * @param startPosition The position to start the path from.
 * @param structure The structure to find a path to.
 * @param plannedPositions The positions that have already been planned for.
 * @returns
 */
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

/**
 * @param x The x position to check.
 * @param y The y position to check.
 * @param room The room to check in.
 * @param structure The structure to check for.
 * @param plannedPositions The positions that have already been planned for.
 * @param roomVisual The room visual to draw the rectangle on.
 * @param controllerOverride The controller position to override the default one.
 * @returns
 */
function doesStampFitAtPosition(x: number, y: number, room: Room, structure: StampType, plannedPositions: RoomPosition[], roomVisual?: RoomVisual, controllerOverride: boolean = false): boolean {
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

            for (let exit of room.exits ?? []) {
                if (exit.inRangeTo(position.x, position.y, 7)) return false
            }

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
 * This function will return an array of exits along the sides of the room.
 * @param room The room to plan in.
 * @returns An array of exits, where the outermost is all, the next is top, left, right, bottom, and the innermost is the split sections of the exits.
 */
function getExits(room: Room): RoomPosition[][][] {
    let exitParams = {
        left: { startX: 0, startY: 0, endX: 0, endY: 49 },
        right: { startX: 49, startY: 0, endX: 49, endY: 49 },
        top: { startX: 0, startY: 0, endX: 49, endY: 0 },
        bottom: { startX: 0, startY: 49, endX: 49, endY: 49 }
    }

    let posCache: RoomPosition[] = []
    let splitSections: RoomPosition[][] = []
    let exits: RoomPosition[][][] = []

    for (let exit of Object.values(exitParams)) {
        for (let exitX = exit.startX; exitX <= exit.endX; exitX++) {
            for (let exitY = exit.startY; exitY <= exit.endY; exitY++) {
                let position = room.lookAt(new RoomPosition(exitX, exitY, room.name))
                let hasWall = false
                for (let result of position) {
                    if (result.terrain == 'wall') {
                        hasWall = true
                        break
                    }
                }

                if (!hasWall) {
                    posCache.push(new RoomPosition(exitX, exitY, room.name))
                } else {
                    splitSections.push(posCache)
                    posCache = []
                }
            }
        }

        for (let i = splitSections.length - 1; i >= 0; i--) {
            if (splitSections[i].length == 0) {
                splitSections.splice(i, 1)
            }
        }

        //Add split sections to exits
        exits.push(splitSections)
        posCache = []
        splitSections = []
    }

    return exits
}

/**
 * @param room The room to plan in.
 * @param positions The positions to plan for.
 * @returns A single point that is the center most point between all sources and the controller.
 */
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

