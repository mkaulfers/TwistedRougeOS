import { TRACE, ERROR } from "Constants/LogConstants"
import { LOW } from "Constants/ProcessPriorityConstants"
import { FATAL, RUNNING, INCOMPLETE } from "Constants/ProcessStateConstants"
import { Role, ENGINEER, HARVESTER, TRUCKER } from "Constants/RoleConstants"
import { ENGINEER_REPAIRING, ENGINEER_BUILDING, ENGINEER_UPGRADING, Task } from "Constants/TaskConstants"
import CreepRole from "Models/CreepRole"
import { Utils } from "utils/Index"
import { Process } from "../Models/Process"

export class Engineer extends CreepRole {

    readonly baseBody = [CARRY, CARRY, MOVE, MOVE, WORK]
    readonly segment = [CARRY, WORK, MOVE, MOVE]

    dispatch(room: Room) {
        Utils.Logger.log("CreepDispatch -> engineer.dispatch()", TRACE)

        let engineers = room.localCreeps.engineer

        let cSites: ConstructionSite[] = room.find(FIND_CONSTRUCTION_SITES);
        cSites = Utils.Utility.organizeTargets('hits', cSites, { needs: true })

        let rSites: AnyStructure[] = room.find(FIND_STRUCTURES);
        let accepted: StructureConstant[] = [
            STRUCTURE_EXTENSION,
            STRUCTURE_ROAD,
            STRUCTURE_SPAWN,
            STRUCTURE_LINK,
            STRUCTURE_STORAGE,
            STRUCTURE_TOWER,
            STRUCTURE_OBSERVER,
            STRUCTURE_POWER_SPAWN,
            STRUCTURE_EXTRACTOR,
            STRUCTURE_LAB,
            STRUCTURE_TERMINAL,
            STRUCTURE_CONTAINER,
            STRUCTURE_NUKER,
            STRUCTURE_FACTORY
        ];
        rSites = Utils.Utility.organizeTargets('hits', rSites, { structures: accepted, needs: true })

        let uSites: AnyStructure[] = room.find(FIND_STRUCTURES);
        uSites = Utils.Utility.organizeTargets('hits', uSites, { structures: [STRUCTURE_WALL, STRUCTURE_RAMPART], needs: true })

        let eRSites = Array.prototype.concat(
            _.filter(rSites, (r) => (r.hits <= (r.hitsMax / 2) )),
            _.filter(uSites, (r) => (r.hits <= (room.rampartHPTarget * 0.5) ))
        );

        let RepairedERSites = Array.prototype.concat(
            _.filter(rSites, (r) => (r.hits <= (r.hitsMax / 1.5) )),
            _.filter(uSites, (r) => (r.hits <= (room.rampartHPTarget * 0.75) ))
        );

        for (let engineer of engineers) {
            let stopERepairs = !(engineer.memory.task === ENGINEER_REPAIRING && RepairedERSites.length > 0)
            switch (true) {
                case (engineer.memory.task !== ENGINEER_REPAIRING &&
                    eRSites.length > 0):
                    global.scheduler.swapProcess(engineer, ENGINEER_REPAIRING)
                    break;
                case (engineer.memory.task !== ENGINEER_BUILDING &&
                    eRSites.length === 0 &&
                    stopERepairs === true &&
                    cSites.length > 0):
                    global.scheduler.swapProcess(engineer, ENGINEER_BUILDING)
                    break;
                case (engineer.memory.task !== ENGINEER_REPAIRING &&
                    eRSites.length === 0 &&
                    stopERepairs === true &&
                    cSites.length === 0 &&
                    rSites.length > 0):
                    global.scheduler.swapProcess(engineer, ENGINEER_REPAIRING)
                    break;
                case (engineer.memory.task !== ENGINEER_UPGRADING &&
                    eRSites.length === 0 &&
                    stopERepairs === true &&
                    cSites.length === 0 &&
                    rSites.length === 0 &&
                    uSites.length > 0):
                    global.scheduler.swapProcess(engineer, ENGINEER_UPGRADING)
                    break;
            }
        }

    }

