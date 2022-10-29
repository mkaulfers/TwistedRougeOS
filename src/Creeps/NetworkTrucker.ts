import { DEBUG, TRACE, ERROR } from "Constants/LogConstants";
import { LOW } from "Constants/ProcessPriorityConstants";
import { FATAL, RUNNING, INCOMPLETE } from "Constants/ProcessStateConstants";
import { Role, nTRUCKER } from "Constants/RoleConstants";
import { nTRUCKER_TRANSPORTING, Task } from "Constants/TaskConstants";
import { Process } from "Models/Process";
import { Utils } from "utils/Index";
import { Logger } from "utils/Logger";
import { Trucker } from "./Trucker";

export class NetworkTrucker extends Trucker {
    readonly baseBody = [CARRY, CARRY, CARRY, MOVE, MOVE, MOVE]
    readonly segment = [MOVE, CARRY]

    dispatch(room: Room): void {
        let networkHaulers = room.stationedCreeps.nTrucker;
        for (let hauler of networkHaulers) {
            if (!hauler.memory.task || hauler.memory.task !== nTRUCKER_TRANSPORTING) {
                Logger.log(`Setting Task to nTrucker`, TRACE)
                global.scheduler.swapProcess(hauler, nTRUCKER_TRANSPORTING)
            }
        }
    }

    quantityWanted(room: Room, rolesNeeded: Role[], min?: boolean): number {
        if (!room.storage) return 0
        if (min && min == true) return 0;

        let networkHaulers = rolesNeeded.filter(x => x == nTRUCKER).length
        let remotes = room.memory.remoteSites || {}

        // Determine total work per planned body
        if (!this.partLimits || this.partLimits.length == 0) this.partLimits = Utils.Utility.buildPartLimits(this.baseBody, this.segment);
        if (!this[room.spawnEnergyLimit]) this[room.spawnEnergyLimit] = Utils.Utility.getBodyFor(room, this.baseBody, this.segment, this.partLimits);
        let body = this[room.spawnEnergyLimit];
        let carryCount = body.filter(p => p == CARRY).length
        if (carryCount === 0 || !carryCount) Utils.Logger.log(`Carry Count for nTruckers was ${carryCount}! This is a failure mode!`, ERROR);

        // Determine quantity needed to meet all carryRequisites per source.
        let shouldBe = 0
        for (const remoteRoomName in remotes) {
            const remoteDetails = remotes[remoteRoomName]
            for (const key in remoteDetails) {
                if (['assignedHarvIds', 'assignedTruckerIds', 'assignedEngIds'].indexOf(key) >= 0) continue;
                const carryReq = remoteDetails[key as Id<Source>].carryReq;
                if (!carryReq) continue;
                shouldBe += Math.ceil(carryReq / carryCount);
            }
        }
        return shouldBe >= networkHaulers ? shouldBe - networkHaulers : 0;
    }

    preSpawnBy(room: Room, spawn: StructureSpawn, creep?: Creep): number {
        if (!room || !room.memory.remoteSites || !room.controller || !creep || !creep.memory.remoteTarget || !creep.memory.remoteTarget[0]) return 0;
        // Fetch distance from remoteSites
        const dist = room.memory.remoteSites[creep.memory.remoteTarget[0].roomName][creep.memory.remoteTarget[0].targetId].dist;
        if (!dist) return 0;
        return dist;
    }

