import { Logger } from '../utils/Logger';
import { Role, Task, ProcessPriority, ProcessResult, LogLevel } from '../utils/Enums'

declare global {
    interface StructureController {
        isSigned(): boolean;
    }
}

StructureController.prototype.isSigned = function () {
    Logger.log("Controller -> isSigned()", LogLevel.TRACE)

    let sign = this.sign;
    let spawn = Game.spawns[_.keys(Game.spawns)[0]]
    if (!sign || sign.username !== spawn.owner.username) return false;
    return true;
}
