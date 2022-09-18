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
            if (!room.memory.remotes || room.memory.remotes.length < this.allowedNumberOfRemotes) {
                room.memory.remotes = (this.fetchRemotes(room))
            }
        }

        let process = new Process(`${room.name}_remote_monitor`, ProcessPriority.CRITICAL, remoteTask)
        global.scheduler.addProcess(process)
    }

    private static fetchRemotes(room: Room): RoomStatistics[] {
        let rooms = Object.values(Memory.rooms)
        let remotes: RoomStatistics[] = []
        let frontiers = room.memory.frontiers
        if (!frontiers) {
            Logger.log("No Frontiers Found while fetching remotes.", LogLevel.FATAL)
            return []
        }

        //We should wait to set remotes until we have all rooms adjacent
        //to our owned room, so we can find any that MAY have 2 sources first.
        //Otherwise, we will return the first rooms with at least 1 source.
        if (rooms.length < this.ownedRooms.length * 9) return []

        for (let roomData of rooms) {
            let intel = roomData.intel
            if (!intel) continue
            let existsInFrontiers = frontiers.includes(intel.name)
            if (intel && existsInFrontiers) {
                let sourcesIds = intel.sourcesIds
                let threatLevel = intel.threatLevel

                if (sourcesIds && sourcesIds.length > 0 && threatLevel < 1) {
                    remotes.push(intel)
                }
            }

            if (remotes.length >= this.allowedNumberOfRemotes) break
        }

        return remotes
    }

    private static get ownedRooms(): string[] {
        let rooms: string[] = []

        for (let roomName in Game.rooms) {
            let room = Game.rooms[roomName]

            if (room.controller && room.controller.my) {
                rooms.push(roomName)
            }
        }

        return rooms
    }
}
