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
        praise(target: StructureController): number;
        firstaid(target: Creep): number;
        destroy(target?: Structure | Creep): number;
        nMRController(target: string): number;
        isBoosted(): boolean;               // Placeholder
    }

    interface StructureController {
        isSigned(): boolean;
    }
}
export { };

Creep.prototype.travel = function (pos) {

    let result: number;
    if (pos.roomName === this.room.name) {
        result = this.moveToDefault(pos);
    } else {
        let route = Game.map.findRoute(this.room.name, this.room.name);
        if (route == ERR_NO_PATH) {
            result = ERR_NO_PATH;
        } else {
            let goto = this.pos.findClosestByRange(route[0].exit);
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

Creep.prototype.moveToDefault = function (pos: RoomPosition) {
    // Visualization for fun, will remove long term.
    return this.moveTo(pos, {
        visualizePathStyle: {
            fill: 'transparent',
            stroke: '#fff',
            lineStyle: 'dashed',
            strokeWidth: .15,
            opacity: .1
        }
    });
}

Creep.prototype.getOffExit = function () {
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

Creep.prototype.take = function (target, resource, quantity) {

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

Creep.prototype.give = function (target, resource, quantity) {
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

Creep.prototype.mine = function (target) {
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

Creep.prototype.work = function (target) {
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
            Logger.log(`${this.name} recieved result ${result} from Work with args (${target}).`, LogLevel.ERROR);
            return result;
    }
    return OK;
}

Creep.prototype.praise = function (target) {
    let result: number = this.upgradeController(target);

    if (!target.isSigned()) {
        let text = 'Signs are meant to be signed, right?'
        if (this.signController(target, text) == ERR_NOT_IN_RANGE) this.travel(target.pos);
    }

    switch (result) {
        case OK: case ERR_BUSY:
            return OK;
        case ERR_NOT_IN_RANGE:
            return this.travel(target.pos);
        case ERR_NOT_OWNER: case ERR_NOT_ENOUGH_RESOURCES: case ERR_INVALID_TARGET: case ERR_NO_BODYPART:
            Logger.log(`${this.name} recieved result ${result} from Praise with args (${target}).`, LogLevel.ERROR);
            return result;
    }
    return OK;
}

Creep.prototype.firstaid = function (target) {
    let result: number;
    if (this.pos.getRangeTo(target) < 2) {
        result = this.heal(target);
    } else {
        result = this.rangedHeal(target);
    }

    switch (result) {
        case OK: case ERR_BUSY:
            return OK;
        case ERR_NOT_IN_RANGE:
            return this.travel(target.pos);
        case ERR_NOT_OWNER: case ERR_INVALID_TARGET: case ERR_NO_BODYPART:
            Logger.log(`${this.name} recieved result ${result} from Firstaid with args (${target}).`, LogLevel.ERROR);
            return result;
    }
    return OK;
}

Creep.prototype.destroy = function (target) {
    let result: number;
    let work = this.getActiveBodyparts(WORK);
    let attack = this.getActiveBodyparts(ATTACK);
    let ra = this.getActiveBodyparts(RANGED_ATTACK);

    if (!target) {
        result = this.rangedMassAttack();
    } else if (work && "structureType" in target) {
        result = this.dismantle(target);
        this.rangedMassAttack();
    } else if (attack) {
        result = this.attack(target);
        if (this.rangedAttack(target) !== OK) {
            this.rangedMassAttack();
        }
    } else if (ra) {
        result = this.rangedAttack(target);
        if (result !== OK) {
            this.rangedMassAttack();
        }
    } else {
        result = ERR_NO_BODYPART;
    }

    switch (result) {
        case OK: case ERR_BUSY:
            return OK;
        case ERR_NOT_IN_RANGE:
            if (!target) {
                Logger.log(`${this.name} recieved result ERR_NOT_IN_RANGE from Firstaid without an UNDEFINED target.`, LogLevel.FATAL);
                return ERR_INVALID_TARGET;
            }
            return this.travel(target.pos);
        case ERR_NOT_OWNER: case ERR_INVALID_TARGET: case ERR_NO_BODYPART:
            Logger.log(`${this.name} recieved result ${result} from Destroy with args (${target}).`, LogLevel.ERROR);
            return result;
    }
    return OK;
}

Creep.prototype.nMRController = function (target) {
    let result: number;

    if (this.room.name !== target) {
        result = this.travel(new RoomPosition(25,25, target));
    } else {
        var controller = Game.rooms[target].controller;

        if (controller) {
            if (!controller.isSigned()) {
                let text = 'Signs are meant to be signed, right?'
                if (this.signController(controller, text) == ERR_NOT_IN_RANGE) this.travel(controller.pos);
            }

            if (Memory.rooms[this.memory.homeRoom].claim == target) {
                result = this.claimController(controller)
                if (result == ERR_INVALID_TARGET) {
                    result = this.attackController(controller);
                }
            } else if (controller.owner && controller.owner.username !== this.owner.username) {
                result = this.attackController(controller);
            } else {
                result = this.reserveController(controller);
            }
        } else {
            result = ERR_INVALID_TARGET;
        }
    }

    switch (result) {
        case OK: case ERR_BUSY:
            return OK;
        case ERR_NOT_IN_RANGE:
            if (!controller) {
                Logger.log(`${this.name} recieved result ${result} from nMRController with args (${target}), but controller failed to exist.`, LogLevel.ERROR);
                return ERR_INVALID_TARGET;
            }
            return this.travel(controller.pos);
        case ERR_NOT_OWNER: case ERR_INVALID_TARGET: case ERR_FULL: case ERR_NO_BODYPART: case ERR_GCL_NOT_ENOUGH:
            Logger.log(`${this.name} recieved result ${result} from nMRController with args (${target}).`, LogLevel.ERROR);
            return result;
    }
    return OK;
}

Creep.prototype.isBoosted = function () {
    Logger.log(`${this.name} -> isBoosted(). IsBoosted is currently a placeholder.`, LogLevel.ERROR);
    return false;
}

StructureController.prototype.isSigned = function () {
    let sign = this.sign;
    let spawn = Game.spawns[_.keys(Game.spawns)[0]]
    if (!sign || sign.username !== spawn.owner.username) return false;
    return true;
}
