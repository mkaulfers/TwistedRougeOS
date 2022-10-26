import { DEBUG, TRACE, ERROR } from "Constants/LogConstants";
import { LOW } from "Constants/ProcessPriorityConstants";
import { FATAL, RUNNING, INCOMPLETE } from "Constants/ProcessStateConstants";
import { Role, nTRUCKER } from "Constants/RoleConstants";
import { nTRUCKER_TRANSPORTING, Task } from "Constants/TaskConstants";
import { Process } from "Models/Process";
import { Utils } from "utils/Index";
import { Logger } from "utils/Logger";
import { Trucker } from "./Trucker";
import { generatePath } from "screeps-cartographer";

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
        let sourceCount = 0

        for (let remoteName in remotes) {
            let remote = remotes[remoteName]
            if (!remote) continue;
            sourceCount += Object.keys(remote).length
        }

        return sourceCount - networkHaulers;
    }

    preSpawnBy(room: Room, spawn: StructureSpawn, creep?: Creep): number {
        if (!room || !spawn || !room.controller) return 0;
        // return avg path dist
        return room.averageDistanceFromSourcesToStructures;
    }

    readonly tasks: { [key in Task]?: (creep: Creep) => void } = {
        nTrucker_transporting: function (creep: Creep) {
            let creepId = creep.id

            const networkHaulerTask = () => {
                let creep = Game.getObjectById(creepId)
                if (!creep) return FATAL;
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
                }
                const working = creep.memory.working;

                if (working === false) {
                    // Get target within range 1 of source.
                    let remoteTarget = creep.memory.remoteTarget ? creep.memory.remoteTarget[0] : undefined
                    let remoteDetails = Memory.rooms[creep.memory.homeRoom].remoteSites && remoteTarget ? Memory.rooms[creep.memory.homeRoom].remoteSites![remoteTarget.roomName] : undefined
                    if (remoteTarget && remoteDetails) {
                        let remoteSourceTarget = Utils.Utility.unpackPostionToRoom(remoteDetails[remoteTarget.targetId].packedPos, remoteTarget.roomName);
                        if (creep.pos.roomName !== remoteSourceTarget.roomName || creep.pos.getRangeTo(remoteSourceTarget) > 3) {
                            creep.travel(remoteSourceTarget)
                        } else {
                            let container: StructureContainer | undefined = remoteSourceTarget.findInRange(creep.room.containers, 1)[0]
                            let resourceEnergy = remoteSourceTarget.findInRange(FIND_DROPPED_RESOURCES, 1, { filter: (r) => r.resourceType == RESOURCE_ENERGY })[0]
                            let selectedTarget: Resource<ResourceConstant> | Tombstone | AnyStoreStructure | undefined = undefined

                            if (resourceEnergy) selectedTarget = resourceEnergy
                            else if (container) selectedTarget = container

                            if (selectedTarget) creep.take(selectedTarget, RESOURCE_ENERGY)
                        }
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

                // TODO: Move to when creep is detected as missing to remove need to validate.
                // EOL target management
                if (creep.ticksToLive && creep.memory.remoteTarget && creep.ticksToLive < 1 && creep.hits >= creep.hitsMax / 2) {
                    let creepTarget = creep.memory.remoteTarget[0]
                    let homeRoomMemory = Memory.rooms[creep.memory.homeRoom]
                    if (homeRoomMemory.remoteSites) {
                        let remoteDetail = homeRoomMemory.remoteSites[creepTarget.roomName]
                        remoteDetail.assignedTruckerIds.splice(remoteDetail.assignedTruckerIds.indexOf(creep.id), 1)
                    }
                }

                return RUNNING;
            }

            let newProcess = new Process(creep.name, LOW, networkHaulerTask)
            global.scheduler.addProcess(newProcess)
        }
    }

    static setRemoteSource(baseRoom: Room, creep: Creep) {
        if (!baseRoom.memory.remoteSites) return
        this.validateRemoteTruckers(baseRoom)
        let remotes = baseRoom.memory.remoteSites || {}

        for (let remoteRoomName in remotes) {
            let remoteSite = remotes[remoteRoomName]

            for (let sourceId in remoteSite) {
                if (['assignedHarvIds', 'assignedTruckerIds', 'assignedEngIds'].indexOf(sourceId) >= 0) continue;

                if (remoteSite.assignedTruckerIds.length < (Object.keys(remoteSite).length - 3)) {
                    if (!creep.memory.remoteTarget) creep.memory.remoteTarget = [];
                    creep.memory.remoteTarget.push({ roomName: remoteRoomName, targetId: sourceId as Id<Source> })
                    baseRoom.memory.remoteSites[remoteRoomName].assignedTruckerIds.push(creep.id)
                    return;
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
