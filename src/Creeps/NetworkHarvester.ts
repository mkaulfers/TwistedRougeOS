import { TRACE } from "Constants/LogConstants";
import { LOW } from "Constants/ProcessPriorityConstants";
import { FATAL, RUNNING } from "Constants/ProcessStateConstants";
import { Role, nHARVESTER } from "Constants/RoleConstants";
import { nHARVESTING_EARLY, nHARVESTING_LATE, Task } from "Constants/TaskConstants";
import CreepRole from "Models/CreepRole";
import { Process } from "Models/Process";
import { Utils } from "utils/Index";
export class NetworkHarvester extends CreepRole {
    readonly baseBody = [CARRY, MOVE, WORK]
    readonly segment = [WORK, MOVE]
    readonly partLimits = [6, 6]

    dispatch(room: Room): void {
        let networkHarvesters = room.stationedCreeps.nHarvester;
        for (let harv of networkHarvesters) {
            if (!room.storage) {
                if (!harv.memory.task) global.scheduler.swapProcess(harv, nHARVESTING_EARLY)
            } else {
                if (!harv.memory.task || (harv.memory.task && harv.memory.task == nHARVESTING_EARLY)) global.scheduler.swapProcess(harv, nHARVESTING_LATE)
            }
        }
    }

    quantityWanted(room: Room, rolesNeeded: Role[], min?: boolean | undefined): number {
        if (min && min == true) return 0;

        let networkHarvesters = rolesNeeded.filter(x => x == nHARVESTER).length
        let remotes = room.memory.remoteSites || {}

        if (!this[room.spawnEnergyLimit]) this[room.spawnEnergyLimit] = Utils.Utility.getBodyFor(room, this.baseBody, this.segment, this.partLimits);
        let workCount = this[room.spawnEnergyLimit].filter(p => p == WORK).length

        let finalCount = 0
        for (let remoteName in remotes) {
            let remote = remotes[remoteName]

            // Set total work per source needed
            let sourceWorkNeeded = 3
            let remoteRoom = Game.rooms[remoteName]
            if (remoteRoom) {
                if (remoteRoom.controller?.reservation && remoteRoom.controller.reservation.username === room.controller?.owner?.username) sourceWorkNeeded = 6
                if (!remoteRoom.controller && remoteRoom.keeperLairs.length > 0) sourceWorkNeeded = 7;
            }
            let shouldBe = Math.ceil(sourceWorkNeeded / workCount);

            for (let sourceId in remote) {
                if (['assignedHarvIds', 'assignedTruckerIds', 'assignedEngIds'].indexOf(sourceId) >= 0) continue;
                let sourceDetail = remote[sourceId as Id<Source>]
                if (shouldBe > sourceDetail.posCount) {
                    finalCount += sourceDetail.posCount
                } else {
                    finalCount += shouldBe
                }
            }
        }

        return networkHarvesters < finalCount ? finalCount - networkHarvesters : 0;
    }

