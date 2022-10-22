import { CRITICAL } from "Constants/ProcessPriorityConstants"
import { ProcessState, FATAL, RUNNING } from "Constants/ProcessStateConstants"
import { Process } from "Models/Process"
import { RoomStatistics } from "Models/RoomStatistics"
export default class RemoteManager {
    /**
     * Computes the maximum number of remotes to run.
     */
    private static get allowedNumberOfRemotes(): number {
        return 6
    }

    static scheduleRemoteMonitor(room: Room): void | ProcessState {
        const roomId = room.name
        const remoteTask = () => {
            let room = Game.rooms[roomId]
            if (!room || !room.my) return FATAL;
            //If room doesn't have remotes, fetch them.
            //TODO: Modify so that remotes are added if the number of allowed remotes changes.
            if ((!room.memory ||
                !room.memory.remoteSites ||
                Object.keys(room.memory.remoteSites).length < this.allowedNumberOfRemotes) &&
                Game.time % 750 == 0 &&
                Game.cpu.bucket > 150) {
                this.setRemotes(room)
            }

            // Add remote room marker in cache
            if (Game.time % 50 === 0) {
                for (let roomName in room.memory.remoteSites) {
                    if (Cache.rooms[roomName] && !Cache.rooms[roomName].remoteOf) Cache.rooms[roomName].remoteOf = room.name;
                }
            }

            return RUNNING
        }

        let process = new Process(`${room.name}_remote_monitor`, CRITICAL, remoteTask)
        global.scheduler.addProcess(process)
    }

    private static setRemotes(room: Room) {
        let roomsInMemory = Object.values(Memory.rooms).filter(
            x => x.intel &&
                Game.map.getRoomLinearDistance(room.name, x.intel?.name ?? "") <= 3 &&
                x.intel && x.intel.sourceDetail &&
                Object.keys(x.intel.sourceDetail).length < 3
        )

        let roomFrontiers = room.memory.frontiers
        if (!roomFrontiers) { return }

        roomsInMemory.sort((a, b) => {
            if (!a.intel || !b.intel) { return 0 }
            let aPath = PathFinder.search(new RoomPosition(25, 25, room.name), { pos: new RoomPosition(25, 25, a.intel.name), range: 20 }).path
            let bPath = PathFinder.search(new RoomPosition(25, 25, room.name), { pos: new RoomPosition(25, 25, b.intel.name), range: 20 }).path
            return aPath.length - bPath.length
        })

        let selectedRemotes: RoomStatistics[] = []

        for (let roomIntel of roomsInMemory) {
            let intel = roomIntel.intel!
            let existsInFrontiers = roomFrontiers.includes(intel.name)

            if (existsInFrontiers) {
                if (selectedRemotes.length >= this.allowedNumberOfRemotes) break
                let sourceIds = intel.sourceDetail
                let threatLevel = intel.threatLevel

                if (sourceIds && Object.keys(sourceIds).length > 0 && threatLevel < 1) {
                    if (selectedRemotes.includes(intel)) continue
                    selectedRemotes.push(intel)
                }
            }
        }

        //TODO: Add a pass that checks our remotes as they stand, if their PathFinder.path(x -> y) is greater than 4 * 50 = 200 then remove them and do a final pass.
        //TODO: Alternatively, create a function that checks via Pathfinder to and never allows it to be greater than 200.
        for (let remote of selectedRemotes) {
            if (!Cache.rooms[remote.name].remoteOf) Cache.rooms[remote.name].remoteOf = room.name;
            if (!room.memory.remoteSites) room.memory.remoteSites = {}
            if (!room.memory.remoteSites[remote.name]) room.memory.remoteSites[remote.name] = {sourceDetail: {}}
            room.memory.remoteSites[remote.name].sourceDetail = remote.sourceDetail ?? {}
        }
    }
}