    readonly tasks: { [key in Task]?: (creep: Creep) => void } = {
        nTrucker_transporting: function (creep: Creep) {
            let creepId = creep.id
            let creepName = creep.name;
            let homeRoom = creep.memory.homeRoom;

            const networkHaulerTask = () => {
                let creep = Game.getObjectById(creepId)

                // Handle creep death assignment cleanup
                if (!creep || (creep.ticksToLive && creep.ticksToLive < 1)) {
                    let creepMemory = Memory.creeps[creepName];
                    if (!creepMemory || !creepMemory.remoteTarget) {
                        let remoteSites = Memory.rooms[homeRoom].remoteSites;
                        if (!remoteSites) return FATAL;
                        for (const remoteRoomName in remoteSites) {
                            let index = remoteSites[remoteRoomName].assignedTruckerIds.indexOf(creepId);
                            if (index >= 0) remoteSites[remoteRoomName].assignedTruckerIds.splice(index, 1);
                        }
                    } else {
                        // Use memory to precisely clean up remoteSites
                        let homeRoomMemory = Memory.rooms[creepMemory.homeRoom]
                        if (homeRoomMemory.remoteSites) {
                            let remoteDetail = homeRoomMemory.remoteSites[creepMemory.remoteTarget[0].roomName]
                            let index = remoteDetail.assignedTruckerIds.indexOf(creepId);
                            if (index >= 0) remoteDetail.assignedTruckerIds.splice(index, 1);
                        }
                    }

                    return FATAL;
                }

                if (creep.spawning) return RUNNING;

                // Pull remote target IFF not set.
                if (!creep.memory.remoteTarget) {
                    NetworkTrucker.setRemoteSource(creep.room, creep)
                }

                // Switches working value if full or empty.
                if (creep.memory.working == undefined) creep.memory.working = false;
                if ((creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0 && creep.memory.working == true) ||
                    (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0 && creep.memory.working == false)) {
                    creep.memory.working = !creep.memory.working;
                    delete creep.memory.target;

                    // Check if full loop is completable.
                    if (creep.room.name === creep.memory.homeRoom && creep.room.memory.remoteSites && creep.memory.remoteTarget && creep.memory.remoteTarget[0]) {
                        const dist = creep.room.memory.remoteSites[creep.memory.remoteTarget[0].roomName][creep.memory.remoteTarget[0].targetId].dist;
                        if (dist && creep.ticksToLive && creep.ticksToLive < (dist * 2)) creep.cache.shouldSuicide = true;
                    }
                }
                const working = creep.memory.working;

                // Handle EOL suicide / recycle
                if (creep.cache.shouldSuicide === true) {
                    // Find available spawn
                    if (!creep.memory.target) {
                        let spawn = creep.room.getNextAvailableSpawn;
                        if (spawn) creep.memory.target = spawn.id;
                    }
                    let spawn = creep.memory.target ? Game.getObjectById(creep.memory.target) : undefined;
                    if (!spawn || !Utils.Typeguards.isStructureSpawn(spawn)) {
                        creep.suicide();
                        return RUNNING;
                    }

                    if (creep.pos.roomName !== spawn.pos.roomName || creep.pos.getRangeTo(spawn) > 1) creep.travel(spawn);
                    else if (!spawn.spawning) spawn.recycleCreep(creep);
                    return RUNNING;
                }

                if (working === false) {
                    // Get target within range 1 of source.
                    let remoteTarget = creep.memory.remoteTarget ? creep.memory.remoteTarget[0] : undefined
                    let remoteDetails = Memory.rooms[creep.memory.homeRoom].remoteSites && remoteTarget ? Memory.rooms[creep.memory.homeRoom].remoteSites![remoteTarget.roomName] : undefined
                    if (remoteTarget && remoteDetails) {
                        let remoteSourceTarget = Utils.Utility.unpackPostionToRoom(remoteDetails[remoteTarget.targetId].packedPos, remoteTarget.roomName);

                        // Get target
                        if (!creep.memory.target && creep.room.name === remoteSourceTarget.roomName) {
                            let container: StructureContainer | undefined = remoteSourceTarget.findInRange(creep.room.containers, 1)[0]
                            let resourceEnergy = remoteSourceTarget.findInRange(FIND_DROPPED_RESOURCES, 1, { filter: (r) => r.resourceType == RESOURCE_ENERGY })[0]

                            if (resourceEnergy && resourceEnergy.amount > 5) creep.memory.target = resourceEnergy.id
                            else if (container && container.store.energy > (creep.store.getCapacity() * 0.75)) creep.memory.target = container.id
                            else if (creep.room.name === remoteSourceTarget.roomName) Trucker.needEnergyTargeting(creep);
                        }
                        let target = creep.memory.target ? Game.getObjectById(creep.memory.target) : undefined;

                        // Target Validation check
                        if (!target || (target && ('store' in target && target.store.energy === 0) || ('amount' in target && target.amount <= 5))) delete creep.memory.target

                        if (!target && (creep.pos.roomName !== remoteSourceTarget.roomName || creep.pos.nearEdge)) creep.travel(remoteSourceTarget, { avoidCreeps: true })
                        if (target) creep.take(target, RESOURCE_ENERGY)
                    }
                } else {
                    // Determines new target to dump energy into.
                    if (!creep.memory.target || (creep.memory.target && !Game.getObjectById(creep.memory.target)) || (creep.pos.roomName === creep.memory.homeRoom && (creep.pos.x === 0 || creep.pos.x === 49 || creep.pos.y === 0 || creep.pos.y === 49))) {
                        Trucker.storageTruckerWorkingTargeting(creep);
                        if (!creep.memory.target) return RUNNING;
                    }
                    let target = Game.getObjectById(creep.memory.target);

                    // Confirms target is still valid
                    if (!target ||
                        'store' in target && target.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
                        delete creep.memory.target;
                        Trucker.storageTruckerWorkingTargeting(creep);
                        if (!creep.memory.target) return RUNNING;
                        target = Game.getObjectById(creep.memory.target);
                        if (!target) return RUNNING;
                    }

                    // Runs give and handles return value.
                    var result = creep.give(target, RESOURCE_ENERGY);
                    if (result === OK) {
                        if (creep.store.energy > 0 && creep.pos.getRangeTo(target) == 1 || target.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
                            Trucker.storageTruckerWorkingTargeting(creep);
                            let newTarget = Game.getObjectById(creep.memory.target);
                            if (target.id !== creep.memory.target && newTarget && creep.pos.getRangeTo(newTarget) > 1) creep.moveToDefault(newTarget);
                        }
                        return RUNNING
                    }
                    Utils.Logger.log(`${creep.name} generated error code ${result} while transferring.`, ERROR)
                    return RUNNING
                }

                return RUNNING;
            }

            let newProcess = new Process(creep.name, LOW, networkHaulerTask)
            global.scheduler.addProcess(newProcess)
        }
    }

