import { Logger, LogLevel } from "utils/Logger"
import {Process} from "../../../Models/Process"
import { Task, ProcessPriority, ProcessResult } from "../../../utils/Enums"

export function truckerHarvester(creep: Creep) {
    let creepId = creep.id

    const harvesterTask = () => {
        Logger.log("CreepTask -> sourceTask()", LogLevel.TRACE)
        let creep = Game.creeps[creepId]

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
            Logger.log(`${creep.name} generated error code ${result} while transferring.`, LogLevel.ERROR)
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
                        .filter((s) => (s.store && s.store.energy > 0) || s.resourceType === RESOURCE_ENERGY)
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
            Logger.log(`${creep.name} generated error code ${result} while withdrawing / picking up.`, LogLevel.ERROR)
            return ProcessResult.INCOMPLETE
        }
    }

    creep.memory.task = Task.TRUCKER_HARVESTER
    let newProcess = new Process(creep.name, ProcessPriority.LOW, harvesterTask)
    global.scheduler.addProcess(newProcess)
}

export function truckerScientist(creep: Creep) {
    let creepId = creep.id

    const scientistTask = () => {
        let creep = Game.creeps[creepId]
    }

    creep.memory.task = Task.TRUCKER_SCIENTIST
    let newProcess = new Process(creep.name, ProcessPriority.LOW, scientistTask)
    global.scheduler.addProcess(newProcess)
}

export function truckerStorage(creep: Creep) {
    let creepId = creep.id

    const storageTask = () => {
        let creep = Game.creeps[creepId]
    }

    creep.memory.task = Task.TRUCKER_STORAGE
    let newProcess = new Process(creep.name, ProcessPriority.LOW, storageTask)
    global.scheduler.addProcess(newProcess)
}
