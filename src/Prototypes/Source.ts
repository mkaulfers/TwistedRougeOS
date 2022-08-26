import { Managers } from 'Managers/Index'
import { Utils } from 'utils/Index'
import { Logger } from 'utils/Logger'
import { Utility } from 'utils/Utilities'
import { Roles } from '../Creeps/Index'
import { Role, Task, ProcessPriority, ProcessResult, LogLevel } from '../utils/Enums'

declare global {
    interface Source {
        nearbyEnergy(): number

        /**
        * Checks if a position around a source is a wall, or a valid position a creep can reach to harvest.
        * O is a valid position.
        * X is a wall.
        *     O O O
        *     O X O
        *     O O O
        */
        validPositions(): RoomPosition[]
        isHarvestingAtMaxEfficiency(): boolean
        assignablePosition(): RoomPosition
        droppedEnergy(): Resource | undefined
    }
}

Source.prototype.nearbyEnergy = function (): number {
    let nearby = this.pos.findInRange(FIND_DROPPED_RESOURCES, 1).filter(x => x.resourceType == RESOURCE_ENERGY).length
    return nearby
}

Source.prototype.validPositions = function (): RoomPosition[] {
    let validPositions: RoomPosition[] = []
    let nonValidatedPositions: { x: number, y: number }[] = []

        nonValidatedPositions.push(
            { x: this.pos.x - 1, y: this.pos.y - 1 },
            { x: this.pos.x, y: this.pos.y - 1 },
            { x: this.pos.x + 1, y: this.pos.y - 1 },
            { x: this.pos.x - 1, y: this.pos.y },
            { x: this.pos.x + 1, y: this.pos.y },
            { x: this.pos.x - 1, y: this.pos.y + 1 },
            { x: this.pos.x, y: this.pos.y + 1 },
            { x: this.pos.x + 1, y: this.pos.y + 1 }
        )

    let roomTerrain = Game.map.getRoomTerrain(this.room.name)

    for (let position of nonValidatedPositions) {
        if (roomTerrain.get(position.x, position.y) != TERRAIN_MASK_WALL) {
            validPositions.push(new RoomPosition(position.x, position.y, this.room.name))
        }
    }
    return validPositions
}

Source.prototype.isHarvestingAtMaxEfficiency = function (): boolean {
    let harvesters = this.room.creeps(Role.HARVESTER)
    let harvestersAssignedHere: Creep[] = []

    for (let harvester of harvesters) {
        for (let position of this.validPositions()) {
            if (harvester.memory.assignedPos == Utility.packPosition(position)) {
                harvestersAssignedHere.push(harvester)
            }
        }
    }

    let harvestablePerTick = 0
    for (let harvester of harvestersAssignedHere) {
        harvestablePerTick += harvester.getActiveBodyparts(WORK) * 2
    }

    if (harvestablePerTick >= 10 || harvestersAssignedHere.length == this.validPositions().length) {
        return true
    } else {
        return false
    }
}

Source.prototype.assignablePosition = function (): RoomPosition {
    let validPositions = this.validPositions()
    let assignedPositions = this.room.creeps(Role.HARVESTER).map(x => x.memory.assignedPos)
    let unassignedPositions = validPositions.filter(x => !assignedPositions.includes(Utility.packPosition(x)))
    // Logger.log(`Source ${this.id} has ${unassignedPositions.length} unassigned positions.`, LogLevel.DEBUG)
    return unassignedPositions[0]
}

Source.prototype.droppedEnergy = function (): Resource | undefined {
    let droppedEnergy = this.pos.findInRange(FIND_DROPPED_RESOURCES, 1).filter(x => x.resourceType == RESOURCE_ENERGY)
    let mostDroppedEnergyResource: Resource | undefined = undefined
    for (let resource of droppedEnergy) {
        if (!mostDroppedEnergyResource) { mostDroppedEnergyResource = resource }

        if (resource.amount > mostDroppedEnergyResource.amount) {
            mostDroppedEnergyResource = resource
        }
    }
    return mostDroppedEnergyResource
}
