import 'ts-polyfill/lib/es2019-array';
import { Logger } from '../utils/Logger';
import { Role, Task, ProcessPriority, ProcessResult, LogLevel } from '../utils/Enums'
import { moveTo, MoveOpts, MoveTarget } from 'screeps-cartographer';

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
        mine(target: Source | Mineral): number
        /** Non-Civilian pathing defaults */
        moveToDefault(targets: _HasRoomPosition | RoomPosition | MoveTarget | RoomPosition[] | MoveTarget[], opts?: MoveOpts, fallbackOpts?: MoveOpts): number
        nMRController(target: string): number
        praise(target: StructureController): number
        take(target: AnyStoreStructure | Resource | Tombstone, resource: ResourceConstant, quantity?: number): number
        /** Civilian pathing defaults */
        travel(targets: _HasRoomPosition | RoomPosition | MoveTarget | RoomPosition[] | MoveTarget[], opts?: MoveOpts, fallbackOpts?: MoveOpts): number
        work(target: Structure | ConstructionSite): number

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
        Logger.log("Creep -> destroy()", LogLevel.TRACE)

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
                return this.moveToDefault(target.pos);
            case ERR_NOT_OWNER: case ERR_INVALID_TARGET: case ERR_NO_BODYPART:
                if (target && 'fatigue' in target) {
                    Logger.log(`${this.name} recieved result ${result} from Destroy with args (${target.name}${JSON.stringify(target.pos)}*).`, LogLevel.ERROR);
                } else if (target) {
                    Logger.log(`${this.name} recieved result ${result} from Destroy with args (${target?.structureType}${JSON.stringify(target.pos)}*).`, LogLevel.ERROR);
                } else {
                    Logger.log(`${this.name} recieved result ${result} from Destroy with args (${target}).`, LogLevel.ERROR);
                }
                return result;
        }
        return OK;
    }

    firstaid(target: Creep): number {
        Logger.log("Creep -> firstaid()", LogLevel.TRACE)

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
                Logger.log(`${this.name} recieved result ${result} from Firstaid with args (${target.name}${JSON.stringify(target.pos)}*).`, LogLevel.ERROR);
                return result;
        }
        return OK;
    }

    // TODO: Rewrite to use cartographer
    getOffExit(): number {
        Logger.log("Creep -> getOffExit()", LogLevel.TRACE)

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
        Logger.log("Creep -> give()", LogLevel.TRACE)

        this.travel(target.pos);
        let result: number = this.transfer(target, resource, quantity);

        switch (result) {
            case OK: case ERR_BUSY: case ERR_NOT_IN_RANGE:
                return OK;
            case ERR_NOT_OWNER: case ERR_INVALID_TARGET: case ERR_INVALID_ARGS: case ERR_NOT_ENOUGH_RESOURCES: case ERR_FULL:
                // Logger.log(`${this.name} recieved result ${result} from Give with args (${JSON.stringify(target.pos)}*, ${resource}, ${quantity}).`, LogLevel.ERROR);
                return result;
        }
        return OK;
    }

    mine(target: Source | Mineral): number {
        Logger.log("Creep -> give()", LogLevel.TRACE)

        this.travel(target.pos, { avoidCreeps: true });
        let result: number = this.harvest(target);

        switch (result) {
            case OK: case ERR_BUSY: case ERR_TIRED: case ERR_NOT_IN_RANGE:
                return OK;
            case ERR_NOT_OWNER: case ERR_NOT_FOUND: case ERR_NOT_ENOUGH_RESOURCES: case ERR_INVALID_TARGET: case ERR_NO_BODYPART:
                Logger.log(`${this.name} recieved result ${result} from Mine with args (${JSON.stringify(target.pos)}*).`, LogLevel.ERROR);
                return result;
        }
        return OK;
    }

    moveToDefault(targets: _HasRoomPosition | RoomPosition | MoveTarget | RoomPosition[] | MoveTarget[], opts?: MoveOpts, fallbackOpts?: MoveOpts): number {
        Logger.log("Creep -> moveToDefault()", LogLevel.TRACE)
        if (!opts) opts = {}
        if (!fallbackOpts) fallbackOpts = {};

        // Apply provided opts over default opts
        let defaultOpts: MoveOpts = {
            visualizePathStyle: {
                fill: 'transparent',
                stroke: '#fff',
                lineStyle: 'dashed',
                strokeWidth: .15,
                opacity: .2
            },
        };
        opts = Object.assign(defaultOpts, opts)

        let defaultFallbackOpts: MoveOpts = {
            visualizePathStyle: {
                fill: 'transparent',
                stroke: '#f00',
                lineStyle: 'dashed',
                strokeWidth: .15,
                opacity: .2
            },
            avoidCreeps: true,
        };
        fallbackOpts = Object.assign(defaultFallbackOpts, fallbackOpts)

        return moveTo(this, targets, opts, fallbackOpts);
    }

    nMRController(roomName: string): number {
        Logger.log("Creep -> nMRController()", LogLevel.TRACE)

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
                Logger.log(`${this.name} recieved result ${result} from nMRController with args (${roomName}).`, LogLevel.ERROR);
                return result;
        }
        return OK;
    }

    praise(target: StructureController): number {
        Logger.log("Creep -> praise()", LogLevel.TRACE)

        this.travel({ pos: target.pos, range: 3 });
        let result: number = this.upgradeController(target);

        if (!target.isSigned) {
            let text = 'Signs are meant to be signed, right?'
            if (this.signController(target, text) == ERR_NOT_IN_RANGE) this.travel(target.pos);
        }

        switch (result) {
            case OK: case ERR_BUSY: case ERR_NOT_IN_RANGE:
                return OK;
            case ERR_NOT_ENOUGH_ENERGY: case ERR_NOT_OWNER: case ERR_NOT_ENOUGH_RESOURCES: case ERR_INVALID_TARGET: case ERR_NO_BODYPART:
                Logger.log(`${this.name} recieved result ${result} from Praise with args (${target.structureType}${JSON.stringify(target.pos)}*).`, LogLevel.ERROR);
                return result;
        }
        return OK;
    }

    take(target: AnyStoreStructure | Resource | Tombstone, resource: ResourceConstant, quantity?: number): number {
        Logger.log("Creep -> take()", LogLevel.TRACE)

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
                Logger.log(`${this.name} recieved result ${result} from Take with args (${JSON.stringify(target.pos)}*, ${resource}, ${quantity}).`, LogLevel.ERROR);
                return result;
        }

        return OK;
    }

    travel(targets: _HasRoomPosition | RoomPosition | MoveTarget | RoomPosition[] | MoveTarget[], opts?: MoveOpts, fallbackOpts?: MoveOpts): number {
        Logger.log("Creep -> travel()", LogLevel.TRACE)

        // TODO: Add hostile creep avoidance

        // TODO: Add under siege pathing modification

        // TODO: Add Portal Avoidance

        // Apply civilian creep defaults
        let defaultOpts: MoveOpts = {
            avoidSourceKeepers: true,
            visualizePathStyle: {
                fill: 'transparent',
                stroke: '#fff',
                lineStyle: 'dashed',
                strokeWidth: .15,
                opacity: .2
            },
            routeCallback: (roomName: string) => {
                let room = Game.rooms[roomName]
                if (!room || !room.memory || !room.memory.intel) return

                if (room.memory.intel.threatLevel > 0) {
                    return Infinity
                }
                return
            }
        };
        opts = Object.assign(defaultOpts, opts)

        let defaultFallbackOpts: MoveOpts = {
            avoidSourceKeepers: true,
            visualizePathStyle: {
                fill: 'transparent',
                stroke: '#f00',
                lineStyle: 'dashed',
                strokeWidth: .15,
                opacity: .2
            },
            routeCallback: (roomName: string) => {
                let room = Game.rooms[roomName]
                if (!room || !room.memory || !room.memory.intel) return
                if (room.memory.intel.threatLevel > 0) {
                    return Infinity
                }
                return
            }
        };

        fallbackOpts = Object.assign(defaultFallbackOpts, fallbackOpts)

        return this.moveToDefault(targets, opts, fallbackOpts);
    }

    work(target: Structure | ConstructionSite): number {
        Logger.log("Creep -> work()", LogLevel.TRACE)
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
                Logger.log(`${this.name} recieved result ${result} from Work with args (${target.structureType}${JSON.stringify(target.pos)}*).`, LogLevel.ERROR);
                return result;
        }
        return OK;
    }

    private _isBoosted: boolean | undefined;
    isBoosted(): boolean {
        Logger.log("Creep -> isBoosted()", LogLevel.TRACE)
        Logger.log(`${this.name} -> isBoosted(). IsBoosted is currently a placeholder.`, LogLevel.ERROR);
        if (this._isBoosted === undefined) this._isBoosted = false;
        return this._isBoosted;
    }
}
