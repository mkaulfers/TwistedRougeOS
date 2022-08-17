import { Logger, LogLevel } from "utils/Logger";
import { Role } from "../utils/Enums";
import { baseHarBody } from "./SpawnManager";

declare global {
    interface Room {
        creeps(role?: Role): Creep[];

        /**
        * Checks if a position around a source is a wall, or a valid position a creep can reach to harvest.
        * O is a valid position.
        * X is a wall.
        *     O O O
        *     O X O
        *     O O O
        */
        validSourcePositions(): RoomPosition[]
        getAvailableSpawn(): StructureSpawn | undefined
        sourcesEnergyPotential(): number
        harvestersWorkPotential(): number
        sources(): Source[]
    }
}

Room.prototype.creeps = function (role?: Role): Creep[] {
    if (!role) {
        return this.find(FIND_MY_CREEPS);
    }
    return this.find(FIND_MY_CREEPS, { filter: (c: Creep) => c.memory.role === role });
}

Room.prototype.sources = function (): Source[] {
    return this.find(FIND_SOURCES)
}

// I statically programmed the positions to reduce CPU usage.
// There is an algorithm that can do this, but it's not worth the CPU in this case.
Room.prototype.validSourcePositions = function (): RoomPosition[] {
    let sources = this.find(FIND_SOURCES)
    let validPositions: RoomPosition[] = []
    let nonValidatedPositions: { x: number, y: number }[] = []

    for (let source of sources) {
        nonValidatedPositions.push(
            { x: source.pos.x - 1, y: source.pos.y - 1 },
            { x: source.pos.x, y: source.pos.y - 1 },
            { x: source.pos.x + 1, y: source.pos.y - 1 },
            { x: source.pos.x - 1, y: source.pos.y },
            { x: source.pos.x + 1, y: source.pos.y },
            { x: source.pos.x - 1, y: source.pos.y + 1 },
            { x: source.pos.x, y: source.pos.y + 1 },
            { x: source.pos.x + 1, y: source.pos.y + 1 }
        )
    }

    let roomTerrain = Game.map.getRoomTerrain(this.name)

    for (let position of nonValidatedPositions) {
        if (roomTerrain.get(position.x, position.y) != TERRAIN_MASK_WALL) {
            validPositions.push(RoomPosition(position.x, position.y, this.name))
        }
    }

    return validPositions
}

Room.prototype.getAvailableSpawn = function (): StructureSpawn | undefined {
    let spawns = this.find(FIND_MY_SPAWNS)
    for (let spawn of spawns) {
        if (spawn.spawning == null) {
            return spawn
        }
    }
    return undefined
}

Room.prototype.sourcesEnergyPotential = function (): number {
    let validSourcePositions = this.validSourcePositions()
    let positionalEnergy = validSourcePositions.length * (baseHarBody.filter(x => x == WORK).length * 2)
    Logger.log(`Source Positions: ${validSourcePositions.length}, Energy: ${positionalEnergy}`, LogLevel.DEBUG)
    return positionalEnergy > this.sources().length * 10 ? this.sources().length * 10 : positionalEnergy
}

Room.prototype.harvestersWorkPotential = function (): number {
    let harvesters = this.creeps(Role.HARVESTER)
    let harvestersPotential = 0
    for (let harvester of harvesters) {
        harvestersPotential += harvester.getActiveBodyparts(WORK)
    }
    return harvestersPotential * 2
}
