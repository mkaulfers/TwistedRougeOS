import { TRACE } from 'Constants/LogConstants';
import { Utils } from 'utils/Index';
declare global {
    interface StructureTower {
        /**
         * Calculates the damage to a target location. Accepts a RoomPosition or x & y.
         */
        damage(posOrX: RoomPosition | number, y?: number): number;
    }
}

export default class Tower_Extended extends StructureTower {
    damage(posOrX: RoomPosition | number, y?: number): number {
        Utils.Logger.log("Tower -> damage()", TRACE);
        let pos: RoomPosition;
        if (typeof posOrX === 'number') {
            if (!y) return ERR_INVALID_ARGS;
            let x = posOrX;
            pos = new RoomPosition(x,y, this.room.name);
        } else {
            pos = posOrX;
        }
        if (this.room.name !== pos.roomName) return ERR_NOT_IN_RANGE;

        let dist = this.pos.getRangeTo(pos.x,pos.y)
        if (dist < 5) dist = 5;
        if (dist > 20) dist = 20;

        return ((-30*dist)+750)
    }
}


