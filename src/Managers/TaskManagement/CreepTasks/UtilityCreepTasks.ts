import { Logger, LogLevel } from "utils/Logger";

declare global {
    interface Creep {
        travel(pos: RoomPosition): number;
        getOffExit(): number;
        moveToDefault(pos: RoomPosition): number;
        take(target: AnyStoreStructure | Resource | Tombstone, resource: ResourceConstant, quantity?: number): number;
        give(target: AnyStoreStructure | Creep, resource: ResourceConstant, quantity?: number): number;
        mine(target: Source | Mineral): number;
        work(target: Structure | ConstructionSite): number;
        praise(target: StructureController): number;                                                    // upgrade, sign
        firstaid(target: Creep): number;                                                                // heal, rangedHeal
        destroy(target?: Structure | Creep): number;                                                    // dismantle, attack, rangedAttack, RMA
        nMRController(target: Id<StructureController>): number;                                         // Not my rooms controller; sign, reserve, attack, claim
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
        case ERR_NOT_OWNER: case ERR_INVALID_TARGET: case ERR_NO_PATH: case ERR_NOT_FOUND: case ERR_NO_BODYPART:
            Logger.log(`${this.name} recieved result ${result} from Travel with args (${pos}).`, LogLevel.ERROR);
            return result;
    }

    return OK;
}

Creep.prototype.moveToDefault = function(pos: RoomPosition) {
    // Visualization for fun, will remove long term.
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

Creep.prototype.take = function(target, resource, quantity) {

    let result: number;
    if ('store' in target) {
        result = this.withdraw(target, resource, quantity);
    } else {
        result = this.pickup(target);
    }

    switch (result) {
        case OK: case ERR_BUSY:
            return OK;
        case ERR_NOT_IN_RANGE:
            return this.travel(target.pos);
        case ERR_NOT_OWNER: case ERR_INVALID_TARGET: case ERR_INVALID_ARGS: case ERR_NOT_ENOUGH_RESOURCES: case ERR_FULL:
            Logger.log(`${this.name} recieved result ${result} from Take with args (${target}, ${resource}, ${quantity}).`, LogLevel.ERROR);
            return result;
    }

    return OK;
}

Creep.prototype.give = function(target, resource, quantity) {
    let result: number = this.transfer(target, resource, quantity);

    switch (result) {
        case OK: case ERR_BUSY:
            return OK;
        case ERR_NOT_IN_RANGE:
            return this.travel(target.pos);
        case ERR_NOT_OWNER: case ERR_INVALID_TARGET: case ERR_INVALID_ARGS: case ERR_NOT_ENOUGH_RESOURCES: case ERR_FULL:
            Logger.log(`${this.name} recieved result ${result} from Give with args (${target}, ${resource}, ${quantity}).`, LogLevel.ERROR);
            return result;
    }
    return OK;
}

Creep.prototype.mine = function(target) {
    let result: number = this.harvest(target);

    switch (result) {
        case OK: case ERR_BUSY: case ERR_TIRED:
            return OK;
        case ERR_NOT_IN_RANGE:
            return this.travel(target.pos);
        case ERR_NOT_OWNER: case ERR_NOT_FOUND: case ERR_NOT_ENOUGH_RESOURCES: case ERR_INVALID_TARGET: case ERR_NO_BODYPART:
            Logger.log(`${this.name} recieved result ${result} from Mine with args (${target.pos}).`, LogLevel.ERROR);
            return result;
    }
    return OK;
}

Creep.prototype.work = function(target) {
    let result: number;
    if ('remove' in target) {
        result = this.build(target);
    } else {
        result = this.repair(target);
    }

    switch (result) {
        case OK: case ERR_BUSY:
            return OK;
        case ERR_NOT_IN_RANGE:
            return this.travel(target.pos);
        case ERR_NOT_OWNER: case ERR_NOT_ENOUGH_RESOURCES: case ERR_INVALID_TARGET: case ERR_NO_BODYPART:
            Logger.log(`${this.name} recieved result ${result} from Take with args (${target}).`, LogLevel.ERROR);
            return result;
    }
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
