import { Process } from "Models/Process";
import { LogLevel, ProcessPriority, ProcessResult, Role, Task } from "utils/Enums";
import { Utils } from "utils/Index";
import { NetworkHarvester } from "./NetworkHarvester";
import { Trucker } from "./Trucker";

export class NetworkHauler extends Trucker {
    readonly baseBody = [CARRY, CARRY, CARRY, MOVE, MOVE, MOVE]
    readonly segment = [MOVE, CARRY]

    dispatch(room: Room): void {
        let networkHaulers = room.stationedCreeps.rHauler;
        for (let hauler of networkHaulers)
            if (!hauler.memory.task) global.scheduler.swapProcess(hauler, Task.nTRUCKER);
    }

    quantityWanted(room: Room, rolesNeeded: Role[], min?: boolean): number {
        if (min && min == true) return 0;

        let networkHaulers = rolesNeeded.filter(x => x == Role.nHAULER).length
        let remotes = room.memory.remoteSites || {}
        let sourceCount = 0

        for (let remoteName in remotes) {
            let remote = remotes[remoteName]
            sourceCount += remote.sourcePositions ? remote.sourcePositions.length : 0
        }

        return sourceCount - networkHaulers;
    }

    readonly tasks: { [key in Task]?: (creep: Creep) => void } = {
        nTrucker: function (creep: Creep) {
            let creepId = creep.id

            const networkHaulerTask = () => {
                let creep = Game.getObjectById(creepId)
                if (!creep) {
                    Utils.Logger.log(creepId, LogLevel.FATAL);
                    return ProcessResult.FAILED;
                }

                if (!creep.memory.remoteTarget) {
                    //Referencing the NetworkHarvester class to set the remote source
                    //This is a bit of a hack, but it works. ~CoPilot 2022
                    NetworkHarvester.setRemoteSource(creep.room, creep)
                } else {

                    // Creep is in home room and energy reached 0 or no working memory is set.
                    // Working = true -> Creep is in the in the home-room or going to the home room.
                    if (!creep.memory.working || (creep.memory.working === true)) {
                        NetworkHauler.homeRoomLogic(creep)
                    }

                    // Creep is in remote room and energy is full.
                    // Working = false -> Creep is in the remote room or going to the remote room.
                    if (creep.memory.working === false) {
                        NetworkHauler.remoteRoomLogic(creep)
                    }
                }

                if (creep.ticksToLive && creep.memory.remoteTarget && creep.ticksToLive < 1 && creep.hits >= creep.hitsMax / 2) {
                    let remoteRoomName = Object.keys(creep.memory.remoteTarget)[0]
                    let remoteRoom = Game.rooms[remoteRoomName]
                    if (remoteRoom && remoteRoom.memory.remoteSites) {
                        let remoteHarvesters = remoteRoom.memory.remoteSites[remoteRoomName].assignedHaulers
                        remoteRoom.memory.remoteSites[remoteRoomName].assignedHaulers.splice(remoteHarvesters.indexOf(creep.id), 1)
                    }
                }

                return ProcessResult.RUNNING;
            }

            let newProcess = new Process(creep.name, ProcessPriority.LOW, networkHaulerTask)
            global.scheduler.addProcess(newProcess)
        }
    }

    static homeRoomLogic(creep: Creep): void {
        let energy = creep.store.getFreeCapacity(RESOURCE_ENERGY)
        let homeRoom = Game.rooms[creep.memory.homeRoom]

        if (creep.pos.roomName != homeRoom.name && homeRoom.controller) {
            creep.travel(homeRoom.controller)
        } else {
            
        }

        if (energy == creep.store.getCapacity(RESOURCE_ENERGY)) creep.memory.working = false;
    }

    static remoteRoomLogic(creep: Creep): void {
        let energy = creep.store.getFreeCapacity(RESOURCE_ENERGY)
        let remoteTarget = creep.memory.remoteTarget![0]
        let remoteSourceTarget = new RoomPosition(remoteTarget.x, remoteTarget.y, Object.keys(remoteTarget)[0])

        if (creep.pos.roomName != remoteSourceTarget.roomName) {
            creep.travel(remoteSourceTarget)
        } else {
            let resourceEnergy = remoteSourceTarget.findInRange(FIND_DROPPED_RESOURCES, 1, { filter: (r) => r.resourceType == RESOURCE_ENERGY })[0]
            creep.take(resourceEnergy, RESOURCE_ENERGY)
        }

        if (energy == 0) creep.memory.working = true
    }
}
