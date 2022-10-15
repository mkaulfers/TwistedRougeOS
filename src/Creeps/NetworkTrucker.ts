import { Process } from "Models/Process";
import { LogLevel, ProcessPriority, ProcessResult, Role, Task } from "utils/Enums";
import { Utils } from "utils/Index";
import { Logger } from "utils/Logger";
import { Trucker } from "./Trucker";

export class NetworkTrucker extends Trucker {
    readonly baseBody = [CARRY, CARRY, CARRY, MOVE, MOVE, MOVE]
    readonly segment = [MOVE, CARRY]

    dispatch(room: Room): void {
        let networkHaulers = room.stationedCreeps.nTrucker;
        for (let hauler of networkHaulers) {
            if (hauler.memory.working == true && hauler.memory.task != Task.TRUCKER_STORAGE) {
                Logger.log(`Setting Task to Trucker_Storage`, LogLevel.DEBUG)
                global.scheduler.swapProcess(hauler, Task.TRUCKER_STORAGE)
            }

            if (!hauler.memory.task || (hauler.memory.working == false && hauler.memory.task != Task.nTRUCKER)) {
                Logger.log(`Setting Task to nTrucker`, LogLevel.DEBUG)
                global.scheduler.swapProcess(hauler, Task.nTRUCKER)
            }
        }
    }

    quantityWanted(room: Room, rolesNeeded: Role[], min?: boolean): number {
        // return 0;
        if (min && min == true) return 0;

        let networkHaulers = rolesNeeded.filter(x => x == Role.nTRUCKER).length
        let remotes = room.memory.remoteSites || {}
        let sourceCount = 0

        for (let remoteName in remotes) {
            let remote = remotes[remoteName]
            sourceCount += remote.sourcePositions ? remote.sourcePositions.length : 0
        }

        return sourceCount - networkHaulers;
    }

    readonly tasks: { [key in Task]?: (creep: Creep) => void } = {
        trucker_storage: function(creep: Creep) {
            let creepId = creep.id

            const truckerHarvesterTask = () => {
                Utils.Logger.log("CreepTask -> truckerHarvesterTask()", LogLevel.TRACE)
                let creep = Game.getObjectById(creepId);
                if (!creep) return ProcessResult.FAILED;
                if (creep.spawning) return ProcessResult.RUNNING;

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
                        if (!creep.memory.target) return ProcessResult.RUNNING;
                    }
                    let target = Game.getObjectById(creep.memory.target);

                    if (!target ||
                        'store' in target && target.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
                        delete creep.memory.target;
                        return ProcessResult.RUNNING;
                    }

                    // Runs give and returns running or incomplete based on return value
                    var result = creep.give(target, RESOURCE_ENERGY);
                    if (result === OK) {
                        if (creep.store.energy > 0 && creep.pos.getRangeTo(target) == 1 || target.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
                            Trucker.storageTruckerWorkingTargeting(creep);
                            let newTarget = Game.getObjectById(creep.memory.target);
                            if (target.id !== creep.memory.target && newTarget && creep.pos.getRangeTo(newTarget) > 1) creep.moveToDefault(newTarget);
                        }
                        return ProcessResult.RUNNING
                    }
                    Utils.Logger.log(`${creep.name} generated error code ${result} while transferring.`, LogLevel.ERROR)
                    return ProcessResult.INCOMPLETE
                }
            }

            creep.memory.task = Task.TRUCKER_STORAGE
            let newProcess = new Process(creep.name, ProcessPriority.LOW, truckerHarvesterTask)
            global.scheduler.addProcess(newProcess)
        },
        nTrucker: function (creep: Creep) {
            let creepId = creep.id

            const networkHaulerTask = () => {
                let creep = Game.getObjectById(creepId)
                if (!creep) {
                    Utils.Logger.log(creepId, LogLevel.FATAL);
                    return ProcessResult.FAILED;
                }
                if (creep.spawning) return ProcessResult.RUNNING;

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
                        let remoteHarvesters = remoteRoom.remoteSites[remoteRoomName].assignedTruckers
                        remoteRoom.remoteSites[remoteRoomName].assignedTruckers.splice(remoteHarvesters.indexOf(creep.id), 1)
                    }
                }

                return ProcessResult.RUNNING;
            }

            let newProcess = new Process(creep.name, ProcessPriority.LOW, networkHaulerTask)
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

        let stationedNetTruckers = baseRoom.stationedCreeps.nTrucker
        let remotes = baseRoom.memory.remoteSites || {}

        let sourceTarget: { [roomName: string]: { targetId: Id<any>, x: number, y: number } } = {}

        for (let remote in remotes) {
            let truckersAssignedToRemote = stationedNetTruckers.filter(x => x.memory.remoteTarget && Object.keys(x.memory.remoteTarget).includes(remote))
            let sourceIds = [...remotes[remote].sourcePositions]

            for (let assignedTrucker of truckersAssignedToRemote) {
                if (!assignedTrucker.memory.remoteTarget) continue
                sourceIds.splice(sourceIds.indexOf(assignedTrucker.memory.remoteTarget[remote]), 1)
            }

            if (sourceIds.length > 0) {
                sourceTarget[remote] = sourceIds[0]
                creep.memory.remoteTarget = sourceTarget
                baseRoom.memory.remoteSites[remote].assignedTruckers.push(creep.id)
                return
            }
        }
    }

    private static validateRemoteTruckers(baseRoom: Room) {
        let updatedAssignedTruckers: Id<any>[] = []

        for (let remote in baseRoom.memory.remoteSites) {
            let remoteSite = baseRoom.memory.remoteSites[remote]

            for (let trucker of remoteSite.assignedTruckers) {
                let creep = Game.getObjectById(trucker)
                if (creep) {
                    updatedAssignedTruckers.push(creep.id)
                }
            }

            baseRoom.memory.remoteSites[remote].assignedTruckers = updatedAssignedTruckers
            updatedAssignedTruckers = []
        }
    }
}
