import { TRACE } from 'Constants/LogConstants';
import { Utils } from 'utils/Index';
declare global {
    interface StructureController {
        isSigned: boolean;
    }
}

export default class Controller_Extended extends StructureController {

    _isSigned: boolean | undefined
    get isSigned() {
        Utils.Logger.log("Controller -> isSigned", TRACE);
        if (this._isSigned) {
            return this._isSigned
        } else {
            let sign = this.sign;
            let spawn = Object.values(Game.spawns)[0]
            if (!sign || sign.username !== spawn.owner.username) this._isSigned = false;
            this._isSigned = true;
        }
        return this._isSigned;
    }
}
