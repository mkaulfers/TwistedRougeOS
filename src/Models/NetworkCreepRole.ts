import { LogLevel, Role } from "utils/Enums";
import { Logger } from "utils/Logger";
import CreepRole from "./CreepRole";
import { RemoteAssignments } from "./RemoteAssignments";
import { RoomStatistics } from "./RoomStatistics";

export default abstract class NetworkCreepRole extends CreepRole {
    static assignNetwork(creep: Creep, fromRoom: Room) {
        let remotes = fromRoom.memory.remotes || []

            switch (creep.memory.role) {
                case Role.NETWORK_HARVESTER:
                    let unFulfilledRemote = this.getUnfulfilledRemote(creep.memory.role, fromRoom)
                    Logger.log(unFulfilledRemote?.name ?? "Remote Name Not Found", LogLevel.DEBUG)
                    if (unFulfilledRemote) {
                        let unFulfilledSource = this.getUnfulfilledSourceInRemote(unFulfilledRemote)

                        if (unFulfilledSource) {
                            creep.memory.target = unFulfilledSource
                            creep.memory.remoteRoom = unFulfilledRemote.name

                            let uneditedRemotes = Memory.rooms[fromRoom.name].remotes || []
                            let remoteAssignments = uneditedRemotes.find(r => r.name == unFulfilledRemote!.name)?.remoteAssignments || new RemoteAssignments()
                            if (!remoteAssignments.sourceHarvesters) remoteAssignments.sourceHarvesters = []
                            remoteAssignments.sourceHarvesters.push(creep.id)
                            uneditedRemotes.find(r => r.name == unFulfilledRemote!.name)!.remoteAssignments = remoteAssignments
                            Memory.rooms[fromRoom.name].remotes = uneditedRemotes
                        }
                    }

                    break
                case Role.NETWORK_HAULER:
                    throw new Error("Method not implemented.")
                case Role.NETWORK_ENGINEER:
                    throw new Error("Method not implemented.")
            }
    }

    private static getUnfulfilledRemote(byRole: Role, fromRoom: Room) {
        switch (byRole) {
            case Role.NETWORK_HARVESTER:



                let remotes = fromRoom.memory.remotes || []
                Logger.log(`${remotes.length}`, LogLevel.DEBUG)
                for (let remote of remotes) {
                    if (!remote.remoteAssignments) return remote
                    if (!remote.remoteAssignments.sourceHarvesters) return remote

                    if (remote.sourcesIds &&
                        remote.remoteAssignments.sourceHarvesters.length < remote.sourcesIds.length) {
                        Logger.log("Found unfulfilled remote", LogLevel.DEBUG)
                        return remote
                    }
                }




            case Role.NETWORK_HAULER:
                return undefined
            case Role.NETWORK_ENGINEER:
                return undefined
        }
        Logger.log("No unfulfilled remote found", LogLevel.DEBUG)
        return undefined
    }

    private static getUnfulfilledSourceInRemote(remoteRoom: RoomStatistics) {
        let assignedHarvesters = remoteRoom.remoteAssignments?.sourceHarvesters || []
        let sourceIds = remoteRoom.sourcesIds || []

        for (let netHarvester of assignedHarvesters) {
            let creep = Game.getObjectById(netHarvester as Id<Creep>)
            if (creep && creep.memory.target) {
                sourceIds.splice(sourceIds.indexOf(creep.memory.target), 1)
            }
        }

        return sourceIds.length > 0 ? sourceIds[0] as Id<Source> : undefined
    }

    // private static sourceWithoutAssignedNetworkHarvester(room: Room): Source | undefined {
    //     let network_harvesters = room.stationedCreeps.network_harvester
    //     let targetSource: Source | undefined = undefined
    //     for (let source of room.sources) {
    //         targetSource = source
    //         for (let network_harvester of network_harvesters) {
    //             if (network_harvester.memory.target == source.id) {
    //                 targetSource = undefined
    //                 break
    //             }
    //         }
    //     }

    //     return targetSource
    // }
}
