import 'ts-polyfill/lib/es2019-array';
import { Logger } from '../utils/Logger';
import { Role, Task, ProcessPriority, ProcessResult, LogLevel } from '../utils/Enums'
import { moveTo } from 'screeps-cartographer';

declare global {
    interface Creep {
        /**
         * A shorthand to global.cache.creeps[creep.name]. You can use it for quick access the creep’s specific cache data object.
         */
        cache: CreepCache
        travel(pos: RoomPosition): number
        getOffExit(): number
        moveToDefault(pos: RoomPosition): number
        take(target: AnyStoreStructure | Resource | Tombstone, resource: ResourceConstant, quantity?: number): number
        give(target: AnyStoreStructure | Creep, resource: ResourceConstant, quantity?: number): number
        mine(target: Source | Mineral): number
        work(target: Structure | ConstructionSite): number
        praise(target: StructureController): number
        firstaid(target: Creep): number
        destroy(target?: Structure | Creep): number
        nMRController(target: string): number
        isBoosted(): boolean               // Placeholder
        upgradeEnergyConsumptionPerTick(): number
        buildEnergyConsumptionPerTick(): number
        repairEnergyConsumptionPerTick(): number
        dismantleEnergyConsumptionPerTick(): number

    }
}

export default class Creep_Extended extends Creep {
    get cache(): CreepCache {
        return global.Cache.creeps[this.name] = global.Cache.creeps[this.name] || {};
    }
    set cache(value) {
        global.Cache.creeps[this.name] = value;
    }

    travel(pos: RoomPosition): number {
        Logger.log("Creep -> travel()", LogLevel.TRACE)

        let result: number;
        if (pos.roomName === this.room.name) {
            result = moveTo(this, pos, {
                visualizePathStyle: {
                    fill: 'transparent',
                    stroke: '#fff',
                    lineStyle: 'dashed',
                    strokeWidth: .15,
                    opacity: .2
                }
            })
        } else {
            let route = Game.map.findRoute(this.room.name, pos.roomName);
            if (route == ERR_NO_PATH || !route || !route[0]) {
                result = ERR_NO_PATH;
            } else {
                let goto = this.pos.findClosestByRange(route[0].exit);
                if (!goto) {
                    result = ERR_NO_PATH;
                } else {
                    result = (this).moveToDefault(goto);
                }
            }
        }
        this.getOffExit();

        switch (result) {
            case OK: case ERR_BUSY: case ERR_TIRED:
                return OK;
            case ERR_NOT_OWNER: case ERR_INVALID_TARGET: case ERR_NO_PATH: case ERR_NOT_FOUND: case ERR_NO_BODYPART:
                Logger.log(`${this.name} recieved result ${result} from Travel with args (${JSON.stringify(pos)}).`, LogLevel.ERROR);
                return result;
        }

        return OK;
    }

    moveToDefault(pos: RoomPosition): number {
        Logger.log("Creep -> moveToDefault()", LogLevel.TRACE)

        // Visualization for fun, will remove long term.
        return moveTo(this, pos, {
            visualizePathStyle: {
                fill: 'transparent',
                stroke: '#fff',
                lineStyle: 'dashed',
                strokeWidth: .15,
                opacity: .2
            }
        });
    }

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

    take(target: AnyStoreStructure | Resource | Tombstone, resource: ResourceConstant, quantity?: number): number {
        Logger.log("Creep -> take()", LogLevel.TRACE)

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
                Logger.log(`${this.name} recieved result ${result} from Take with args (${JSON.stringify(target.pos)}*, ${resource}, ${quantity}).`, LogLevel.ERROR);
                return result;
        }

