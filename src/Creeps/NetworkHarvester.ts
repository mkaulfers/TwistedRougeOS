import CreepRole from "Models/CreepRole";
import { Process } from "Models/Process";
import { LogLevel, ProcessPriority, ProcessResult, Role, Task } from "utils/Enums";
import { Utils } from "utils/Index";

export class NetworkHarvester extends CreepRole {
    readonly baseBody = [CARRY, MOVE, WORK]
    readonly segment = [WORK, MOVE]
    readonly partLimits = [6, 6]

    dispatch(room: Room): void {
        let networkHarvesters = room.stationedCreeps.nHarvester;
        for (let harv of networkHarvesters)
            if (!harv.memory.task) global.scheduler.swapProcess(harv, Task.nHARVESTING);
    }

    quantityWanted(room: Room, rolesNeeded: Role[], min?: boolean | undefined): number {
        if (min && min == true) return 0;

        let networkHarvesters = rolesNeeded.filter(x => x == Role.nHARVESTER).length
        let remotes = room.memory.remoteSites || {}
        let sourceCount = 0

        for (let remoteName in remotes) {
            let remote = remotes[remoteName]
            sourceCount += remote.sourcePositions ? remote.sourcePositions.length : 0
        }

        return sourceCount - networkHarvesters;
    }

    readonly tasks: { [key in Task]?: (creep: Creep) => void } = {
        nHarvesting: function (creep: Creep) {
            let creepId = creep.id

            const networkHarvesterTask = () => {
                Utils.Logger.log("CreepTask -> networkHarvesterTask()", LogLevel.TRACE);

                let creep = Game.getObjectById(creepId)
                if (!creep) {
                    Utils.Logger.log(creepId, LogLevel.FATAL);
                    return ProcessResult.FAILED;
                }
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
                        let remoteHarvesters = remoteRoom.remoteSites[remoteRoomName].assignedHarvesters
                        remoteRoom.remoteSites[remoteRoomName].assignedHarvesters.splice(remoteHarvesters.indexOf(creep.id), 1)
                    }
                }

                return ProcessResult.RUNNING
            }

            creep.memory.task = Task.nHARVESTING
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

        let stationedNetHarvs = baseRoom.stationedCreeps.nHarvester
        let remotes = baseRoom.memory.remoteSites || {}

        let harvesterSourceTarget: { [roomName: string]: { targetId: Id<any>, x: number, y: number } } = {}

        for (let remote in remotes) {
            let harvsAssignedToRemote = stationedNetHarvs.filter(x => x.memory.remoteTarget && Object.keys(x.memory.remoteTarget).includes(remote))
            let sourceIds = [...remotes[remote].sourcePositions]

            for (let assignedHarvester of harvsAssignedToRemote) {
                if (!assignedHarvester.memory.remoteTarget) continue
                sourceIds.splice(sourceIds.indexOf(assignedHarvester.memory.remoteTarget[remote]), 1)
            }

            if (sourceIds.length > 0) {
                harvesterSourceTarget[remote] = sourceIds[0]
                creep.memory.remoteTarget = harvesterSourceTarget
                baseRoom.memory.remoteSites[remote].assignedHarvesters.push(creep.id)
                return
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

            for (let harv of remoteSite.assignedHarvesters) {
                let creep = Game.getObjectById(harv)
                if (creep) {
                    updatedAssignedHarvesters.push(creep.id)
                }
            }

            baseRoom.memory.remoteSites[remote].assignedHarvesters = updatedAssignedHarvesters
            updatedAssignedHarvesters = []
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
}

