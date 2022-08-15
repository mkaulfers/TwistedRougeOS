import { Logger, LogLevel } from "utils/Logger";

declare global {
    interface Creep {
        travel(pos: RoomPosition): number;                                                                  // default movement method for single creeps that handles multi-room travel.. poorly
        getOffExit(): number;
        moveToDefault(pos: RoomPosition): number;
        take(target: Id<AnyStoreStructure | Resource | Tombstone>, resource: ResourceConstant): number;     // withdraw, pickup
        give(target: Id<AnyStoreStructure | Creep>, resource: ResourceConstant): number;                    // transfer
        mine(target: Id<Source | Mineral>): number;                                                         // harvest
        work(target: Id<Structure | ConstructionSite>): number;                                             // build, repair
        praise(target: Id<StructureController>): number;                                                    // upgrade, sign
        firstaid(target: Id<Creep>): number;                                                                // heal, rangedHeal
        destroy(target?: Id<Structure> | Creep): number;                                                    // dismantle, attack, rangedAttack, RMA
        nMRController(target: Id<StructureController>): number;                                             // Not my rooms controller; sign, reserve, attack, claim
        isBoosted(): number;
    }
}
export {};

Creep.prototype.travel = function(pos) {

    let result: number;
    if (pos.roomName === this.room.name) {
        result = this.moveToDefault(pos);
    } else {
        let route = Game.map.findRoute(this.room.name, this.room.name);
        if (route == ERR_NO_PATH) {
            result = ERR_NO_PATH;
        } else {
            let goto  = this.pos.findClosestByRange(route[0].exit);
            if (!goto) {
                result = ERR_NO_PATH;
            } else {
                result = this.moveToDefault(goto);
            }
        }
    }
    this.getOffExit();

    switch (result) {
        case OK: case ERR_BUSY: case ERR_TIRED:
            return OK;
        case ERR_NOT_OWNER: case ERR_INVALID_TARGET: case ERR_NO_PATH: case ERR_NOT_FOUND:
            Logger.log(`${this.name} recieved result ${result} from Travel.`, LogLevel.ERROR);
            return result;
    }

    return OK;
}

Creep.prototype.moveToDefault = function(pos: RoomPosition) {
    // visualization for fun, will remove long term
    return this.moveTo(pos, {visualizePathStyle: {
        fill: 'transparent',
        stroke: '#fff',
        lineStyle: 'dashed',
        strokeWidth: .15,
        opacity: .1
    }});
}

Creep.prototype.getOffExit = function() {
    let exits = [0, 49];
    switch (true) {
        case (this.pos.x === 0):
            this.move(RIGHT);
            break;
        case (this.pos.x === 49):
            this.move(LEFT);
            break;
        case (this.pos.y === 0):
            this.move(BOTTOM);
            break;
        case (this.pos.y === 49):
            this.move(TOP);
            break;
    }
    return OK;
}

Creep.prototype.take = function(target, resource) {

    return OK;
}

Creep.prototype.give = function(target, resource) {

    return OK;
}

Creep.prototype.mine = function(target) {

    return OK;
}

Creep.prototype.work = function(target) {

    return OK;
}

Creep.prototype.praise = function(target) {

    return OK;
}

Creep.prototype.firstaid = function(target) {

    return OK;
}

Creep.prototype.destroy = function(target) {

    return OK;
}

Creep.prototype.nMRController = function(target) {

    return OK;
}

Creep.prototype.isBoosted = function() {

    return OK;
}