        return OK;
    }

    give(target: AnyStoreStructure | Creep, resource: ResourceConstant, quantity?: number): number {
        Logger.log("Creep -> give()", LogLevel.TRACE)

        let result: number = this.transfer(target, resource, quantity);

        switch (result) {
            case OK: case ERR_BUSY:
                return OK;
            case ERR_NOT_IN_RANGE:
                return this.travel(target.pos);
            case ERR_NOT_OWNER: case ERR_INVALID_TARGET: case ERR_INVALID_ARGS: case ERR_NOT_ENOUGH_RESOURCES: case ERR_FULL:
                // Logger.log(`${this.name} recieved result ${result} from Give with args (${JSON.stringify(target.pos)}*, ${resource}, ${quantity}).`, LogLevel.ERROR);
                return result;
        }
        return OK;
    }

    mine(target: Source | Mineral): number {
        Logger.log("Creep -> give()", LogLevel.TRACE)

        let result: number = this.harvest(target);

        switch (result) {
            case OK: case ERR_BUSY: case ERR_TIRED:
                return OK;
            case ERR_NOT_IN_RANGE:
                return this.travel(target.pos);
            case ERR_NOT_OWNER: case ERR_NOT_FOUND: case ERR_NOT_ENOUGH_RESOURCES: case ERR_INVALID_TARGET: case ERR_NO_BODYPART:
                Logger.log(`${this.name} recieved result ${result} from Mine with args (${JSON.stringify(target.pos)}*).`, LogLevel.ERROR);
                return result;
        }
        return OK;
    }

    work(target: Structure | ConstructionSite): number {
        Logger.log("Creep -> work()", LogLevel.TRACE)

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
                Logger.log(`${this.name} recieved result ${result} from Work with args (${target.structureType}${JSON.stringify(target.pos)}*).`, LogLevel.ERROR);
                return result;
        }
        return OK;
    }

    praise(target: StructureController): number {
        Logger.log("Creep -> praise()", LogLevel.TRACE)

        let result: number = this.upgradeController(target);

        if (!target.isSigned()) {
            let text = 'Signs are meant to be signed, right?'
            if (this.signController(target, text) == ERR_NOT_IN_RANGE) this.travel(target.pos);
        }

        switch (result) {
            case OK: case ERR_BUSY:
                return OK;
            case ERR_NOT_IN_RANGE: case ERR_NOT_ENOUGH_ENERGY:
                if (!this.pos.inRangeTo(target, 3)) {
                    return this.travel(target.pos);
                }
                return result;
            case ERR_NOT_OWNER: case ERR_NOT_ENOUGH_RESOURCES: case ERR_INVALID_TARGET: case ERR_NO_BODYPART:
                Logger.log(`${this.name} recieved result ${result} from Praise with args (${target.structureType}${JSON.stringify(target.pos)}*).`, LogLevel.ERROR);
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
                return this.travel(target.pos);
            case ERR_NOT_OWNER: case ERR_INVALID_TARGET: case ERR_NO_BODYPART:
                Logger.log(`${this.name} recieved result ${result} from Firstaid with args (${target.name}${JSON.stringify(target.pos)}*).`, LogLevel.ERROR);
                return result;
        }
        return OK;
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
                return this.travel(target.pos);
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

    nMRController(target: string): number {
        Logger.log("Creep -> nMRController()", LogLevel.TRACE)

        let result: number;

        if (this.room.name !== target) {
            result = this.travel(new RoomPosition(25, 25, target));
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

    isBoosted(): boolean {
        Logger.log("Creep -> isBoosted()", LogLevel.TRACE)
        Logger.log(`${this.name} -> isBoosted(). IsBoosted is currently a placeholder.`, LogLevel.ERROR);
        return false;
    }

    upgradeEnergyConsumptionPerTick(): number {
        return this.getActiveBodyparts(WORK)
    }

    buildEnergyConsumptionPerTick(): number {
        return this.getActiveBodyparts(WORK) * 5
    }

    repairEnergyConsumptionPerTick(): number {
        return this.getActiveBodyparts(WORK)
    }

    dismantleEnergyConsumptionPerTick(): number {
        return this.getActiveBodyparts(WORK) * -0.25
    }
}
