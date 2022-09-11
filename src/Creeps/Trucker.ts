import { Process } from "Models/Process";
import { Utils } from "utils/Index"
import { Role, Task, ProcessPriority, ProcessResult, LogLevel } from '../utils/Enums'

export class Trucker extends Creep {

    static baseBody = [CARRY, CARRY, CARRY, MOVE, MOVE, MOVE]
    static segment = [MOVE, CARRY, CARRY]
    static carryModifier = 3.0

    static truckerStorage(creep: Creep) {
        let creepId = creep.id

        const truckerHarvesterTask = () => {
            Utils.Logger.log("CreepTask -> truckerHarvesterTask()", LogLevel.TRACE)
            let creep = Game.getObjectById(creepId);
            if (!creep) return ProcessResult.FAILED;

            // Switches working value if full or empty
            if (creep.memory.working == undefined) creep.memory.working = false;
            if ((creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0 && creep.memory.working == true) ||
            (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0 && creep.memory.working == false)) {
                creep.memory.working = !creep.memory.working;
                delete creep.memory.target;
            }
            const working = creep.memory.working;

            if (working) {
                // Determines new target
                if (!creep.memory.target || (creep.memory.target && !Game.getObjectById(creep.memory.target))) {
                    let potentialTargets: Structure[] = creep.room.find(FIND_MY_STRUCTURES, {filter: function(s) {
                        // Limits find to the below structureTypes
                        switch (s.structureType) {
                            case STRUCTURE_TOWER:
                            case STRUCTURE_SPAWN:
                            case STRUCTURE_POWER_SPAWN:
                            case STRUCTURE_EXTENSION:
                                // Returns only targets with room for energy
                                if (s.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                                    return s;
                                } else {
                                    return;
                                }
                        }
                        return;
                    }});

                    // Targets closest, or storage, or terminal, in that order.
                    let potTarget = creep.pos.findClosestByRange(potentialTargets);
                    if (potTarget) {
                        creep.memory.target = potTarget.id;
                    } else if (creep.room.storage) {
                        creep.memory.target = creep.room.storage.id;
                    } else if (creep.room.terminal) {
                        creep.memory.target = creep.room.terminal.id;
                    } else {
                        return ProcessResult.RUNNING
                    }
                }
                let target = Game.getObjectById(creep.memory.target);

                if (!target ||
                    'store' in target && target.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
                    delete creep.memory.target;
                    return ProcessResult.RUNNING;
                }

                // Runs give and returns running or incomplete based on return value
                var result = creep.give(target, RESOURCE_ENERGY);
                if (result === OK) {
                    return ProcessResult.RUNNING
                }
                Utils.Logger.log(`${creep.name} generated error code ${result} while transferring.`, LogLevel.ERROR)
                return ProcessResult.INCOMPLETE
            } else {
                // Determines new target
                if (!creep.memory.target || (creep.memory.target && !Game.getObjectById(creep.memory.target))) {
                    let potentialTargets: (AnyStoreStructure | Resource | Tombstone | Ruin)[] = [];
                    // Finds structures, tombstones, and dropped resources
                    potentialTargets = Array.prototype.concat(
                        creep.room.find(FIND_STRUCTURES),
                        creep.room.find(FIND_TOMBSTONES),
                        creep.room.find(FIND_DROPPED_RESOURCES),
                        creep.room.find(FIND_RUINS));
                    // Limits potential targets to only ones with energy, and if a structure, only structures that are containers or links.
                    potentialTargets = Utils.Utility.organizeTargets(potentialTargets, {resource: RESOURCE_ENERGY, structures: [STRUCTURE_CONTAINER, STRUCTURE_LINK]})
                    let potTarget = creep.pos.findClosestByRange(potentialTargets);

                    // Targets closest if closest will fill or most energy target, in that order
                    if ((potTarget && 'store' in potTarget && potTarget.store.getFreeCapacity()! > creep.store.getFreeCapacity()) ||
                        (potTarget && 'amount' in potTarget && potTarget.amount > creep.store.getFreeCapacity())) {
                        creep.memory.target = potTarget.id;
                    } else if (potentialTargets.length > 0) {
                        creep.memory.target = potentialTargets[0].id;
                    } else {
                        return ProcessResult.RUNNING
                    }
                }
                let target = Game.getObjectById(creep.memory.target);

                // Posterior check to change targets if the target can no longer fill the creep
                if (!target ||
                    'store' in target && target.store.energy < 25 ||
                    'amount' in target && target.amount < 25) {
                    delete creep.memory.target;
                    return ProcessResult.RUNNING;
                }

                // Runs take and returns running or incomplete on result
                result = creep.take(target, RESOURCE_ENERGY);
                if (result === OK) {
                    return ProcessResult.RUNNING
                }
                Utils.Logger.log(`${creep.name} generated error code ${result} while withdrawing / picking up.`, LogLevel.ERROR)
                return ProcessResult.INCOMPLETE
            }
        }

        creep.memory.task = Task.TRUCKER_STORAGE
        let newProcess = new Process(creep.name, ProcessPriority.LOW, truckerHarvesterTask)
        global.scheduler.addProcess(newProcess)
    }

