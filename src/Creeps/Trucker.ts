import { Process } from "Models/Process";
import { Utils } from "utils/Index"

var trucker = {
    truckerHarvester: function(creep: Creep) {
        let creepId = creep.id

        const truckerHarvesterTask = () => {
            Utils.Logger.log("CreepTask -> truckerHarvesterTask()", LogLevel.TRACE)
            let creep = Game.getObjectById(creepId);
            if (!creep) return ProcessResult.FAILED;

            if (!creep.memory.working || creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
                creep.memory.working = false;
                delete creep.memory.target;
            } else if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
                creep.memory.working = true;
                delete creep.memory.target;
            }
            const working = creep.memory.working;

            if (working) {
                if (!creep.memory.target || (creep.memory.target && !Game.getObjectById(creep.memory.target))) {
                    let potentialTargets: Structure[] = creep.room.find(FIND_MY_STRUCTURES, {filter: function(s) {
                        switch (s.structureType) {
                            case STRUCTURE_SPAWN:
                            case STRUCTURE_POWER_SPAWN:
                            case STRUCTURE_EXTENSION:
                                if (s.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                                    return s;
                                } else {
                                    return;
                                }
                        }
                        return;
                    }});

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

                var result = creep.give(target, RESOURCE_ENERGY);
                if (result === OK) {
                    return ProcessResult.RUNNING
                }
                Utils.Logger.log(`${creep.name} generated error code ${result} while transferring.`, LogLevel.ERROR)
                return ProcessResult.INCOMPLETE
            } else {
                if (!creep.memory.target || (creep.memory.target && !Game.getObjectById(creep.memory.target))) {
                    let potentialTargets: (AnyStoreStructure | Resource | Tombstone)[] = [];
                    creep.room.find(FIND_SOURCES).forEach(function(source) {
                        let nearbyInterests = Array.prototype.concat(
                            source.pos.findInRange(FIND_STRUCTURES, 2),
                            source.pos.findInRange(FIND_TOMBSTONES, 2),
                            source.pos.findInRange(FIND_DROPPED_RESOURCES, 2));
                        nearbyInterests = _
                            .chain(nearbyInterests)
                            .filter((s) => ('store' in s && s.store.energy > 0) || ('resourceType' in s && s.resourceType === RESOURCE_ENERGY))
                            .sortByOrder(function(s: (AnyStoreStructure | Resource | Tombstone)) {
                                if ('store' in s) {
                                    return s.store.energy;
                                } else {
                                    return s.amount;
                                }
                            }, 'desc')
                            .value();

                        potentialTargets.push(...nearbyInterests);
                    });
                    creep.memory.target = potentialTargets[0].id;
                }
                let target = Game.getObjectById(creep.memory.target);

                if (target.store.energy == 0) {
                    delete creep.memory.target;
                    ProcessResult.RUNNING;
                }

                result = creep.take(target, RESOURCE_ENERGY);

                if (result === OK) {
                    return ProcessResult.RUNNING
                }
                Utils.Logger.log(`${creep.name} generated error code ${result} while withdrawing / picking up.`, LogLevel.ERROR)
                return ProcessResult.INCOMPLETE
            }
        }

        creep.memory.task = Task.TRUCKER_HARVESTER
        let newProcess = new Process(creep.name, ProcessPriority.LOW, truckerHarvesterTask)
        global.scheduler.addProcess(newProcess)
    },
    truckerScientist: function(creep: Creep) {
        let creepId = creep.id;

        const truckerScientistTask = () => {
            Utils.Logger.log("CreepTask -> truckerScientistTask()", LogLevel.TRACE);
            let creep = Game.getObjectById(creepId);
            if (!creep) return ProcessResult.FAILED;

            if (!creep.memory.working || creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
                creep.memory.working = false;
                delete creep.memory.target;
            } else if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
                creep.memory.working = true;
                delete creep.memory.target;
            }
            const working = creep.memory.working;

            if (working) {
                if (!creep.memory.target || (creep.memory.target && !Game.getObjectById(creep.memory.target))) {
                    let potentialTargets: Creep[] = creep.room.creeps(Role.SCIENTIST);
                    potentialTargets = Utils.Utility.organizeTargets(potentialTargets, {resource: RESOURCE_ENERGY, order: 'asc'});

                    let potTarget = potentialTargets[0];
                    if (potTarget) {
                        creep.memory.target = potTarget.id;
                    } else {
                        return ProcessResult.RUNNING
                    }
                }
                let target = Game.getObjectById(creep.memory.target);

                var result = creep.give(target, RESOURCE_ENERGY);
                if (result === OK) {
                    return ProcessResult.RUNNING
                }
                Utils.Logger.log(`${creep.name} generated error code ${result} while transferring.`, LogLevel.ERROR)
                return ProcessResult.INCOMPLETE
            } else {
                if (!creep.memory.target || (creep.memory.target && !Game.getObjectById(creep.memory.target))) {
                    let potentialTargets: (AnyStoreStructure | Resource | Tombstone)[] = [];
                    let nearbyInterests = Array.prototype.concat(
                        creep.room.find(FIND_DROPPED_RESOURCES),
                        creep.room.find(FIND_TOMBSTONES),
                        creep.room.find(FIND_STRUCTURES));
                    nearbyInterests = Utils.Utility.organizeTargets(nearbyInterests, { resource: RESOURCE_ENERGY, structures: [STRUCTURE_CONTAINER, STRUCTURE_LINK]})

                    potentialTargets.push(...nearbyInterests);
                    let priorityTargets = potentialTargets.filter(function(t) {
                        (('store' in t && t.store.energy > creep!.store.getFreeCapacity()) || ('resourceType' in t && t.amount > creep!.store.getFreeCapacity()))
                    });     // Only used creep! because of creep not existing being caught at the beginning of the process

                    if (priorityTargets) {
                        creep.memory.target = priorityTargets[0].id;
                    } else if (potentialTargets) {
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

                if (target.store.energy < 25) {
                    delete creep.memory.target;
                    ProcessResult.RUNNING;
                }

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
    },
    truckerStorage: function(creep: Creep) {
        let creepId = creep.id

        const storageTask = () => {
            let creep = Game.creeps[creepId]
            Utils.Logger.log("CreepTask -> storageTask()", LogLevel.TRACE);
            Utils.Logger.log("Why is there a truckerStorageTask running?!?!", LogLevel.ERROR);
            return ProcessResult.FAILED
        }

        creep.memory.task = Task.TRUCKER_STORAGE
        let newProcess = new Process(creep.name, ProcessPriority.LOW, storageTask)
        global.scheduler.addProcess(newProcess)
    },
    shouldSpawn(): boolean {
        return false
    },
    baseBody: [CARRY, CARRY, CARRY, MOVE, MOVE, MOVE],
    segment: [CARRY, CARRY, MOVE],
}

export default trucker;
