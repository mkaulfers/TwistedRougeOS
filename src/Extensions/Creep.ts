import { TRACE, ERROR } from 'Constants/LogConstants';
import { MOVE_OPTS_AGENT, MOVE_OPTS_AGENT_FALLBACK, MOVE_OPTS_CIVILIAN, MOVE_OPTS_CIVILIAN_FALLBACK, MOVE_OPTS_DEFAULT, MOVE_OPTS_DEFAULT_FALLBACK } from 'Constants/MoveOptsConstants';
import { moveTo, MoveOpts, MoveTarget } from 'screeps-cartographer';
import { Utils } from 'utils/Index';

declare global {
    interface Creep {
        /**
         * A shorthand to global.cache.creeps[creep.name]. You can use it for quick access the creep’s specific cache data object.
         */
        cache: CreepCache

        // Action Wrappers
        destroy(target?: Structure | Creep): number
        firstaid(target: Creep): number
        getOffExit(): number
        give(target: AnyStoreStructure | Creep, resource: ResourceConstant, quantity?: number): number
        mine(target: Source | Mineral | RoomPosition): number
        /** Non-Civilian pathing defaults */
        moveToDefault(targets: _HasRoomPosition | RoomPosition | MoveTarget | RoomPosition[] | MoveTarget[], opts?: MoveOpts, fallbackOpts?: MoveOpts): number
        nMRController(target: string): number
        praise(target: StructureController, working: boolean): number
        take(target: AnyStoreStructure | Resource | Tombstone, resource: ResourceConstant, quantity?: number): number
        /** Civilian pathing defaults */
        travel(targets: _HasRoomPosition | RoomPosition | MoveTarget | RoomPosition[] | MoveTarget[], opts?: MoveOpts, fallbackOpts?: MoveOpts): number
        work(target: Structure | ConstructionSite): number

        // Body Getters
        /** Returns the creep's body in an array format. */
        bodyArray: BodyPartConstant[]
        /** Counts active body parts of a creep. No provided part type will return full active size. */
        getBodyCount(part?: BodyPartConstant): number
        /** Active ATTACK body part count. */
        attackParts: number
        /** Active CARRY body part count. */
        carryParts: number
        /** Active CLAIM body part count. */
        claimParts: number
        /** Active HEAL body part count. */
        healParts: number
        /** Active MOVE body part count. */
        moveParts: number
        /** Active RANGED_ATTACK body part count. */
        rangedAttackParts: number
        /** Active TOUGH body part count. */
        toughParts: number
        /** Active WORK body part count. */
        workParts: number

        // Other
        isBoosted(): boolean // Placeholder
    }
}

export default class Creep_Extended extends Creep {
    get cache(): CreepCache {
        return global.Cache.creeps[this.name] = global.Cache.creeps[this.name] || {};
    }
    set cache(value) {
        global.Cache.creeps[this.name] = value;
    }

