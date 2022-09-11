import { Process } from "Models/Process"
import { RemoteSite } from "Models/RemoteSite"
import { ProcessPriority, Role } from "utils/Enums"

export class RemoteManager {
    static scheduleRemoteMonitor(room: Room) {
        let roomName = room.name
        if (!Memory.intelligence) { return }

        const remoteMonitor = () => {
            let room = Game.rooms[roomName]
            if (!room.memory.remotes || room.memory.remotes.length < 4) {
                this.setRemotes(room)
            }
        }

        let newProcess = new Process(`${roomName}_remote_monitor`, ProcessPriority.MEDIUM, remoteMonitor)
        global.scheduler.addProcess(newProcess)
    }

    private static setRemotes(room: Room) {
        if (!room.memory.remotes || room.memory.remotes.length == 4) return
        let sites: RemoteSite[] = []
        room.memory.remotes = []

        if (room.memory.remotes) {
            for (let i = 0; i < room.memory.remotes.length; i++) {
                let site = room.memory.remotes[i]
                sites.push(site)
            }
        }

        let intelligence = Memory.intelligence
        for (let prospect of intelligence) {
            let remoteRoomName = prospect.name
            let controllerId = prospect.controllerId
            let sources = prospect.sourcesIds
            let playerDetail = prospect.playerDetail
            let reserved = playerDetail?.reserved
            let username = playerDetail?.username

            if (!sources || sources.length < 2) continue

            if (reserved) {
                if (username != room.controller?.owner?.username) continue
            }

            if (controllerId) {
                let controller = Game.getObjectById(controllerId as Id<StructureController>)
                if (controller && !controller.my) continue
            }

            let newSite = new RemoteSite(remoteRoomName, sources)
            Memory.intelligence = intelligence.filter(x => x.name != remoteRoomName)
            sites.push(newSite)

            if (sites.length == 4) break
        }

        room.memory.remotes = sites
    }

    private static abandonRemote(remoteRoomName: string, hostingRoom: Room) {
        let remotes = hostingRoom.memory.remotes
        if (!remotes) return
        remotes = remotes.filter((remote) => remote.roomName != remoteRoomName)
        this.setRemotes(hostingRoom)
    }

    private static assignCreepToRemote(remoteRoomName: string, hostingRoom: Room, creep: Creep) {
        if (creep.memory.role != Role.NETWORK_ENGINEER && creep.memory.role != Role.NETWORK_HARVESTER && creep.memory.role != Role.NETWORK_HAULER) return

        let remotes = hostingRoom.memory.remotes
        if (!remotes) return

        let remote = remotes.find((remote) => remote.roomName == remoteRoomName)
        if (!remote) return

        remotes = remotes.filter(x => x != remote)

        switch (creep.memory.role) {
            case Role.NETWORK_HARVESTER:
                remote.networkHarvesterIds.push(creep.id)
                break
            case Role.NETWORK_ENGINEER:
                remote.networkEngineerIds.push(creep.id)
                break
            case Role.NETWORK_HAULER:
                remote.networkHaulerIds.push(creep.id)
                break
        }
        remotes.push(remote)
        hostingRoom.memory.remotes = remotes
    }
}
