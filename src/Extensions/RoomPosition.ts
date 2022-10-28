import { TRACE } from 'Constants/LogConstants';
import { Utils } from 'utils/Index';

declare global {
    interface RoomPosition {
        /** Determines if position is on the edge of the room. */
        onEdge: boolean;
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
}
