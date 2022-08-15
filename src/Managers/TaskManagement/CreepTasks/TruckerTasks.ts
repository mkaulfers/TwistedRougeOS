import {Process} from "../../../Models/Process"
import { Task, ProcessPriority, ProcessResult } from "../../../utils/Enums"

export function truckerHarvester(creep: Creep) {
    let creepId = creep.id

    const harvesterTask = () => {
        let creep = Game.creeps[creepId]

        if (!creep.memory.working || creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.working = false;
            delete creep.memory.target;
        } else if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.working = true;
            delete creep.memory.target;
        }
        const working = creep.memory.working;

        switch (working) {
            case true:
                // Go Fill Things

                // Get target
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
                let fTarget = Game.getObjectById(creep.memory.target);


                // Do
                var result = creep.transfer(fTarget, RESOURCE_ENERGY);
                switch (result) {
                    case OK:
                        break;
                    case ERR_NOT_IN_RANGE:
                        creep.moveTo(fTarget);
                        break;
                    default:
                        return ProcessResult.INCOMPLETE
                }

                break;
            case false:
                // Go Get Energy

                // Get target
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
                let gTarget = Game.getObjectById(creep.memory.target);

                if (gTarget.store.energy == 0) {
                    delete creep.memory.target;
                    ProcessResult.RUNNING;
                }

                // Do
                if (gTarget.store) {
                    result = creep.withdraw(gTarget, RESOURCE_ENERGY);
                } else {
                    result = creep.pickup(gTarget);
                }

                switch (result) {
                    case OK:
                        break;
                    case ERR_NOT_IN_RANGE:
                        creep.moveTo(fTarget);
                        break;
                    default:
                        return ProcessResult.INCOMPLETE
                }
                break;
            default:
                return ProcessResult.FAILED
        }

        /* User Story:
        As a trucker that works for harvesters, I want to get energy from a dropped source or container that has the most energy available,
        so that I can move it to spawn, extension, or storage in that order.

        Acceptance Criteria:

        Go to lowest energy source and pickup dropped energy OR energy from container.
        If spawn or extension needs energy, deliver to closest one.
        If spawn and extensions are full, deliver to storage.
        Repeat */

        // Handle working bool switch

        // if (source) {
        //     let result = creep.harvest(source)
        //     if (result == ERR_NOT_IN_RANGE) {
        //         creep.moveTo(source)
        //     } else {
        //         return ProcessResult.FAILED
        //     }
        // }

        return ProcessResult.RUNNING
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