    static setRemoteSource(baseRoom: Room, creep: Creep) {
        if (!baseRoom.memory.remoteSites) return
        let remotes = baseRoom.memory.remoteSites || {}

        // Prespawn targeting
        const matchingCreep = baseRoom.stationedCreeps.nTrucker.find((c) => c.name !== creep.name && (c.name.substring(0,6) ?? '1') === (creep.name.substring(0,6) ?? '0'))
        const matchingTarget = matchingCreep?.memory.remoteTarget ? matchingCreep.memory.remoteTarget[0] : undefined;
        if (matchingCreep && matchingTarget) {
            let remoteDetails = baseRoom.memory.remoteSites[matchingTarget.roomName]
            const sourceDetails = remoteDetails ? remoteDetails[matchingTarget.targetId] : undefined;
            // Determine creep priority level
            const priority = parseInt(creep.name.substring(3,5));
            if (remoteDetails && sourceDetails && sourceDetails.carryReq && typeof priority === 'number') {
                // Calculate carryFound for creeps assigned, considering only higher priority creeps (e.g. nTr00 is higher priority than nTr07)
                let carryFound = 0;
                for (const id of remoteDetails.assignedTruckerIds) {
                    const nTr = Game.getObjectById(id);
                    if (!nTr) continue;
                    const nTrPriority = parseInt(nTr.name.substring(3,5));
                    if (typeof nTrPriority !== 'number') continue;
                    if (nTr && nTr.carryParts && nTrPriority < priority && nTr.memory.remoteTarget && nTr.memory.remoteTarget[0]?.targetId === matchingTarget.targetId) carryFound += nTr.carryParts;
                }

                if (carryFound < sourceDetails.carryReq) {
                    if (!creep.memory.remoteTarget) creep.memory.remoteTarget = [];
                    creep.memory.remoteTarget.push({ roomName: matchingTarget.roomName, targetId: matchingTarget.targetId })
                    baseRoom.memory.remoteSites[matchingTarget.roomName].assignedTruckerIds.push(creep.id)
                    return;
                }
            }
        }

        // Find Any Viable Target
        if (!creep.memory.remoteTarget || creep.memory.remoteTarget.length <= 0) {
            for (let remoteRoomName in remotes) {
                let remoteDetails = remotes[remoteRoomName]

                for (let key in remoteDetails) {
                    if (['assignedHarvIds', 'assignedTruckerIds', 'assignedEngIds'].indexOf(key) >= 0) continue;

                    // Get required carry parts for remote
                    const carryReq = remoteDetails[key as Id<Source>].carryReq;
                    if (!carryReq) continue;

                    // Find currently assigned carry parts for remote
                    let carryFound = 0;
                    for (const id of remoteDetails.assignedTruckerIds) {
                        const nTr = Game.getObjectById(id);
                        if (!nTr) continue;
                        if (nTr && nTr.carryParts && nTr.memory.remoteTarget && nTr.memory.remoteTarget[0]?.targetId === key) carryFound += nTr.carryParts;
                    }

                    if (carryFound < carryReq) {
                        if (!creep.memory.remoteTarget) creep.memory.remoteTarget = [];
                        creep.memory.remoteTarget.push({ roomName: remoteRoomName, targetId: key as Id<Source> })
                        baseRoom.memory.remoteSites[remoteRoomName].assignedTruckerIds.push(creep.id)
                        return;
                    }
                }
            }
        }
    }

    private static validateRemoteTruckers(baseRoom: Room) {
        for (let remoteRoomName in baseRoom.memory.remoteSites) {
            let updatedAssignedTruckers: Id<Creep>[] = []

            for (let truId of baseRoom.memory.remoteSites[remoteRoomName].assignedTruckerIds) if (Game.getObjectById(truId)) updatedAssignedTruckers.push(truId);

            baseRoom.memory.remoteSites[remoteRoomName].assignedTruckerIds = updatedAssignedTruckers;
        }
    }
}
