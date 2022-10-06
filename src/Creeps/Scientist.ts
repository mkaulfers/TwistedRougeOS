import CreepRole from "Models/CreepRole";
import { Process } from "Models/Process";
import { Utils } from "utils/Index";
import { Role, Task, ProcessPriority, ProcessResult, LogLevel } from '../utils/Enums'

export class Scientist extends CreepRole {

    readonly baseBody = [CARRY, MOVE, WORK, WORK]
    readonly segment = [CARRY, WORK, WORK]

    dispatch(room: Room) {
        let scientists = room.localCreeps.scientist
        for (let scientist of scientists) {
            if (!scientist.memory.task) {
                global.scheduler.swapProcess(scientist, Task.SCIENTIST_UPGRADING)
            }
        }
    }

    quantityWanted(room: Room, rolesNeeded: Role[], min?: boolean): number {
        Utils.Logger.log("quantityWanted -> scientist.quantityWanted()", LogLevel.TRACE)
        let controller = room.controller
        if (!controller) return 0
        let sciCount = rolesNeeded.filter(x => x == Role.SCIENTIST).length
        if (min && min == true) return 0;

        let energyIncome = room.energyIncome == 0 ? room.sources.length * 10 : room.energyIncome;
        if (!this.partLimits || this.partLimits.length == 0) this.partLimits = Utils.Utility.buildPartLimits(this.baseBody, this.segment);
        if (!this[room.spawnEnergyLimit]) this[room.spawnEnergyLimit] = Utils.Utility.getBodyFor(room, this.baseBody, this.segment, this.partLimits);
        let bodyWorkCount = this[room.spawnEnergyLimit].filter(p => p == WORK).length;

        let shouldBe = Math.ceil((room.controller!.level == 8 ? 15 : energyIncome / 2) / bodyWorkCount);
        if (room.storage && room.storage.store.energy > 500000 && room.controller!.level !== 8) shouldBe = Math.ceil(energyIncome * 2) / bodyWorkCount;
        return sciCount < shouldBe ? shouldBe - sciCount : 0;
    }

    preSpawnBy(room: Room, spawn: StructureSpawn, creep?: Creep): number {
        if (!room || !spawn || !room.controller) return 0;
        // return path dist to controller
        return room.findPath(spawn.pos, room.controller.pos, { range: 3 }).length;
    }

    readonly tasks: { [key in Task]?: (creep: Creep) => void } = {
        scientist_upgrading: function(creep: Creep) {
            let creepId = creep.id

            const upgradingTask = () => {
                Utils.Logger.log("CreepTask -> upgradingTask()", LogLevel.TRACE);

                let creep = Game.getObjectById(creepId);
                if (!creep) {
                    Utils.Logger.log(creepId, LogLevel.FATAL);
                    return ProcessResult.FAILED;
                }

                // Switches working value if full or empty
                if (creep.memory.working == undefined) creep.memory.working = false;
                if ((creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0 && creep.memory.working == true) ||
                    (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0 && creep.memory.working == false)) {
                    creep.memory.working = !creep.memory.working;
                }
                const working = creep.memory.working;

                // Controller targeting
                if (!Game.rooms[creep.memory.homeRoom]) return ProcessResult.FAILED;
                let controller = Game.rooms[creep.memory.homeRoom].controller;
                if (!controller) return ProcessResult.FAILED;

                let result: number | undefined;
                if (!working) {
                    // Link targeting
                    if (!creep.cache.supply && Game.time % 50 === 0) {
                        let foundLink: StructureLink | undefined = controller.pos.findInRange(controller.room.links, 3)[0];
                        if (foundLink) creep.cache.supply = foundLink.id;
                    }
                    let link = creep.cache.supply ? Game.getObjectById(creep.cache.supply) : undefined;
                    if (link && link.store.getUsedCapacity(RESOURCE_ENERGY) > 0) result = creep.take(link, RESOURCE_ENERGY);
                    else result = OK;
                } else {
                    result = creep.praise(controller);
                }

                if (result === OK || result === ERR_NOT_ENOUGH_ENERGY) {
                    return ProcessResult.RUNNING;
                }
                Utils.Logger.log(`${creep.name} generated error code ${result} while attempting to praise ${controller.structureType}${JSON.stringify(controller.pos)}.`, LogLevel.ERROR);
                return ProcessResult.INCOMPLETE;
            }

            creep.memory.task = Task.SCIENTIST_UPGRADING
            let newProcess = new Process(creep.name, ProcessPriority.LOW, upgradingTask)
            global.scheduler.addProcess(newProcess)
        }
    }
}
