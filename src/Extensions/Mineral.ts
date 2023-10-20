import { TRACE } from 'Constants/LogConstants';
import { Utils } from 'utils/Index';

declare global {
    interface Mineral {
        /** Boolean confirming if support structure is in place to support active mining. */
        isReady: boolean
    }
}

export default class Mineral_Extended extends Mineral {
    // TODO: Add effect analysis
    private _isReady: boolean | undefined;
    get isReady(): boolean {
        if (!this._isReady) {
            switch (true) {
                // Extractor exists
                case this.pos.findInRange(FIND_MY_STRUCTURES, 0, {filter: {structureType: STRUCTURE_EXTRACTOR}}).length == 0:
                // Container exists
                case this.pos.findInRange(FIND_MY_STRUCTURES, 1, {filter: {structureType: STRUCTURE_CONTAINER}}).length == 0:
                // There is some amount to mine.
                case this.mineralAmount == 0:
                    this._isReady = false
                    break
                default:
                    this._isReady = true
                    break
            }
        }
        return this._isReady;
    }
}