    static truckerScientist(creep: Creep) {
        let creepId = creep.id;

        const truckerScientistTask = () => {
            Utils.Logger.log("CreepTask -> truckerScientistTask()", LogLevel.TRACE);
            let creep = Game.getObjectById(creepId);
            if (!creep) return ProcessResult.FAILED;

            // Switches working value if full or empty
            if (creep.memory.working == undefined) creep.memory.working = false;
            if ((creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0 && creep.memory.working == true) ||
            (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0 && creep.memory.working == false)) {
                creep.memory.working = !creep.memory.working;
                delete creep.memory.target;
            }
            const working = creep.memory.working;

            if (working) {
                // Determines new target
                if (!creep.memory.target || (creep.memory.target && !Game.getObjectById(creep.memory.target))) {
                    // Targets scientists, sorted by how much energy they have in them
                    let potentialTargets: Creep[] = creep.room.localCreeps.scientists;
                    potentialTargets = Utils.Utility.organizeTargets(potentialTargets, {resource: RESOURCE_ENERGY, order: 'asc', rNeed: true});
                    let potTarget = creep.pos.findClosestByRange(potentialTargets);

                    // Targets closest if scientist will take > 25 energy, or most empty scientist, in that order
                    if (potTarget && potTarget.store.getFreeCapacity() > 25) {
                        creep.memory.target = potTarget.id;
                    } else if (potentialTargets.length > 0 && potentialTargets[0].store.getFreeCapacity() > 25) {
                        creep.memory.target = potentialTargets[0].id;
                    } else if (creep.room.storage) {
                        creep.memory.target = creep.room.storage.id;
                    } else {
                        return ProcessResult.RUNNING
                    }
                }
                let target = Game.getObjectById(creep.memory.target);

                // Posterior check to change targets if the target can no longer take the creeps energy
                if (!target ||
                    'store' in target && target.store.getFreeCapacity() < 15) {
                    delete creep.memory.target;
                    return ProcessResult.RUNNING;
                }

                // Runs give and returns running or incomplete based on result
                var result = creep.give(target, RESOURCE_ENERGY);
                if (result === OK) {
                    return ProcessResult.RUNNING
                }
                Utils.Logger.log(`${creep.name} generated error code ${result} while transferring.`, LogLevel.ERROR)
                return ProcessResult.INCOMPLETE
            } else {
                // Determines new target
                if (!creep.memory.target || (creep.memory.target && !Game.getObjectById(creep.memory.target))) {
                    let potentialTargets: (AnyStoreStructure | Resource | Tombstone | Ruin)[] = [];
                    // Finds structures, tombstones, and dropped resources
                    let nearbyInterests = Array.prototype.concat(
                        creep.room.find(FIND_DROPPED_RESOURCES),
                        creep.room.find(FIND_TOMBSTONES),
                        creep.room.find(FIND_STRUCTURES),
                        creep.room.find(FIND_RUINS));
                    // Limits potential targets to only ones with energy, and if a structure, only structures that are containers or links.
                    nearbyInterests = Utils.Utility.organizeTargets(nearbyInterests, { resource: RESOURCE_ENERGY, structures: [STRUCTURE_CONTAINER, STRUCTURE_LINK]})

                    potentialTargets.push(...nearbyInterests);
                    let priorityTargets = potentialTargets.filter(function(t) {
                        (('store' in t && t.store.energy > creep!.store.getFreeCapacity()) || ('resourceType' in t && t.amount > creep!.store.getFreeCapacity()))
                    });

                    // Targets the biggest target if it will fill the creep, or the closest target if no targets will completely fill the creep,
                    // or the first target if closest couldn't be determined, or storage, in that order.
                    if (priorityTargets.length > 0) {
                        creep.memory.target = priorityTargets[0].id;
                    } else if (potentialTargets.length > 0) {
                        let pTarget = creep.pos.findClosestByRange(potentialTargets)
                        if (pTarget) {
                            creep.memory.target = pTarget.id;
                        } else {
                            creep.memory.target = potentialTargets[0].id;
                        }
                    } else if (creep.room.storage) {
                        creep.memory.target = creep.room.storage.id;
                    } else {
                        return ProcessResult.RUNNING
                    }
                }
                let target = Game.getObjectById(creep.memory.target);

                // Posterior check to change targets if the target is of very low energy value
                if (!target ||
                    'store' in target && target.store.energy < 25 ||
                    'amount' in target && target.amount < 25) {
                    delete creep.memory.target;
                    ProcessResult.RUNNING;
                }

                // Runs take and returns running or incomplete based on the result.
                result = creep.take(target, RESOURCE_ENERGY);
                if (result === OK) {
                    return ProcessResult.RUNNING
                }
                Utils.Logger.log(`${creep.name} generated error code ${result} while withdrawing / picking up.`, LogLevel.ERROR)
                return ProcessResult.INCOMPLETE

            }
        }

        creep.memory.task = Task.TRUCKER_SCIENTIST
        let newProcess = new Process(creep.name, ProcessPriority.LOW, truckerScientistTask)
        global.scheduler.addProcess(newProcess)
    }