    destroy(target?: Structure | Creep): number {
        Utils.Logger.log("Creep -> destroy()", TRACE)

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
                    Utils.Logger.log(`${this.name} recieved result ERR_NOT_IN_RANGE from Firstaid without an UNDEFINED target.`, ERROR);
                    return ERR_INVALID_TARGET;
                }
                return this.moveToDefault(target.pos);
            case ERR_NOT_OWNER: case ERR_INVALID_TARGET: case ERR_NO_BODYPART:
                if (target && 'fatigue' in target) {
                    Utils.Logger.log(`${this.name} recieved result ${result} from Destroy with args (${target.name}${JSON.stringify(target.pos)}*).`, ERROR);
                } else if (target) {
                    Utils.Logger.log(`${this.name} recieved result ${result} from Destroy with args (${target?.structureType}${JSON.stringify(target.pos)}*).`, ERROR);
                } else {
                    Utils.Logger.log(`${this.name} recieved result ${result} from Destroy with args (${target}).`, ERROR);
                }
                return result;
        }
        return OK;
    }

    firstaid(target: Creep): number {
        Utils.Logger.log("Creep -> firstaid()", TRACE)

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
                return this.moveToDefault(target.pos);
            case ERR_NOT_OWNER: case ERR_INVALID_TARGET: case ERR_NO_BODYPART:
                Utils.Logger.log(`${this.name} recieved result ${result} from Firstaid with args (${target.name}${JSON.stringify(target.pos)}*).`, ERROR);
                return result;
        }
        return OK;
    }

    // TODO: Rewrite to use cartographer
    getOffExit(): number {
        Utils.Logger.log("Creep -> getOffExit()", TRACE)

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

    give(target: AnyStoreStructure | Creep, resource: ResourceConstant, quantity?: number): number {
        Utils.Logger.log("Creep -> give()", TRACE)

        this.travel(target.pos);
        let result = this.transfer(target, resource, quantity);

        switch (result) {
            case OK: case ERR_BUSY: case ERR_NOT_IN_RANGE:
                return OK;
            case ERR_NOT_OWNER: case ERR_INVALID_TARGET: case ERR_INVALID_ARGS: case ERR_NOT_ENOUGH_RESOURCES: case ERR_FULL:
                return result;
        }
        return OK;
    }

    mine(target: Source | Mineral): number {
        Utils.Logger.log("Creep -> give()", TRACE)

        this.travel(target.pos);
        let result: number = this.harvest(target);

        switch (result) {
            case OK: case ERR_BUSY: case ERR_TIRED: case ERR_NOT_IN_RANGE:
                return OK;
            case ERR_NOT_OWNER: case ERR_NOT_FOUND: case ERR_NOT_ENOUGH_RESOURCES: case ERR_INVALID_TARGET: case ERR_NO_BODYPART:
                Utils.Logger.log(`${this.name} recieved result ${result} from Mine with args (${JSON.stringify(target.pos)}*).`, ERROR);
                return result;
        }
        return OK;
    }

    moveToDefault(targets: _HasRoomPosition | RoomPosition | MoveTarget | RoomPosition[] | MoveTarget[], opts?: MoveOpts, fallbackOpts?: MoveOpts): number {
        Utils.Logger.log("Creep -> moveToDefault()", TRACE)
        if (!opts) opts = {}
        if (!fallbackOpts) fallbackOpts = {};

        // Apply provided opts over default opts
        opts = {
            ...MOVE_OPTS_AGENT,
            ...opts,
        }

        fallbackOpts = {
            ...MOVE_OPTS_AGENT_FALLBACK,
            ...opts,
        }

        return moveTo(this, targets, opts, fallbackOpts);
    }

    nMRController(roomName: string): number {
        Utils.Logger.log("Creep -> nMRController()", TRACE)

        let result: number = OK;

        if (this.room.name == roomName) {
            let controller: StructureController | undefined = undefined;
            controller = Game.rooms[roomName].controller;
            if (controller) {
                this.travel({ pos: controller.pos, range: 3 });
                if (!controller.isSigned) {
                    let text = 'Signs are meant to be signed, right?'
                    if (this.signController(controller, text) == ERR_NOT_IN_RANGE) this.travel({ pos: controller.pos, range: 1 });
                }

                if (Memory.rooms[this.memory.homeRoom].claim == roomName) {
                    result = this.claimController(controller)
                    if (result == ERR_INVALID_TARGET) {
                        result = this.attackController(controller);
                    }
                } else if ((controller.owner && controller.owner.username !== this.owner.username) ||
                    controller.reservation && controller.reservation.username !== this.owner.username) {
                    result = this.attackController(controller);
                } else {
                    result = this.reserveController(controller);
                }
            } else {
                result = ERR_INVALID_TARGET;
            }
        } else {
            this.travel({ pos: new RoomPosition(25, 25, roomName), range: 20 });
        }

        switch (result) {
            case OK: case ERR_BUSY: case ERR_NOT_IN_RANGE:
                return OK;
            case ERR_NOT_OWNER: case ERR_INVALID_TARGET: case ERR_FULL: case ERR_NO_BODYPART: case ERR_GCL_NOT_ENOUGH:
                Utils.Logger.log(`${this.name} recieved result ${result} from nMRController with args (${roomName}).`, ERROR);
                return result;
        }
        return OK;
    }

    praise(target: StructureController, working: boolean): number {
        Utils.Logger.log("Creep -> praise()", TRACE)

        // Link targeting
        if (!this.cache.supply && Game.time % 50 === 0) {
            let foundLink: StructureLink | undefined = target.pos.findInRange(target.room.links, 3)[0];
            if (foundLink) this.cache.supply = foundLink.id;
        }
        let link = this.cache.supply ? Game.getObjectById(this.cache.supply) : undefined;

        if ((!working ||
            this.store.getUsedCapacity(RESOURCE_ENERGY) < (this.store.getCapacity(RESOURCE_ENERGY) * 0.2)) &&
            link &&
            link.store.getUsedCapacity(RESOURCE_ENERGY) > 0) this.take(link, RESOURCE_ENERGY);

        this.travel({ pos: link ? link.pos : target.pos, range: link ? 1 : 2 });
        let result: number = this.upgradeController(target);

        if (!target.isSigned) {
            let text = 'Signs are meant to be signed, right?'
            if (this.signController(target, text) == ERR_NOT_IN_RANGE) this.travel(target.pos);
        }

        switch (result) {
            case OK: case ERR_BUSY: case ERR_NOT_IN_RANGE:
                return OK;
            case ERR_NOT_ENOUGH_ENERGY: case ERR_NOT_OWNER: case ERR_NOT_ENOUGH_RESOURCES: case ERR_INVALID_TARGET: case ERR_NO_BODYPART:
                Utils.Logger.log(`${this.name} recieved result ${result} from Praise with args (${target.structureType}${JSON.stringify(target.pos)}*).`, ERROR);
                return result;
        }
        return OK;
    }

    take(target: AnyStoreStructure | Resource | Tombstone, resource: ResourceConstant, quantity?: number): number {
        Utils.Logger.log("Creep -> take()", TRACE)

        this.travel(target.pos);
        let result: number;
        if ('store' in target) {
            result = this.withdraw(target, resource, quantity);
        } else {
            result = this.pickup(target);
        }

        switch (result) {
            case OK: case ERR_BUSY: case ERR_NOT_IN_RANGE:
                return OK;
            case ERR_NOT_OWNER: case ERR_INVALID_TARGET: case ERR_INVALID_ARGS: case ERR_NOT_ENOUGH_RESOURCES: case ERR_FULL:
                Utils.Logger.log(`${this.name} recieved result ${result} from Take with args (${JSON.stringify(target.pos)}*, ${resource}, ${quantity}).`, ERROR);
                return result;
        }

        return OK;
    }

    travel(targets: _HasRoomPosition | RoomPosition | MoveTarget | RoomPosition[] | MoveTarget[], opts?: MoveOpts, fallbackOpts?: MoveOpts): number {
        Utils.Logger.log("Creep -> travel()", TRACE)

        // TODO: Add hostile creep avoidance

        // TODO: Add under siege pathing modification

        // TODO: Add Portal Avoidance

        // Apply civilian creep defaults
        opts = {
            ...MOVE_OPTS_CIVILIAN,
            ...opts,
        }

        fallbackOpts = {
            ...MOVE_OPTS_CIVILIAN_FALLBACK,
            ...opts,
        }

        return moveTo(this, targets, opts, fallbackOpts);
    }

    work(target: Structure | ConstructionSite): number {
        Utils.Logger.log("Creep -> work()", TRACE)
        if (!target) return ERR_INVALID_TARGET;

        this.travel({ pos: target.pos, range: 3 });
        let result: number;
        if ('remove' in target) {
            result = this.build(target);
        } else {
            result = this.repair(target);
        }

        switch (result) {
            case OK: case ERR_BUSY: case ERR_NOT_IN_RANGE:
                return OK;
            case ERR_NOT_OWNER: case ERR_NOT_ENOUGH_RESOURCES: case ERR_INVALID_TARGET: case ERR_NO_BODYPART:
                Utils.Logger.log(`${this.name} recieved result ${result} from Work with args (${target.structureType}${JSON.stringify(target.pos)}*).`, ERROR);
                return result;
        }
        return OK;
    }

    private _bodyArray: BodyPartConstant[] | undefined;
    get bodyArray() {
        if (!this._bodyArray) {
            this._bodyArray = [];
            for (const partInfo of this.body) this._bodyArray.push(partInfo.type);
        }
        return this._bodyArray;
    }

    private _bodyCount: {[key in BodyPartConstant | 'all']: number} | undefined;
    getBodyCount(part?: BodyPartConstant): number {
        if (!this._bodyCount) {
            // Build base _bodyCount
            let temp: {[key in BodyPartConstant | 'all']?: number} = { 'all': 0 };
            for (const part of BODYPARTS_ALL) temp[part] = 0;
            // TODO: Use typeguards to remove typecast.
            this._bodyCount = temp as {[key in BodyPartConstant | 'all']: number};

            // Add active body parts to count.
            for (const part of this.body) {
                if (part.hits > 0) this._bodyCount[part.type] += 1;
            }
        }

        // Handle returns
        if (part) return this._bodyCount[part];
        return this._bodyCount['all'];
    }

    get attackParts() {
        return this.getBodyCount(ATTACK);
    }

    get carryParts() {
        return this.getBodyCount(CARRY);
    }

    get claimParts() {
        return this.getBodyCount(CLAIM);
    }

    get healParts() {
        return this.getBodyCount(HEAL);
    }

    get moveParts() {
        return this.getBodyCount(MOVE);
    }

    get rangedAttackParts() {
        return this.getBodyCount(RANGED_ATTACK);
    }

    get toughParts() {
        return this.getBodyCount(TOUGH);
    }

    get workParts() {
        return this.getBodyCount(WORK);
    }

    private _isBoosted: boolean | undefined;
    isBoosted(): boolean {
        Utils.Logger.log("Creep -> isBoosted()", TRACE)
        Utils.Logger.log(`${this.name} -> isBoosted(). IsBoosted is currently a placeholder.`, ERROR);
        if (this._isBoosted === undefined) this._isBoosted = false;
        return this._isBoosted;
    }
}
