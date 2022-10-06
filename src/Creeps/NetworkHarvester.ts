import NetworkCreepRole from "Models/NetworkCreepRole";
import { Process } from "Models/Process";
import { RoomStatistics } from "Models/RoomStatistics";
import { LogLevel, ProcessPriority, ProcessResult, Role, Task } from "utils/Enums";
import { Utils } from "utils/Index";
import { Logger } from "utils/Logger";

export class NetworkHarvester extends NetworkCreepRole {
    readonly baseBody = [CARRY, MOVE, MOVE, WORK, WORK]
    readonly segment = [WORK]
    readonly partLimits = [5]

    dispatch(room: Room): void {
        let networkHarvesters = room.localCreeps.network_harvester;
        for (let harv of networkHarvesters) {
            if (!harv.memory.task) {
                global.scheduler.swapProcess(harv, Task.NETWORK_HARVESTING);
            }
        }
    }

    quantityWanted(room: Room, rolesNeeded: Role[], min?: boolean | undefined): number {
        if (min && min == true) return 0;

        let networkHarvesters = rolesNeeded.filter(x => x == Role.NETWORK_HARVESTER).length
        let remotes = room.memory.remotes || []
        let sourceCount = 0

        for (let remote of remotes) {
            sourceCount += remote.sourcesIds ? remote.sourcesIds.length : 0
        }

        Logger.log(`Quantity Wanted: ${sourceCount - networkHarvesters}`, LogLevel.DEBUG)
        return sourceCount - networkHarvesters;
    }

    readonly tasks: { [key in Task]?: (creep: Creep) => void } = {
        network_harvesting: function (creep: Creep) {
            let creepId = creep.id

            const networkHarvesterTask = () => {
                Utils.Logger.log("CreepTask -> networkHarvesterTask()", LogLevel.TRACE);

                let creep = Game.getObjectById(creepId)
                if (!creep) {
                    Utils.Logger.log(creepId, LogLevel.FATAL);
                    return ProcessResult.FAILED;
                }

                let targetRoom: RoomPosition | undefined = undefined
                if (!creep.memory.target) {
                    Logger.log("Assigning Network Harvester", LogLevel.DEBUG)
                    NetworkCreepRole.assignNetwork(creep, Game.rooms[creep.memory.homeRoom])
                }

                if (creep.memory.remoteRoom) {
                    targetRoom = new RoomPosition(25, 25, creep.memory.remoteRoom)
                }

                /**
                 * I'm deciding to let this particular creep manage it's own assigmnents upon death.
                 */
                if (creep.ticksToLive && creep.ticksToLive <= 1) {
                    let remotes = Game.rooms[creep.memory.homeRoom].memory.remotes || []
                    for (let remote of remotes) {
                        if (remote.remoteAssignments?.sourceHarvesters) {
                            remote.remoteAssignments.sourceHarvesters.splice(remote.remoteAssignments.sourceHarvesters.indexOf(creep.id), 1)
                            break
                        }
                    }
                    Memory.rooms[creep.memory.homeRoom].remotes = remotes
                }

                if (targetRoom) {
                    if (creep.room.name != targetRoom.roomName) {
                        creep.travel(targetRoom)
                    } else {
                        let targetSource = Game.getObjectById(creep.memory.target ?? "" as Id<Source>)
                        if (targetSource) {
                            creep.mine(targetSource)
                        }
                    }
                }

                return ProcessResult.RUNNING
            }

            creep.memory.task = Task.NETWORK_HARVESTING
            let newProcess = new Process(creep.name, ProcessPriority.LOW, networkHarvesterTask)
            global.scheduler.addProcess(newProcess)
        }
    }


}