    static dispatch(room: Room) {
        let turrets = room.find(FIND_MY_STRUCTURES, { filter: { structureType: STRUCTURE_TOWER }});
        turrets = turrets.filter((t) => { return ( 'store' in t && t.store.getFreeCapacity(RESOURCE_ENERGY) > 0)})
        if (room.energyAvailable < room.energyCapacityAvailable || turrets.length > 0) {
            let truckers = room.localCreeps.truckers
            Utils.Logger.log(`dispatchStorageTruckers`, LogLevel.TRACE)
            for (let trucker of truckers) {
                if (!trucker.memory.task || trucker.memory.task == Task.TRUCKER_SCIENTIST) {
                    Utils.Logger.log(`dispatchStorageTruckers`, LogLevel.TRACE)
                    global.scheduler.swapProcess(trucker, Task.TRUCKER_STORAGE)
                }
            }
        } else {
            let truckers = room.localCreeps.truckers
            if (!(truckers.length > 0)) return;
            Utils.Logger.log(`dispatchScientistTruckers`, LogLevel.TRACE)

            for (let trucker of truckers) {
                if (!trucker.memory.task || trucker.memory.task == Task.TRUCKER_STORAGE) {
                    Utils.Logger.log(`dispatchScientistTruckers`, LogLevel.TRACE)
                    global.scheduler.swapProcess(trucker, Task.TRUCKER_SCIENTIST)
                }
            }

            if (truckers.filter(trucker => trucker.memory.task == Task.TRUCKER_SCIENTIST).length < 1) {
                    truckers[0].memory.task = undefined
            }
        }
    }

    static quantityWanted(room: Room, rolesNeeded: Role[], min?: boolean): number {
        if (rolesNeeded.filter(x => x == Role.HARVESTER).length < 1) return 0;
        let truckerCount = rolesNeeded.filter(x => x == Role.TRUCKER).length
        if (min && min == true) return truckerCount < 1 ? 1 : 0;

        Utils.Logger.log(`Trucker Carry Capacity: ${room.truckersCarryCapacity()}`, LogLevel.INFO)
        Utils.Logger.log(`Demand to Meet: ${room.sources.length * 10 * (room.averageDistanceFromSourcesToStructures() * this.carryModifier)}`, LogLevel.INFO)
        let shouldBe = Math.ceil((room.sources.length * 10 * room.averageDistanceFromSourcesToStructures() * this.carryModifier) / (Utils.Utility.getBodyFor(room, this.baseBody, this.segment).filter(p => p == CARRY).length * 50));
        return truckerCount < shouldBe ? shouldBe - truckerCount : 0;
    }
}
