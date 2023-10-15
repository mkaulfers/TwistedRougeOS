import { TRACE, INFO, ERROR } from "Constants/LogConstants"
import { LOW } from "Constants/ProcessPriorityConstants"
import { FATAL, RUNNING, INCOMPLETE } from "Constants/ProcessStateConstants"
import { Role, HARVESTER, TRUCKER } from "Constants/RoleConstants"
import { Task, TRUCKER_WORKING } from "Constants/TaskConstants"
import { LogisticsManager } from "Managers/LogisticsManager"
import CreepRole from "Models/CreepRole"
import { Process } from "Models/Process"
import { Utils } from "utils/Index"
export class Trucker extends CreepRole {

    readonly baseBody = [CARRY, CARRY, CARRY, MOVE, MOVE, MOVE]
    readonly segment = [MOVE, CARRY, CARRY]
    readonly carryModifier = 3.0

    dispatch(room: Room) {
        let truckers = room.localCreeps.trucker
        for (let trucker of truckers) {
            if (!trucker.memory.task) {
                global.scheduler.swapProcess(trucker, TRUCKER_WORKING)
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
        let carryCount = this.getBody(room).filter(p => p == CARRY).length
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
        trucker_working: function(creep: Creep) {

            const creepName = creep.name;
            const truckerWorkingTask = () => {
                let creep = Game.creeps[creepName];
                if (!creep.memory) return
                
                let room = Game.rooms[creep.memory.homeRoom];
                if (!room || !room.cache.logisticsManager) return
                room.cache.logisticsManager.handleTarget(creep)
            }

            let process = new Process(creep.id, LOW, truckerWorkingTask)
            global.scheduler.addProcess(process)
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
