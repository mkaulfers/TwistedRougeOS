import CreepRole from "Models/CreepRole";
import { Process } from "Models/Process";
import { LogLevel, ProcessPriority, ProcessResult, Role, Task } from "utils/Enums";
import { Utils } from "utils/Index";
import { Harvester } from "./Harvester";

export class NetworkHarvester extends CreepRole {
    readonly baseBody = [CARRY, MOVE, WORK]
    readonly segment = [WORK, MOVE]
    readonly partLimits = [6, 6]

    dispatch(room: Room): void {
        let networkHarvesters = room.stationedCreeps.nHarvester;
        for (let harv of networkHarvesters) {
            if (!room.storage) {
                if (!harv.memory.task) global.scheduler.swapProcess(harv, Task.nHARVESTING_EARLY)
            } else {
                if (!harv.memory.task || (harv.memory.task && harv.memory.task == Task.nHARVESTING_EARLY)) global.scheduler.swapProcess(harv, Task.nHARVESTING)
            }
        }
    }

    quantityWanted(room: Room, rolesNeeded: Role[], min?: boolean | undefined): number {
        if (min && min == true) return 0;

        let networkHarvesters = rolesNeeded.filter(x => x == Role.nHARVESTER).length
        let remotes = room.memory.remoteSites || {}

        if (!this[room.spawnEnergyLimit]) this[room.spawnEnergyLimit] = Utils.Utility.getBodyFor(room, this.baseBody, this.segment, this.partLimits);
        let workCount = this[room.spawnEnergyLimit].filter(p => p == WORK).length
        let shouldBe = Math.ceil(6 / workCount);

        let finalCount = 0
        for (let remoteName in remotes) {
            let remote = remotes[remoteName]

            for (let sourceId in remote.sourceDetail) {
                let sourceDetail = remote.sourceDetail[sourceId as Id<Source>]
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
                if (!creep) return ProcessResult.FATAL;
                if (creep.spawning) return ProcessResult.RUNNING;

                if (!creep.memory.remoteTarget) {
                    NetworkHarvester.setRemoteSource(creep.room, creep)
                }

                //Switching Logic
                if (creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
                    creep.memory.working = false
                }

                if (creep.store.getUsedCapacity(RESOURCE_ENERGY) == 0) {
                    creep.memory.working = true
                }

                //Home Logic
                if (!creep.memory.working) {
                    let controller = Game.rooms[creep.memory.homeRoom].controller
                    if (!controller) return ProcessResult.FATAL
                    creep.praise(controller, false)
                }

                //Remote Logic
                if (creep.memory.working) {
                    let remoteTarget = creep.memory.remoteTarget
                    if (!remoteTarget) return ProcessResult.FATAL

                    let remoteName = Object.keys(remoteTarget)[0]
                    let remoteRoomPosition = new RoomPosition(remoteTarget[remoteName].x, remoteTarget[remoteName].y, remoteName)

                    if (creep.room.name != remoteRoomPosition.roomName) {
                        creep.travel(remoteRoomPosition)
                    } else {
                        let target = Game.getObjectById(remoteTarget[remoteName].targetId)
                        creep.mine(target)
                    }
                }

                return ProcessResult.RUNNING
            }

            let newProcess = new Process(creep.name, ProcessPriority.LOW, networkHarvestingEarlyTask)
            global.scheduler.addProcess(newProcess)
        },
        nHarvesting: function (creep: Creep) {
            let creepId = creep.id

            const networkHarvesterTask = () => {
                Utils.Logger.log("CreepTask -> networkHarvesterTask()", LogLevel.TRACE);

                let creep = Game.getObjectById(creepId)
                if (!creep) return ProcessResult.FATAL;
                if (creep.spawning) return ProcessResult.RUNNING;

                if (!creep.memory.remoteTarget) {
                    NetworkHarvester.setRemoteSource(creep.room, creep)
                }

                let remoteTarget = creep.memory.remoteTarget
                if (remoteTarget) {
                    let targetRoomName = Object.keys(remoteTarget)[0]
                    let targetRoom = new RoomPosition(remoteTarget[targetRoomName].x, remoteTarget[targetRoomName].y, targetRoomName)

                    if (creep.pos.roomName != targetRoom.roomName) {
                        creep.travel(targetRoom)
                    } else {
                        let target = Game.getObjectById(remoteTarget[targetRoom.roomName].targetId)
                        if (target) {
                            let usedCapacity = creep.store.getUsedCapacity(RESOURCE_ENERGY)
                            let creepEnergyMax = creep.store.getCapacity(RESOURCE_ENERGY)

                            if (creep.pos.inRangeTo(target, 1) && creep.memory.working) {
                                let doesContainerExist = NetworkHarvester.getContainer(target.pos) == undefined ? false : true

                                if (doesContainerExist) {
                                    let shouldRepairContainer = NetworkHarvester.shouldRepairContainer(target.pos)
                                    if (shouldRepairContainer) {
                                        let container = NetworkHarvester.getContainer(target.pos)
                                        if (container) creep.work(container)
                                    }
                                }

                                if (!doesContainerExist) {
                                    let containerConstructionSite = creep.pos.findInRange(FIND_CONSTRUCTION_SITES, 3)[0]
                                    if (!containerConstructionSite) creep.pos.createConstructionSite(STRUCTURE_CONTAINER)
                                    creep.work(containerConstructionSite)
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
                    let remoteRoom = Memory.rooms[remoteRoomName]
                    if (remoteRoom && remoteRoom.remoteSites) {
                        let creepTargetId = creep.memory.remoteTarget[remoteRoomName].targetId
                        let sourceDetail = remoteRoom.remoteSites[remoteRoomName].sourceDetail[creepTargetId]
                        let remoteHarvesters = sourceDetail.assignedHarvIds
                        sourceDetail.assignedHarvIds.splice(remoteHarvesters.indexOf(creep.id), 1)
                    }
                }

                return ProcessResult.RUNNING
            }

            let newProcess = new Process(creep.name, ProcessPriority.LOW, networkHarvesterTask)
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

        for (let remote in remotes) {
            let remoteSite = remotes[remote]
            let sourcesDetail = remoteSite.sourceDetail

            for (let sourceId in sourcesDetail) {
                let sourceDetail = sourcesDetail[sourceId as Id<Source>]

                //TODO: The 5 should be changed to a variable that is based on the source energy availability.
                if ((sourceDetail.posCount > sourceDetail.assignedHarvIds.length) && this.getTotalHarvEnergyHarvestedPerTick(sourceDetail) < 5) {
                    creep.memory.remoteTarget = {}
                    creep.memory.remoteTarget[remote] = { targetId: sourceId as Id<Source>, x: sourceDetail.x, y: sourceDetail.y }
                    baseRoom.memory.remoteSites[remote].sourceDetail[sourceId as Id<Source>].assignedHarvIds.push(creep.id)
                    return
                }
            }
        }
    }

    /**
     * Ensures that the remote memory matches the actual harvesters stationed from the base room.
     * @param baseRoom Typically the home room of the creep.
     */
    private static validateRemoteHarvesters(baseRoom: Room) {
        let updatedAssignedHarvesters: Id<any>[] = []

        for (let remote in baseRoom.memory.remoteSites) {
            let remoteSite = baseRoom.memory.remoteSites[remote]
            let sourcesDetail = remoteSite.sourceDetail

            for (let sourceId in sourcesDetail) {
                let sourceDetail = sourcesDetail[sourceId as Id<Source>]

                for (let harvId of sourceDetail.assignedHarvIds) {
                    let creep = Game.getObjectById(harvId)
                    if (creep) {
                        updatedAssignedHarvesters.push(creep.id)
                    }
                }

                baseRoom.memory.remoteSites[remote].sourceDetail[sourceId as Id<Source>].assignedHarvIds = updatedAssignedHarvesters
                updatedAssignedHarvesters = []
            }
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
    private static getTotalHarvEnergyHarvestedPerTick(sourceDetail: {
        posCount: number;
        x: number;
        y: number;
        assignedHarvIds: Id<Creep>[];
        assignedTruckerIds: Id<Creep>[];
        assignedEngIds: Id<Creep>[];
    }): number {
        let harvWorkPartsCount = 0

        for (let harv of sourceDetail.assignedHarvIds) {
            let creep = Game.creeps[harv]
            if (creep) {
                harvWorkPartsCount += creep.getActiveBodyparts(WORK)
            }
        }

        return harvWorkPartsCount * 2
    }
}