    readonly tasks: { [key in Task]?: (creep: Creep) => void } = {
        nHarvesting_early: function (creep: Creep) {
            let creepId = creep.id

            const networkHarvestingEarlyTask = () => {
                let creep = Game.getObjectById(creepId)
                if (!creep) return FATAL;
                if (creep.spawning) return RUNNING;

                if (!creep.memory.remoteTarget) {
                    NetworkHarvester.setRemoteSource(creep.room, creep)
                }

                // Switching Logic
                if (creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0) creep.memory.working = false
                if (creep.store.getUsedCapacity(RESOURCE_ENERGY) == 0) creep.memory.working = true

                // Home Logic
                if (!creep.memory.working) {
                    let controller = Game.rooms[creep.memory.homeRoom].controller
                    if (!controller) return FATAL
                    creep.praise(controller, false)
                }

                // Remote Logic
                if (creep.memory.working) {
                    // TODO: Trigger cleanup if creepTarget || sourceInfo || target isn't defined.. No reason to repeatedly fail at the same location.
                    let creepTarget = creep.memory.remoteTarget ? creep.memory.remoteTarget[0] : undefined;
                    if (!creepTarget) return RUNNING;
                    let sourceInfo = Memory.rooms[creep.memory.homeRoom].remoteSites ? Memory.rooms[creep.memory.homeRoom].remoteSites![creepTarget.roomName][creepTarget.targetId] : undefined;
                    if (!sourceInfo) return RUNNING;
                    let remoteRoomPosition = Utils.Utility.unpackPostionToRoom(sourceInfo.packedPos, creepTarget.roomName);

                    if (creep.room.name != remoteRoomPosition.roomName) {
                        creep.travel(remoteRoomPosition)
                    } else {
                        let target = Game.getObjectById(creepTarget.targetId);
                        if (!target) return RUNNING;
                        let structures = target.pos.findInRange(FIND_STRUCTURES, 1, { filter: s => s.structureType == STRUCTURE_WALL })
                        if (structures.length > 0) {
                            creep.destroy(structures[0])
                        } else {
                            creep.mine(target)
                        }
                    }
                }

                return RUNNING
            }

            let newProcess = new Process(creep.name, LOW, networkHarvestingEarlyTask)
            global.scheduler.addProcess(newProcess)
        },
        nHarvesting_late: function (creep: Creep) {
            let creepId = creep.id

            const networkHarvesterTask = () => {
                Utils.Logger.log("CreepTask -> networkHarvesterTask()", TRACE);

                let creep = Game.getObjectById(creepId)
                if (!creep) return FATAL;
                if (creep.spawning) return RUNNING;

                if (!creep.memory.remoteTarget) {
                    NetworkHarvester.setRemoteSource(creep.room, creep)
                }

                let creepTarget = creep.memory.remoteTarget ? creep.memory.remoteTarget[0] : undefined
                let sourceInfo = creepTarget && Memory.rooms[creep.memory.homeRoom].remoteSites ? Memory.rooms[creep.memory.homeRoom].remoteSites![creepTarget.roomName][creepTarget.targetId] : undefined;
                if (creepTarget && sourceInfo) {
                    let targetRoom = Utils.Utility.unpackPostionToRoom(sourceInfo.packedPos, creepTarget.roomName)

                    if (creep.pos.roomName != targetRoom.roomName) {
                        creep.travel(targetRoom)
                    } else {
                        let target = Game.getObjectById(creepTarget.targetId) as Source
                        if (target) {
                            let usedCapacity = creep.store.getUsedCapacity(RESOURCE_ENERGY)
                            let creepEnergyMax = creep.store.getCapacity(RESOURCE_ENERGY)

                            if (creep.pos.inRangeTo(target, 3)) {

                                let structures = target.pos.findInRange(FIND_STRUCTURES, 1, { filter: s => s.structureType == STRUCTURE_WALL })
                                if (structures.length > 0) {
                                    creep.destroy(structures[0])
                                } else {
                                    let doesContainerExist = NetworkHarvester.getContainer(target.pos) == undefined ? false : true

                                    if (doesContainerExist) {
                                        let shouldRepairContainer = NetworkHarvester.shouldRepairContainer(target.pos)
                                        if (shouldRepairContainer) {
                                            let container = NetworkHarvester.getContainer(target.pos)
                                            if (container) creep.work(container)
                                        }
                                    }

                                    if (!doesContainerExist && creep.pos.inRangeTo(target, 1)) {
                                        let containerConstructionSite = creep.pos.findInRange(FIND_CONSTRUCTION_SITES, 3)[0]
                                        if (!containerConstructionSite) creep.pos.createConstructionSite(STRUCTURE_CONTAINER)
                                        creep.work(containerConstructionSite)
                                    }

                                }
                            }

                            // False means the creep is now empty.
                            if ((creep.memory.working == undefined || creep.memory.working == true) && usedCapacity == 0) {
                                creep.memory.working = false
                            }

                            // True means the creep is now full.
                            if (creep.memory.working == false && usedCapacity == creepEnergyMax) {
                                creep.memory.working = true
                            }

                            creep.mine(target)
                        }
                    }
                }

                if (creep.ticksToLive && creep.memory.remoteTarget && creep.ticksToLive < 1 && creep.hits >= creep.hitsMax / 2) {
                    let remoteRoomName = Object.keys(creep.memory.remoteTarget)[0]
                    let homeRoomMemory = Memory.rooms[creep.memory.homeRoom]
                    if (homeRoomMemory.remoteSites) {
                        let remoteDetail = homeRoomMemory.remoteSites[remoteRoomName]
                        remoteDetail.assignedHarvIds.splice(remoteDetail.assignedHarvIds.indexOf(creep.id), 1)
                    }
                }

                return RUNNING
            }

            let newProcess = new Process(creep.name, LOW, networkHarvesterTask)
            global.scheduler.addProcess(newProcess)
        }
    }

