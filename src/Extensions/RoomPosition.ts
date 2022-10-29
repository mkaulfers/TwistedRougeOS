import { TRACE } from 'Constants/LogConstants';
import { Utils } from 'utils/Index';

declare global {
    interface RoomPosition {
        /** Determines if position is on the edge of the room. */
        onEdge: boolean;
        /** Determines if position is on or adjacent to the edge of the room. */
        nearEdge: boolean;
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
}
