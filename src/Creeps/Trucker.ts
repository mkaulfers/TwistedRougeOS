import { TRACE, TRUCKER_SCIENTIST, TRUCKER_STORAGE, Role, HARVESTER, TRUCKER, INFO, ERROR, Task, FATAL, RUNNING, INCOMPLETE, LOW } from "Constants"
import CreepRole from "Models/CreepRole"
import { Process } from "Models/Process"
import { Utils } from "utils/Index"
export class Trucker extends CreepRole {

    readonly baseBody = [CARRY, CARRY, CARRY, MOVE, MOVE, MOVE]
    readonly segment = [MOVE, CARRY, CARRY]
    readonly carryModifier = 3.0

    dispatch(room: Room) {
        let consider = [...room.towers, ...room.labs, ...room.containers];
        consider = consider.filter((t) => {
            if ((t.structureType == STRUCTURE_TOWER || t.structureType == STRUCTURE_LAB)) return ('my' in t && t.my && 'store' in t && t.store.getFreeCapacity(RESOURCE_ENERGY) > 100)
            // Add FF containers to consideration for trucker storage
            if (t.structureType === STRUCTURE_CONTAINER && room.ffContainers.includes(t)) return (t.store.getFreeCapacity(RESOURCE_ENERGY) > 0)
            return false;
        });
        if (room.energyAvailable < room.energyCapacityAvailable || consider.length > 0) {
            let truckers = room.localCreeps.trucker
            Utils.Logger.log(`dispatchStorageTruckers`, TRACE)
            for (let trucker of truckers) {
                if (!trucker.memory.task || trucker.memory.task == TRUCKER_SCIENTIST) {
                    Utils.Logger.log(`dispatchStorageTruckers`, TRACE)
                    global.scheduler.swapProcess(trucker, TRUCKER_STORAGE)
                }
            }
        } else {
            let truckers = room.localCreeps.trucker
            if (!(truckers.length > 0)) return;
            Utils.Logger.log(`dispatchScientistTruckers`, TRACE)

            for (let trucker of truckers) {
                if (!trucker.memory.task || trucker.memory.task == TRUCKER_STORAGE) {
                    Utils.Logger.log(`dispatchScientistTruckers`, TRACE)
                    global.scheduler.swapProcess(trucker, TRUCKER_SCIENTIST)
                }
            }

            if (truckers.filter(trucker => trucker.memory.task == TRUCKER_SCIENTIST).length < 1) {
                truckers[0].memory.task = undefined
            }
        }
    }

    quantityWanted(room: Room, rolesNeeded: Role[], min?: boolean): number {
        let harCount = rolesNeeded.filter(x => x == HARVESTER).length
        if (harCount < 1) return 0;
        let truckerCount = rolesNeeded.filter(x => x == TRUCKER).length
        if (min && min == true) return truckerCount < harCount ? harCount - truckerCount : 0;

        // Utils.Logger.log(`Trucker Carry Capacity: ${room.truckersCarryCapacity()}`, INFO)  TODO: Remove dead function
        Utils.Logger.log(`Demand to Meet: ${room.sources.length * 10 * (room.averageDistanceFromSourcesToStructures * this.carryModifier)}`, INFO)
        if (!this.partLimits || this.partLimits.length == 0) this.partLimits = Utils.Utility.buildPartLimits(this.baseBody, this.segment);
        if (!this[room.spawnEnergyLimit]) this[room.spawnEnergyLimit] = Utils.Utility.getBodyFor(room, this.baseBody, this.segment, this.partLimits);
        let body = this[room.spawnEnergyLimit];
        let carryCount = body.filter(p => p == CARRY).length
        if (carryCount === 0 || !carryCount) Utils.Logger.log(`Carry Count for truckers was ${carryCount}! This is a failure mode!`, ERROR);
        let shouldBe = Math.ceil((room.sources.length * 10 * room.averageDistanceFromSourcesToStructures * this.carryModifier) / (carryCount * 50));
        if (room.storage && room.storage.store.energy > 500000 && shouldBe < 3) shouldBe = 3;
        if (shouldBe < 2) shouldBe = 2;
        return truckerCount < shouldBe ? shouldBe - truckerCount : 0;
    }

    preSpawnBy(room: Room, spawn: StructureSpawn, creep?: Creep): number {
        if (!room || !spawn || !room.controller) return 0;
        // return avg path dist
        return room.averageDistanceFromSourcesToStructures;
    }