    /**
     *
     * @param baseRoom The room to get the remote source from. Typically the home room.
     * @param creep The creep to assign the remote source to.
     * @returns void
     */
    static setRemoteSource(baseRoom: Room, creep: Creep) {
        if (!baseRoom.memory.remoteSites) return
        this.validateRemoteHarvesters(baseRoom)

        let remotes = baseRoom.memory.remoteSites || {}

        // TODO: Rebuild to handle multiple assigned targets
        for (let remoteRoomName in remotes) {
            let remoteDetails = remotes[remoteRoomName]

            for (let sourceId in remoteDetails) {
                if (['assignedHarvIds', 'assignedTruckerIds', 'assignedEngIds'].indexOf(sourceId) >= 0) continue;
                let sourceDetail = remoteDetails[sourceId as Id<Source>];

                // Set total work per source expected
                let sourceWorkNeeded = 3
                let remoteRoom = Game.rooms[remoteRoomName]
                if (remoteRoom) {
                    if (remoteRoom.controller?.reservation && remoteRoom.controller.reservation.username === baseRoom.controller?.owner?.username) sourceWorkNeeded = 6;
                    if (!remoteRoom.controller && remoteRoom.keeperLairs.length > 0) sourceWorkNeeded = 7;
                }

                // Get assigned Harvesters and work count;
                let assigned: Creep[] = [];
                for (const id of remoteDetails.assignedHarvIds) {
                    let nHa = Game.getObjectById(id);
                    if (nHa && nHa.memory.remoteTarget && nHa.memory.remoteTarget[0]?.targetId === sourceId) {
                        assigned.push(nHa);
                    } else {
                        // TODO: Reference cleanup function
                    }
                }
                let workCount = this.getTotalWorkAssigned(assigned);
                if (sourceDetail.posCount > assigned.length && workCount < sourceWorkNeeded) {
                    if (!creep.memory.remoteTarget) creep.memory.remoteTarget = [];
                    creep.memory.remoteTarget.push({ roomName: remoteRoomName, targetId: sourceId as Id<Source> })
                    baseRoom.memory.remoteSites[remoteRoomName].assignedHarvIds.push(creep.id)
                    return;
                }
            }
        }
    }

    /**
     * Ensures that the remote memory matches the actual harvesters stationed from the base room.
     * @param baseRoom Typically the home room of the creep.
     */
    private static validateRemoteHarvesters(baseRoom: Room) {
        for (let remoteRoomName in baseRoom.memory.remoteSites) {
            let updatedAssignedHarvesters: Id<Creep>[] = []

            for (const nHaId of baseRoom.memory.remoteSites[remoteRoomName].assignedHarvIds) if (Game.getObjectById(nHaId) !== null) updatedAssignedHarvesters.push(nHaId);

            baseRoom.memory.remoteSites[remoteRoomName].assignedHarvIds = updatedAssignedHarvesters;
        }
    }

    /**
     *
     * @param sourcePos The position of the source to check the container.
     * @returns True if the container should be repaired, false if no container exists or the container hp is below 100%.
     */
    private static shouldRepairContainer(sourcePos: RoomPosition): boolean {
        let container = this.getContainer(sourcePos)
        return (container?.hits ?? 0) < (container?.hitsMax ?? 0)
    }

    /**
     *
     * @param sourcePos The position of the source to get the container for.
     * @returns a container object if one exists, otherwise undefined.
     */
    private static getContainer(sourcePos: RoomPosition): Structure<STRUCTURE_CONTAINER> | undefined {
        let container = sourcePos.findInRange(FIND_STRUCTURES, 1, { filter: x => x.structureType == STRUCTURE_CONTAINER })[0]
        return container as Structure<STRUCTURE_CONTAINER> | undefined
    }

    /**
     * Gets the total # of WORK parts for all harvesters in the sourceDetail.
     * @param sourceDetail The sourceDetail to get the total WORK parts for.
     * @returns The total # of WORK parts for all harvesters in the sourceDetail * 2
     */
    private static getTotalWorkAssigned(assigned: Creep[]): number {
        let harvWorkPartsCount = 0

        for (const creep of assigned) {
                harvWorkPartsCount += creep.workParts
        }

        return harvWorkPartsCount
    }
}