    quantityWanted(room: Room, rolesNeeded: Role[], min?: boolean): number {
        Utils.Logger.log("quantityWanted -> engineer.quantityWanted()", TRACE)
        if (!(room.controller && room.controller.my && room.controller.level >= 2)) return 0;
        let engineerCount = rolesNeeded.filter(x => x == ENGINEER).length
        let harCount = rolesNeeded.filter(x => x == HARVESTER).length;
        if (harCount == 0 &&
            rolesNeeded.filter(x => x == TRUCKER).length == 0) return 0;
        if (min && min == true) return harCount < room.sources.length ? 0 : 1 - engineerCount;
        if (room.constructionSites().length == 0 && room.find(FIND_STRUCTURES).length == 0 ) return 0;
        if (room.storage && room.storage.store.energy < 50000) return engineerCount < 1 ? 1 : 0;
        if (room.constructionSites().length > 5) return engineerCount < 2 ? 2 - engineerCount : 0;
        if (room.constructionSites().length > 10) return engineerCount < 3 ? 3 - engineerCount : 0;
        return engineerCount < 1 ? 1 : 0;
    }

    readonly tasks: { [key in Task]?: (creep: Creep) => void } = {
        engineer_building: function(creep: Creep) {
            let creepId = creep.id

            const buildingTask = () => {
                Utils.Logger.log("CreepTask -> builderTask()", TRACE)
                let creep = Game.getObjectById(creepId);
                if (!creep) return FATAL;
                if (creep.spawning) return RUNNING;

                if (creep.memory.working == undefined) creep.memory.working = false;
                if ((creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0 && creep.memory.working == true) ||
                (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0 && creep.memory.working == false)) {
                    creep.memory.working = !creep.memory.working;
                    delete creep.memory.target;
                }
                const working = creep.memory.working;

                if (working) {
                    if (!creep.memory.target || (creep.memory.target && !Game.getObjectById(creep.memory.target))) {
                        let potentialTargets: ConstructionSite[] = creep.room.find(FIND_CONSTRUCTION_SITES);
                        potentialTargets = Utils.Utility.organizeTargets('hits', potentialTargets, { needs: true, order: 'asc' })

                        if (potentialTargets.length > 0) {
                            creep.memory.target = potentialTargets[0].id;
                        } else {
                            return RUNNING
                        }
                    }
                    let target = Game.getObjectById(creep.memory.target);

                    var result = creep.work(target);
                    if (result === OK) {
                        return RUNNING
                    }
                    Utils.Logger.log(`${creep.name} generated error code ${result} while building.`, ERROR)
                    return INCOMPLETE
                } else {
                    if (!creep.memory.target || (creep.memory.target && !Game.getObjectById(creep.memory.target))) {
                        let potentialTargets: (AnyStoreStructure | Resource | Tombstone)[] = [];
                        potentialTargets = Array.prototype.concat(
                            creep.room.find(FIND_DROPPED_RESOURCES),
                            creep.room.find(FIND_TOMBSTONES),
                            creep.room.find(FIND_STRUCTURES));
                        potentialTargets = Utils.Utility.organizeTargets(RESOURCE_ENERGY, potentialTargets, { structures: [STRUCTURE_CONTAINER, STRUCTURE_LINK]})

                        // Remove FF containers as option
                        potentialTargets = Engineer.prototype.removeFFContainers(creep.room, potentialTargets)

                        let priorityTargets = potentialTargets.filter(function(t) {
                            (('store' in t && t.store.energy > creep!.store.getFreeCapacity()) || ('resourceType' in t && t.amount > creep!.store.getFreeCapacity()))
                        });     // Only used creep! because of creep not existing being caught at the beginning of the process

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
                            return RUNNING
                        }
                    }
                    let target = Game.getObjectById(creep.memory.target);

                    if (!target ||
                        'store' in target && target.store.energy < 25 ||
                        'amount' in target && target.amount < 25) {
                        delete creep.memory.target;
                        RUNNING;
                    }

                    result = creep.take(target, RESOURCE_ENERGY);

                    if (result === OK) {
                        return RUNNING
                    }
                    Utils.Logger.log(`${creep.name} generated error code ${result} while withdrawing / picking up.`, ERROR)
                    return INCOMPLETE
                }
            }

            creep.memory.task = ENGINEER_BUILDING
            let newProcess = new Process(creep.name, LOW, buildingTask)
            global.scheduler.addProcess(newProcess)
        },
        engineer_repairing: function(creep: Creep) {
            let creepId = creep.id

            const repairingTask = () => {
                Utils.Logger.log("CreepTask -> repairTask()", TRACE)
                let creep = Game.getObjectById(creepId);
                if (!creep) return FATAL;
                if (creep.spawning) return RUNNING;

                if (creep.memory.working == undefined) creep.memory.working = false;
                if ((creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0 && creep.memory.working == true) ||
                (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0 && creep.memory.working == false)) {
                    creep.memory.working = !creep.memory.working;
                    delete creep.memory.target;
                }
                const working = creep.memory.working;

                if (working) {
                    if (!creep.memory.target || (creep.memory.target && !Game.getObjectById(creep.memory.target))) {
                        let potentialTargets: AnyStructure[] = creep.room.find(FIND_STRUCTURES);
                        potentialTargets = _.filter(potentialTargets, function(t) {
                            if ((t.structureType == STRUCTURE_WALL || t.structureType == STRUCTURE_RAMPART) && t.hits <= (creep!.room.rampartHPTarget * 0.75)) {
                                return t;
                            } else if (t.structureType !== STRUCTURE_WALL && t.structureType !== STRUCTURE_RAMPART && t.structureType !== STRUCTURE_CONTROLLER){
                                return t;
                            }
                            return;
                        });
                        potentialTargets = Utils.Utility.organizeTargets('hits', potentialTargets, { needs: true })
                        if (potentialTargets.length > 0) {
                            creep.memory.target = potentialTargets[0].id;
                        } else {
                            return RUNNING
                        }
                    }
                    let target = Game.getObjectById(creep.memory.target);

                    if (!target || target.hits === target.hitsMax) delete creep.memory.target;

                    var result = creep.work(target);
                    if (result === OK) {
                        return RUNNING
                    }
                    Utils.Logger.log(`${creep.name} generated error code ${result} while building.`, ERROR)
                    return INCOMPLETE
                } else {

                    if (!creep.memory.target || (creep.memory.target && !Game.getObjectById(creep.memory.target))) {
                        let potentialTargets: (AnyStoreStructure | Resource | Tombstone)[] = [];
                        potentialTargets = Array.prototype.concat(
                            creep.room.find(FIND_DROPPED_RESOURCES),
                            creep.room.find(FIND_TOMBSTONES),
                            creep.room.find(FIND_STRUCTURES));
                        potentialTargets = Utils.Utility.organizeTargets(RESOURCE_ENERGY, potentialTargets, { structures: [STRUCTURE_CONTAINER, STRUCTURE_LINK] })

                        // Remove FF containers as option
                        potentialTargets = Engineer.prototype.removeFFContainers(creep.room, potentialTargets)

                        let priorityTargets = potentialTargets.filter(function(t) {
                            (('store' in t && t.store.energy > creep!.store.getFreeCapacity()) || ('resourceType' in t && t.amount > creep!.store.getFreeCapacity()))
                        });     // Only used creep! because of creep not existing being caught at the beginning of the process

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
                            return RUNNING
                        }
                    }
                    let target = Game.getObjectById(creep.memory.target);

                    if (!target ||
                        'store' in target && target.store.energy < 25 ||
                        'amount' in target && target.amount < 25) {
                        delete creep.memory.target;
                        RUNNING;
                    }

                    result = creep.take(target, RESOURCE_ENERGY);

                    if (result === OK) {
                        return RUNNING
                    }
                    Utils.Logger.log(`${creep.name} generated error code ${result} while withdrawing / picking up.`, ERROR)
                    return INCOMPLETE
                }
            }