    readonly tasks: { [key in Task]?: (creep: Creep) => void } = {
        trucker_storage: function(creep: Creep) {
            let creepId = creep.id

            const truckerHarvesterTask = () => {
                Utils.Logger.log("CreepTask -> truckerHarvesterTask()", TRACE)
                let creep = Game.getObjectById(creepId);
                if (!creep) return FATAL;
                if (creep.spawning) return RUNNING;

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
                        Trucker.storageTruckerWorkingTargeting(creep);
                        if (!creep.memory.target) return RUNNING;
                    }
                    let target = Game.getObjectById(creep.memory.target);

                    if (!target ||
                        'store' in target && target.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
                        delete creep.memory.target;
                        return RUNNING;
                    }

                    // Runs give and returns running or incomplete based on return value
                    var result = creep.give(target, RESOURCE_ENERGY);
                    if (result === OK) {
                        if (creep.store.energy > 0 && creep.pos.getRangeTo(target) == 1 || target.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
                            Trucker.storageTruckerWorkingTargeting(creep);
                            let newTarget = Game.getObjectById(creep.memory.target);
                            if (target.id !== creep.memory.target && newTarget && creep.pos.getRangeTo(newTarget) > 1) creep.travel(newTarget);
                        }
                        return RUNNING
                    }
                    Utils.Logger.log(`${creep.name} generated error code ${result} while transferring.`, ERROR)
                    return INCOMPLETE
                } else {
                    // Determines new target
                    if (!creep.memory.target || (creep.memory.target && !Game.getObjectById(creep.memory.target))) {
                        Trucker.needEnergyTargeting(creep);
                        if (!creep.memory.target) return RUNNING
                    }
                    let target = Game.getObjectById(creep.memory.target);

                    // Posterior check to change targets if the target can no longer fill the creep
                    if (!target ||
                        'store' in target && target.store.energy < 25 ||
                        'amount' in target && target.amount < 25) {
                        delete creep.memory.target;
                        return RUNNING;
                    }

                    // Runs take and returns running or incomplete on result
                    result = creep.take(target, RESOURCE_ENERGY);
                    if (result === OK) {
                        return RUNNING
                    }
                    Utils.Logger.log(`${creep.name} generated error code ${result} while withdrawing / picking up.`, ERROR)
                    return INCOMPLETE
                }
            }

