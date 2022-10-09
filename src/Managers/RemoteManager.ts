import { Process } from "Models/Process"
import { RoomStatistics } from "Models/RoomStatistics"
import { LogLevel, ProcessPriority, ProcessResult } from "utils/Enums"
import { Logger } from "utils/Logger"

export default class RemoteManager {
    /**
     * Computes the maximum number of remotes to run.
     */
    private static get allowedNumberOfRemotes(): number {
        return 4
    }

    static scheduleRemoteMonitor(room: Room): void | ProcessResult {
        const roomId = room.name
        const remoteTask = () => {
            let room = Game.rooms[roomId]
            //If room doesn't have remotes, fetch them.
            //TODO: Modify so that remotes are added if the number of allowed remotes changes.
            if (!room.memory || !room.memory.remoteSites || Object.keys(room.memory.remoteSites).length < this.allowedNumberOfRemotes) {
                this.setRemotes(room)
            }
        }

        let process = new Process(`${room.name}_remote_monitor`, ProcessPriority.CRITICAL, remoteTask)
        global.scheduler.addProcess(process)
    }

    private static setRemotes(room: Room) {
        let roomsInMemory = Object.values(Memory.rooms).filter(x => x.intel)
        let roomFrontiers = room.memory.frontiers
        if (!roomFrontiers) { return }

        roomsInMemory.sort((a, b) => { return Game.map.getRoomLinearDistance(room.name, a.intel!.name) - Game.map.getRoomLinearDistance(room.name, b.intel!.name) })
        let selectedRemotes: RoomStatistics[] = []

        /**
         * Primary Pass - Looking for any rooms that contain two sources.
         */
        for (let roomIntel of roomsInMemory) {
            let intel = roomIntel.intel!
            let existsInFrontiers = roomFrontiers.includes(intel.name)

            if (existsInFrontiers) {
                if (selectedRemotes.length >= this.allowedNumberOfRemotes) break
                let sourceIds = intel.sourceIds
                let threatLevel = intel.threatLevel
                let distance = Game.map.getRoomLinearDistance(room.name, intel.name)

                if (sourceIds && sourceIds.length > 1 && threatLevel < 1 && distance < 3) {
                    selectedRemotes.push(intel)
                }

            }
        }

        /**
         * Fallback Pass If 2 Sources Don't Exist
         */
        for (let roomIntel of roomsInMemory) {
            let intel = roomIntel.intel!
            let existsInFrontiers = roomFrontiers.includes(intel.name)

            if (existsInFrontiers) {
                if (selectedRemotes.length >= this.allowedNumberOfRemotes) break
                let sourceIds = intel.sourceIds
                let threatLevel = intel.threatLevel
                let distance = Game.map.getRoomLinearDistance(room.name, intel.name)

                if (sourceIds && sourceIds.length > 0 && threatLevel < 1 && distance < 3) {
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
                sourceIds: [...remote.sourceIds ?? []],
                assignedHarvesters: [],
                assignedHaulers: [],
                assignedEngineers: [],
                assignedClaimers: []
            }
        }
    }
}