            creep.memory.task = ENGINEER_REPAIRING
            let newProcess = new Process(creep.name, LOW, repairingTask)
            global.scheduler.addProcess(newProcess)
        },
        engineer_upgrading: function(creep: Creep) {
            let creepId = creep.id

            const upgradingTask = () => {
                Utils.Logger.log("CreepTask -> eUpgradingTask()", TRACE)
                let creep = Game.getObjectById(creepId);
                if (!creep) return FATAL;
                if (creep.spawning) return RUNNING;

                if (creep.memory.working == undefined) creep.memory.working = false;
                if ((creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0 && creep.memory.working == true) ||
                (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0 && creep.memory.working == false)) {
                    creep.memory.working = !creep.memory.working;
                    delete creep.memory.target;
                }
                const working = creep.memory.working;

                if (working) {
                    if (!creep.memory.target || (creep.memory.target && !Game.getObjectById(creep.memory.target))) {
                        let potentialTargets: AnyStructure[] = creep.room.find(FIND_STRUCTURES);
                        potentialTargets = Utils.Utility.organizeTargets('hits', potentialTargets, { structures: [STRUCTURE_WALL, STRUCTURE_RAMPART], needs: true })
                        if (potentialTargets.length > 0) {
                            creep.memory.target = potentialTargets[0].id;
                        } else {
                            return RUNNING
                        }
                    }
                    let target = Game.getObjectById(creep.memory.target);

                    var result = creep.work(target);
                    if (result === OK) {
                        return RUNNING
                    }
                    Utils.Logger.log(`${creep.name} generated error code ${result} while building.`, ERROR)
                    return INCOMPLETE
                } else {
                    if (!creep.memory.target || (creep.memory.target && !Game.getObjectById(creep.memory.target))) {
                        let potentialTargets: (AnyStoreStructure | Resource | Tombstone)[] = [];
                        potentialTargets = Array.prototype.concat(
                            creep.room.find(FIND_DROPPED_RESOURCES),
                            creep.room.find(FIND_TOMBSTONES),
                            creep.room.find(FIND_STRUCTURES));
                        potentialTargets = Utils.Utility.organizeTargets(RESOURCE_ENERGY, potentialTargets, { structures: [STRUCTURE_CONTAINER, STRUCTURE_LINK, STRUCTURE_STORAGE] })

                        // Remove FF containers as option
                        potentialTargets = Engineer.prototype.removeFFContainers(creep.room, potentialTargets)

                        let priorityTargets = potentialTargets.filter(function(t) {
                            (('store' in t && t.store.energy > creep!.store.getFreeCapacity()) || ('resourceType' in t && t.amount > creep!.store.getFreeCapacity()))
                        });     // Only used creep! because of creep not existing being caught at the beginning of the process

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
                            return RUNNING
                        }
                    }
                    let target = Game.getObjectById(creep.memory.target);

                    if (!target ||
                        'store' in target && target.store.energy < 25 ||
                        'amount' in target && target.amount < 25) {
                        delete creep.memory.target;
                        RUNNING;
                    }

                    result = creep.take(target, RESOURCE_ENERGY);

                    if (result === OK) {
                        return RUNNING
                    }
                    Utils.Logger.log(`${creep.name} generated error code ${result} while withdrawing / picking up.`, ERROR)
                    return INCOMPLETE
                }
            }

            creep.memory.task = ENGINEER_UPGRADING
            let newProcess = new Process(creep.name, LOW, upgradingTask)
            global.scheduler.addProcess(newProcess)
        }
    }
}
