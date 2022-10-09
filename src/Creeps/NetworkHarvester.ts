import { stat } from "fs";
import CreepRole from "Models/CreepRole";
import { Process } from "Models/Process";
import { RoomStatistics } from "Models/RoomStatistics";
import { LogLevel, ProcessPriority, ProcessResult, Role, Task } from "utils/Enums";
import { Utils } from "utils/Index";
import { Logger } from "utils/Logger";

export class NetworkHarvester extends CreepRole {
    readonly baseBody = [CARRY, MOVE, MOVE, WORK, WORK]
    readonly segment = [WORK]
    readonly partLimits = [5]

    dispatch(room: Room): void {
        let networkHarvesters = room.localCreeps.nHarvester;
        for (let harv of networkHarvesters) {
            if (!harv.memory.task) {
                global.scheduler.swapProcess(harv, Task.nHARVESTING);
            }
        }
    }

    quantityWanted(room: Room, rolesNeeded: Role[], min?: boolean | undefined): number {
        if (min && min == true) return 0;

        let networkHarvesters = rolesNeeded.filter(x => x == Role.nHARVESTER).length
        let remotes = room.memory.remoteSites || {}
        let sourceCount = 0

        for (let remoteName in remotes) {
            let remote = remotes[remoteName]
            sourceCount += remote.sourceIds ? remote.sourceIds.length : 0
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

                if (!creep.memory.remoteTarget) {
                    NetworkHarvester.setRemoteSource(creep.room, creep)
                }

                let remoteTarget = creep.memory.remoteTarget
                if (remoteTarget) {
                    let targetRoom = new RoomPosition(25, 25, Object.keys(remoteTarget)[0])

                    if (creep.pos.roomName != targetRoom.roomName) {
                        creep.travel(targetRoom)
                    } else {
                        let target = Game.getObjectById(remoteTarget[targetRoom.roomName])
                        if (target) {
                            creep.mine(target)
                        }
                    }
                }

                if (creep.ticksToLive&& creep.memory.remoteTarget && creep.ticksToLive < 1) {
                    let remoteRoomName = Object.keys(creep.memory.remoteTarget)[0]
                    let remoteRoom = Game.rooms[remoteRoomName]
                    if (remoteRoom && remoteRoom.memory.remoteSites) {
                        let remoteHarvesters = remoteRoom.memory.remoteSites[remoteRoomName].assignedHarvesters
                        remoteRoom.memory.remoteSites[remoteRoomName].assignedHarvesters.splice(remoteHarvesters.indexOf(creep.id), 1)
                    }
                }

                return ProcessResult.RUNNING
            }

            creep.memory.task = Task.nHARVESTING
            let newProcess = new Process(creep.name, ProcessPriority.LOW, networkHarvesterTask)
            global.scheduler.addProcess(newProcess)
        }
    }

    private static setRemoteSource(baseRoom: Room, creep: Creep) {
        if (!baseRoom.memory.remoteSites) return
        this.validateRemoteHarvesters(baseRoom)

        let stationedNetHarvs = baseRoom.stationedCreeps.nHarvester
        let remotes = baseRoom.memory.remoteSites || {}

        let harvesterSourceTarget: { [roomName: string]: Id<any> } = {}

        for (let remote in remotes) {
            let harvsAssignedToRemote = stationedNetHarvs.filter(x => x.memory.remoteTarget && Object.keys(x.memory.remoteTarget).includes(remote))
            let sourceIds = remotes[remote].sourceIds

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
}

