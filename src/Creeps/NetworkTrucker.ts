import { TRUCKER_STORAGE, DEBUG, nTRUCKER_TRANSPORTING, Role, nTRUCKER, Task, TRACE, FATAL, RUNNING, ERROR, INCOMPLETE, LOW } from "Constants";
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
            if (hauler.memory.working == true && hauler.memory.task != TRUCKER_STORAGE) {
                Logger.log(`Setting Task to Trucker_Storage`, DEBUG)
                global.scheduler.swapProcess(hauler, TRUCKER_STORAGE)
            }

            if (!hauler.memory.task || (hauler.memory.working == false && hauler.memory.task != nTRUCKER_TRANSPORTING)) {
                Logger.log(`Setting Task to nTrucker`, DEBUG)
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
            if (!remote || !remote.sourceDetail) continue;
            sourceCount += Object.keys(remote.sourceDetail).length
        }

        return sourceCount - networkHaulers;
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
                            if (target.id !== creep.memory.target && newTarget && creep.pos.getRangeTo(newTarget) > 1) creep.moveToDefault(newTarget);
                        }
                        return RUNNING
                    }
                    Utils.Logger.log(`${creep.name} generated error code ${result} while transferring.`, ERROR)
                    return INCOMPLETE
                }
                return RUNNING
            }

            creep.memory.task = TRUCKER_STORAGE
            let newProcess = new Process(creep.name, LOW, truckerHarvesterTask)
            global.scheduler.addProcess(newProcess)
        },
        nTrucker_transporting: function (creep: Creep) {
            let creepId = creep.id

            const networkHaulerTask = () => {
                let creep = Game.getObjectById(creepId)
                if (!creep) return FATAL;
                if (creep.spawning) return RUNNING;

                if (!creep.memory.remoteTarget) {
                    //Referencing the NetworkHarvester class to set the remote source
                    //This is a bit of a hack, but it works. ~CoPilot 2022
                    NetworkTrucker.setRemoteSource(creep.room, creep)
                } else {
                    // Creep is in remote room and energy is full.
                    // Working = false -> Creep is in the remote room or going to the remote room.
                    NetworkTrucker.remoteRoomLogic(creep)
                }

                if (creep.ticksToLive && creep.memory.remoteTarget && creep.ticksToLive < 1 && creep.hits >= creep.hitsMax / 2) {
                    let remoteRoomName = Object.keys(creep.memory.remoteTarget)[0]
                    let remoteRoom = Memory.rooms[remoteRoomName]
                    if (remoteRoom && remoteRoom.remoteSites) {
                        let creepTargetId = creep.memory.remoteTarget[remoteRoomName].targetId
                        let sourceDetail = remoteRoom.remoteSites[remoteRoomName].sourceDetail[creepTargetId]
                        let remoteTrucker = sourceDetail.assignedTruckerIds
                        sourceDetail.assignedHarvIds.splice(remoteTrucker.indexOf(creep.id), 1)
                    }
                }

                return RUNNING;
            }

            let newProcess = new Process(creep.name, LOW, networkHaulerTask)
            global.scheduler.addProcess(newProcess)
        }
    }

    private static remoteRoomLogic(creep: Creep): void {
        let remoteTargetKey = Object.keys(creep.memory.remoteTarget ?? {})[0]
        let remoteTarget = creep.memory.remoteTarget ? creep.memory.remoteTarget[remoteTargetKey] : undefined
        if (remoteTarget) {
            let remoteSourceTarget = new RoomPosition(remoteTarget.x, remoteTarget.y, remoteTargetKey)

            if (creep.pos.roomName != remoteSourceTarget.roomName || creep.pos.getRangeTo(remoteSourceTarget) > 3) {
                creep.travel(remoteSourceTarget)
            } else {
                let container: StructureContainer | undefined = remoteSourceTarget.findInRange(creep.room.containers, 1)[0]
                let resourceEnergy = remoteSourceTarget.findInRange(FIND_DROPPED_RESOURCES, 1, { filter: (r) => r.resourceType == RESOURCE_ENERGY })[0]
                let selectedTarget: Resource<ResourceConstant> | Tombstone | AnyStoreStructure | undefined = undefined

                //Dev Note: Reorganize this for priority.
                if (resourceEnergy) selectedTarget = resourceEnergy
                else if (container) selectedTarget = container

                if (selectedTarget) creep.take(selectedTarget, RESOURCE_ENERGY)
            }

            if (creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0) creep.memory.working = true
        }
    }

    static setRemoteSource(baseRoom: Room, creep: Creep) {
        if (!baseRoom.memory.remoteSites) return
        this.validateRemoteTruckers(baseRoom)

        let remotes = baseRoom.memory.remoteSites || {}

        for (let remote in remotes) {
            let remoteSite = remotes[remote]
            let sourcesDetail = remoteSite.sourceDetail

            for (let sourceId in sourcesDetail) {
                let sourceDetail = sourcesDetail[sourceId as Id<Source>]

                if (sourceDetail.assignedTruckerIds.length < 1) {
                    creep.memory.remoteTarget = {}
                    creep.memory.remoteTarget[remote] = { targetId: sourceId as Id<Source>, x: sourceDetail.x, y: sourceDetail.y }
                    baseRoom.memory.remoteSites[remote].sourceDetail[sourceId as Id<Source>].assignedTruckerIds.push(creep.id)
                    return
                }
            }
        }
    }

    private static validateRemoteTruckers(baseRoom: Room) {
        let updatedAssignedTruckers: Id<any>[] = []

        for (let remote in baseRoom.memory.remoteSites) {
            let remoteSite = baseRoom.memory.remoteSites[remote]
            let sourcesDetail = remoteSite.sourceDetail

            for (let sourceId in sourcesDetail) {
                let sourceDetail = sourcesDetail[sourceId as Id<Source>]

                for (let truckerId of sourceDetail.assignedTruckerIds) {
                    let creep = Game.getObjectById(truckerId)
                    if (creep) {
                        updatedAssignedTruckers.push(creep.id)
                    }
                }

                baseRoom.memory.remoteSites[remote].sourceDetail[sourceId as Id<Source>].assignedTruckerIds = updatedAssignedTruckers
                updatedAssignedTruckers = []
            }
        }
    }
}
