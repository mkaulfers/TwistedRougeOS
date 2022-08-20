import { Utils } from "utils/Index"
import { Process } from "../Models/Process"
import { Role, Task, ProcessPriority, ProcessResult, LogLevel } from '../utils/Enums'


var engineer = {
    engineerBuilding: function(creep: Creep) {
        let creepId = creep.id

        const buildingTask = () => {
            Utils.Logger.log("CreepTask -> builderTask()", LogLevel.TRACE)
            let creep = Game.getObjectById(creepId);
            if (!creep) return ProcessResult.FAILED;

            if (creep.memory.working == undefined || creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
                creep.memory.working = false;
                delete creep.memory.target;
            } else if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
                creep.memory.working = true;
                delete creep.memory.target;
            }
            const working = creep.memory.working;

            if (working) {
                if (!creep.memory.target || (creep.memory.target && !Game.getObjectById(creep.memory.target))) {
                    let potentialTargets: ConstructionSite[] = creep.room.find(FIND_CONSTRUCTION_SITES);
                    potentialTargets = Utils.Utility.organizeTargets(potentialTargets, { hits: true, order: 'asc' })

                    if (potentialTargets.length > 0) {
                        creep.memory.target = potentialTargets[0].id;
                    } else {
                        return ProcessResult.RUNNING
                    }
                }
                let target = Game.getObjectById(creep.memory.target);

                var result = creep.work(target);
                if (result === OK) {
                    return ProcessResult.RUNNING
                }
                Utils.Logger.log(`${creep.name} generated error code ${result} while building.`, LogLevel.ERROR)
                return ProcessResult.INCOMPLETE
            } else {
                if (!creep.memory.target || (creep.memory.target && !Game.getObjectById(creep.memory.target))) {
                    let potentialTargets: (AnyStoreStructure | Resource | Tombstone)[] = [];
                    potentialTargets = Array.prototype.concat(
                        creep.room.find(FIND_DROPPED_RESOURCES),
                        creep.room.find(FIND_TOMBSTONES),
                        creep.room.find(FIND_STRUCTURES));
                    potentialTargets = Utils.Utility.organizeTargets(potentialTargets, { resource: RESOURCE_ENERGY, structures: [STRUCTURE_CONTAINER, STRUCTURE_LINK]})

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
                        return ProcessResult.RUNNING
                    }
                }
                let target = Game.getObjectById(creep.memory.target);

                if (!target ||
                    'store' in target && target.store.energy < 25 ||
                    'amount' in target && target.amount < 25) {
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

        creep.memory.task = Task.ENGINEER_BUILDING
        let newProcess = new Process(creep.name, ProcessPriority.LOW, buildingTask)
        global.scheduler.addProcess(newProcess)
    },
    engineerRepairing: function(creep: Creep) {
        Utils.Logger.log("CreepTask -> repairTask()", LogLevel.DEBUG)
        let creepId = creep.id

        const repairingTask = () => {
            let creep = Game.getObjectById(creepId)
            // if (!creep) return ProcessResult.FAILED
        }

        creep.memory.task = Task.ENGINEER_REPAIRING
        let newProcess = new Process(creep.name, ProcessPriority.LOW, repairingTask)
        global.scheduler.addProcess(newProcess)
    },
    engineerUpgrading: function(creep: Creep) {
        Utils.Logger.log("CreepTask -> eUpgraderTask()", LogLevel.DEBUG)
        let creepId = creep.id

        const upgradingTask = () => {
            let creep = Game.getObjectById(creepId)
            // if (!creep) return ProcessResult.FAILED
        }

        creep.memory.task = Task.ENGINEER_UPGRADING
        let newProcess = new Process(creep.name, ProcessPriority.LOW, upgradingTask)
        global.scheduler.addProcess(newProcess)
    },
    dispatch: function(room: Room) {
        let engineers = room.creeps(Role.ENGINEER)

        let cSites: ConstructionSite[] = room.find(FIND_CONSTRUCTION_SITES);
        cSites = Utils.Utility.organizeTargets(cSites, { hits: true, order: 'asc' })

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
        rSites = Utils.Utility.organizeTargets(rSites, { hits: true , structures: accepted})

        let uSites: AnyStructure[] = room.find(FIND_STRUCTURES);
        uSites = Utils.Utility.organizeTargets(uSites, { hits: true , structures: [STRUCTURE_WALL, STRUCTURE_RAMPART]})

        let eRSites = Array.prototype.concat(
            _.filter(rSites, (r) => (r.hits <= (r.hitsMax / 2) )),
            _.filter(uSites, (r) => (r.hits <= (room.rampartHPTarget() * 0.75) ))
        );

        for (let engineer of engineers) {
            if ((!engineer.memory.task || engineer.memory.task !== Task.ENGINEER_REPAIRING) && eRSites.length > 0) {
                global.scheduler.swapProcess(engineer, Task.ENGINEER_REPAIRING)
            } else if ((!engineer.memory.task || engineer.memory.task !== Task.ENGINEER_BUILDING) && cSites.length > 0) {
                global.scheduler.swapProcess(engineer, Task.ENGINEER_BUILDING)
            } else if ((!engineer.memory.task || engineer.memory.task !== Task.ENGINEER_REPAIRING) && rSites.length > 0) {
                global.scheduler.swapProcess(engineer, Task.ENGINEER_REPAIRING)
            } else if ((!engineer.memory.task || engineer.memory.task !== Task.ENGINEER_UPGRADING) && uSites.length > 0) {
                global.scheduler.swapProcess(engineer, Task.ENGINEER_UPGRADING)
            }
        }

    },
    shouldSpawn: function(room: Room): boolean {
        if (!(room.controller && room.controller.my && room.controller.level >= 3)) { return false}
        if (room.creeps(Role.ENGINEER).length < room.controller.level - 1) { return true}
        return false
    },
    baseBody: [CARRY, MOVE, WORK, WORK],
    segment: [CARRY, MOVE, WORK, WORK],
}

export default engineer;
