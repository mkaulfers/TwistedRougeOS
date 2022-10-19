import { LogLevel } from 'utils/Enums';
import { Utils } from 'utils/Index';

declare global {
    interface Source {
        assignablePosition(): RoomPosition | undefined
        isHarvestingAtMaxEfficiency: boolean
        /** Returns count of Resources of Energy adjacent to the Source. */
        nearbyEnergy: number
        /**
        * Checks if a position around a source is a wall, or a valid position a creep can reach to harvest.
        * O is a valid position.
        * X is a wall.
        *     O O O
        *     O X O
        *     O O O
        */
        validPositions: RoomPosition[]
    }
}

export default class Source_Extended extends Source {
    assignablePosition(): RoomPosition | undefined {
        Utils.Logger.log("Source -> assignablePosition()", LogLevel.TRACE);
        let validPositions = this.validPositions
        let assignedPositions = this.room.localCreeps.harvester.map(x => x.memory.assignedPos)
        let unassignedPositions = validPositions.filter(x => !assignedPositions.includes(Utils.Utility.packPosition(x)))
        // Logger.log(`Source ${this.id} has ${unassignedPositions.length} unassigned positions.`, LogLevel.DEBUG)
        return unassignedPositions[0]
    }

    private _isHarvestingAtMaxEfficiency: boolean | undefined;
    get isHarvestingAtMaxEfficiency(): boolean {
        Utils.Logger.log("Source -> isHarvestingAtMaxEfficiency", LogLevel.TRACE);
        if (this._isHarvestingAtMaxEfficiency) {
            return this._isHarvestingAtMaxEfficiency;
        } else if (this.room.my === true) {
            let harvesters = this.room.localCreeps.harvester
            let harvestersAssignedHere: Creep[] = []

            for (let harvester of harvesters) {
                for (let position of this.validPositions) {
                    if (harvester.memory.assignedPos == Utils.Utility.packPosition(position)) {
                        harvestersAssignedHere.push(harvester)
                    }
                }
            }

            let harvestablePerTick = 0
            for (let harvester of harvestersAssignedHere) {
                harvestablePerTick += harvester.getActiveBodyparts(WORK) * 2
            }

            if (harvestablePerTick >= 10 || harvestersAssignedHere.length == this.validPositions.length) {
                return this._isHarvestingAtMaxEfficiency = true;
            } else {
                return this._isHarvestingAtMaxEfficiency = false;
            }
        } else if (true) {
            // FIND ROOM IT IS REMOTE OF
            return false;
        }
    }

    private _nearbyEnergy: number | undefined;
    get nearbyEnergy(): number {
        Utils.Logger.log("Source -> nearbyEnergy", LogLevel.TRACE);
        if (!this._nearbyEnergy) this._nearbyEnergy =this.pos.findInRange(FIND_DROPPED_RESOURCES, 1).filter(x => x.resourceType == RESOURCE_ENERGY).length
        return this._nearbyEnergy;
    }

    private _validPositions: RoomPosition[] | undefined
    get validPositions(): RoomPosition[] {
        Utils.Logger.log("Source -> validPositions", LogLevel.TRACE);
        if (!this._validPositions) {
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
            this._validPositions = validPositions;
        }
        return this._validPositions;
    }


}
