import { TRACE } from 'Constants/LogConstants';
import { Utils } from 'utils/Index';

declare global {
    interface RoomPosition {
        /** Determines if position is on the edge of the room. */
        onEdge: boolean;
        /** Determines if position is on or adjacent to the edge of the room. */
        nearEdge: boolean;
        /** Determines if there are multiple adjacent positions open to the room position. */
        multipleAdjacentOpen: boolean;
    }
}

export default class RoomPosition_Extended extends RoomPosition {
    private _onEdge: boolean | undefined;
    get onEdge(): boolean {
        Utils.Logger.log("RoomPosition -> onEdge", TRACE);
        if (!this._onEdge) {
            if (this.x === 0 ||
                this.x === 49 ||
                this.y === 0 ||
                this.y === 49) this._onEdge = true;
            else this._onEdge = false;
        }
        return this._onEdge;
    }

    private _nearEdge: boolean | undefined;
    get nearEdge(): boolean {
        Utils.Logger.log("RoomPosition -> onEdge", TRACE);
        if (!this._nearEdge) {
            if (this.x < 2 ||
                this.x > 47 ||
                this.y < 2 ||
                this.y > 47) this._nearEdge = true;
            else this._nearEdge = false;
        }
        return this._nearEdge;
    }

    private _multipleAdjacentOpen: boolean | undefined;
    get multipleAdjacentOpen(): boolean {
        Utils.Logger.log("RoomPosition -> multipleAdjacentOpen", TRACE);
        if (!this._multipleAdjacentOpen) {
            let openCount = 0;
            for (let x = -1; x <= 1; x++) {
                for (let y = -1; x <= 1; x++) {
                    const look = new RoomPosition(this.x + x, this.y + y, this.roomName).look();
                    let open = true;
                    for (const found of look) {
                        // Creep
                        if (found.type === LOOK_CREEPS || found.type === LOOK_POWER_CREEPS) open = false;
                        // Terrain
                        if (found.type === LOOK_TERRAIN && found.terrain === 'wall') open = false;
                        // Structure
                        if (found.type === LOOK_STRUCTURES && found.structure?.structureType !== STRUCTURE_ROAD && found.structure?.structureType !== STRUCTURE_CONTAINER) open = false;
                    }
                    if (open === true) openCount++;
                }
            }

            if (openCount >= 2) this._multipleAdjacentOpen = true;
            else this._multipleAdjacentOpen = false;
        }
        return this._multipleAdjacentOpen;
    }
}
