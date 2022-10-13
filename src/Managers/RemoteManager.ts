import { Process } from "Models/Process"
import { RoomStatistics } from "Models/RoomStatistics"
import { LogLevel, ProcessPriority, ProcessResult } from "utils/Enums"

export default class RemoteManager {
    /**
     * Computes the maximum number of remotes to run.
     */
    private static get allowedNumberOfRemotes(): number {
        return 6
    }

    static scheduleRemoteMonitor(room: Room): void | ProcessResult {
        const roomId = room.name
        const remoteTask = () => {
            let room = Game.rooms[roomId]
            //If room doesn't have remotes, fetch them.
            //TODO: Modify so that remotes are added if the number of allowed remotes changes.
            if ((!room.memory ||
                !room.memory.remoteSites ||
                Object.keys(room.memory.remoteSites).length < this.allowedNumberOfRemotes) &&
                Game.time % 750 == 0 &&
                Game.cpu.bucket > 150) {
                this.setRemotes(room)
            }
        }

        let process = new Process(`${room.name}_remote_monitor`, ProcessPriority.CRITICAL, remoteTask)
        global.scheduler.addProcess(process)
    }

    private static setRemotes(room: Room) {
        let roomsInMemory = Object.values(Memory.rooms).filter(
            x => x.intel &&
                Game.map.getRoomLinearDistance(room.name, x.intel?.name ?? "") <= 3 &&
                x.intel && x.intel.sources &&
                x.intel.sources.length < 3
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
                let sourceIds = intel.sources
                let threatLevel = intel.threatLevel

                if (sourceIds && sourceIds.length > 0 && threatLevel < 1) {
                    if (selectedRemotes.includes(intel)) continue
                    selectedRemotes.push(intel)
                }
            }
        }

        //TODO: Add a pass that checks our remotes as they stand, if their PathFinder.path(x -> y) is greater than 4 * 50 = 200 then remove them and do a final pass.
        //TODO: Alternatively, create a function that checks via Pathfinder to and never allows it to be greater than 200.

        for (let remote of selectedRemotes) {
            if (!room.memory.remoteSites) room.memory.remoteSites = {}
            room.memory.remoteSites[remote.name] = {
                sourcePositions: remote.sources ?? [],
                assignedHarvesters: [],
                assignedTruckers: [],
                assignedEngineers: [],
                assignedClaimers: []
            }
        }
    }
}