            creep.memory.task = TRUCKER_STORAGE
            let newProcess = new Process(creep.name, LOW, truckerHarvesterTask)
            global.scheduler.addProcess(newProcess)
        },
        trucker_scientist: function(creep: Creep) {
            let creepId = creep.id;

            const truckerScientistTask = () => {
                Utils.Logger.log("CreepTask -> truckerScientistTask()", TRACE);
                let creep = Game.getObjectById(creepId);
                if (!creep) return FATAL;
                if (creep.spawning) return RUNNING;

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
                        const controllerLink = creep.room.localCreeps.scientist[0] && creep.room.localCreeps.scientist[0].cache.supply ? Game.getObjectById(creep.room.localCreeps.scientist[0].cache.supply) : undefined;
                        let potentialTargets: Creep[] = controllerLink && controllerLink.store.getUsedCapacity(RESOURCE_ENERGY) > 0 ? [...creep.room.localCreeps.engineer] : [...creep.room.localCreeps.scientist, ...creep.room.localCreeps.engineer];
                        potentialTargets = Utils.Utility.organizeTargets(RESOURCE_ENERGY, potentialTargets, { order: 'asc', needs: true });
                        let potTarget = creep.pos.findClosestByRange(potentialTargets);

                        // Targets closest if scientist will take > 25 energy, or most empty scientist, in that order
                        if (potTarget && potTarget.store.getFreeCapacity() > 25) {
                            creep.memory.target = potTarget.id;
                        } else if (potentialTargets.length > 0 && potentialTargets[0].store.getFreeCapacity() > 25) {
                            creep.memory.target = potentialTargets[0].id;
                        } else if (creep.room.storage) {
                            creep.memory.target = creep.room.storage.id;
                        } else {
                            return RUNNING
                        }
                    }
                    let target = Game.getObjectById(creep.memory.target);

                    // Posterior check to change targets if the target can no longer take the creeps energy
                    if (!target ||
                        'store' in target && target.store.getFreeCapacity() < 15) {
                        delete creep.memory.target;
                        return RUNNING;
                    }

                    // Runs give and returns running or incomplete based on result
                    var result = creep.give(target, RESOURCE_ENERGY);
                    if (result === OK) {
                        return RUNNING
                    }
                    Utils.Logger.log(`${creep.name} generated error code ${result} while transferring.`, ERROR)
                    return INCOMPLETE
                } else {
                    // Determines new target
                    if (!creep.memory.target || (creep.memory.target && !Game.getObjectById(creep.memory.target))) {
                        Trucker.needEnergyTargeting(creep);
                        return RUNNING
                    }
                    let target = Game.getObjectById(creep.memory.target);

                    // Posterior check to change targets if the target is of very low energy value
                    if (!target ||
                        'store' in target && target.store.energy < 25 ||
                        'amount' in target && target.amount < 25) {
                        delete creep.memory.target;
                        RUNNING;
                    }

                    // Runs take and returns running or incomplete based on the result.
                    result = creep.take(target, RESOURCE_ENERGY);
                    if (result === OK) {
                        return RUNNING
                    }
                    Utils.Logger.log(`${creep.name} generated error code ${result} while withdrawing / picking up.`, ERROR)
                    return INCOMPLETE

                }
            }

            creep.memory.task = TRUCKER_SCIENTIST
            let newProcess = new Process(creep.name, LOW, truckerScientistTask)
            global.scheduler.addProcess(newProcess)
        }
    }

    static storageTruckerWorkingTargeting(creep: Creep) {
        let oldTarget: Structure | undefined = undefined;
        if (creep.memory.target) oldTarget = Game.getObjectById(creep.memory.target);
        let potentialTargets: Structure[] = Game.rooms[creep.memory.homeRoom].find(FIND_STRUCTURES, {
            filter: function (s) {
                // Limits find to the below structureTypes
                switch (s.structureType) {
                    case STRUCTURE_TOWER:
                    case STRUCTURE_SPAWN:
                    case STRUCTURE_POWER_SPAWN:
                    case STRUCTURE_EXTENSION:
                    case STRUCTURE_LAB:
                        // Returns only targets with room for energy
                        if (s.store.getFreeCapacity(RESOURCE_ENERGY) > 0 && s.my) {
                            return s;
                        } else {
                            return;
                        }
                    case STRUCTURE_CONTAINER:
                        if (creep.room.ffContainers.includes(s) && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                            return s;
                        } else {
                            return;
                        }
                }
                return;
            }
        });

        if (oldTarget) {
            let i = potentialTargets.indexOf(oldTarget);
            if (i >= 0) potentialTargets.splice(i, 1);
        }

        // Targets closest, or storage, or terminal, in that order.
        let potTarget = creep.pos.findClosestByRange(potentialTargets);
        if (potTarget) {
            creep.memory.target = potTarget.id;
        } else if (Game.rooms[creep.memory.homeRoom].storage) {
            creep.memory.target = Game.rooms[creep.memory.homeRoom].storage?.id;
        } else if (Game.rooms[creep.memory.homeRoom].terminal) {
            creep.memory.target = Game.rooms[creep.memory.homeRoom].terminal?.id;
        }
    }

    static needEnergyTargeting(creep: Creep) {
        let potentialTargets: (AnyStoreStructure | Resource | Tombstone | Ruin)[] = [];
        // Finds structures, tombstones, and dropped resources
        let nearbyInterests = Array.prototype.concat(
            creep.room.find(FIND_DROPPED_RESOURCES),
            creep.room.find(FIND_TOMBSTONES),
            creep.room.find(FIND_STRUCTURES),
            creep.room.find(FIND_RUINS));
        // Limits potential targets to only ones with energy, and if a structure, only structures that are containers or links.
        nearbyInterests = Utils.Utility.organizeTargets(RESOURCE_ENERGY, nearbyInterests, { structures: [STRUCTURE_CONTAINER, STRUCTURE_LINK, STRUCTURE_STORAGE] })

        // Remove FF containers as option
        nearbyInterests = this.prototype.removeFFContainers(creep.room, nearbyInterests)

        potentialTargets.push(...nearbyInterests);
        let priorityTargets = potentialTargets.filter(function (t) {
            return (('store' in t && t.store.energy > creep.store.getFreeCapacity()) || ('resourceType' in t && t.amount > creep.store.getFreeCapacity()))
        });

        if (priorityTargets.length > 1) {
            let i = priorityTargets.findIndex((t) => 'structureType' in t && t.structureType == STRUCTURE_STORAGE);
            if (i >= -1) priorityTargets.splice(i,1);
        }

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
        } else if (creep.room.storage && creep.room.storage.store.energy > 0) {
            creep.memory.target = creep.room.storage.id;
        } else if (creep.room.factory && creep.room.factory.store.energy > 0) {
            creep.memory.target = creep.room.factory.id;
        } else if (creep.room.terminal && creep.room.terminal.store.energy > 0) {
            creep.memory.target = creep.room.terminal.id;
        }
    }
}
