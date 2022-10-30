import { MOVE_OPTS_CIVILIAN } from "Constants/MoveOptsConstants"
import { HIGH } from "Constants/ProcessPriorityConstants"
import { ProcessState, FATAL, RUNNING } from "Constants/ProcessStateConstants"
import { Process } from "Models/Process"
import { RoomStatistics } from "Models/RoomStatistics"
import { generatePath, MoveTarget } from "screeps-cartographer"
import { Utils } from "utils/Index"
export default class RemoteManager {

    private static _goal: number | undefined;
    /**
     * Computes the maximum number of remotes to run.
     */
    private static get goal(): number {
        if (!this._goal) this._goal = 2;

        // Spawn Availability

        // CPU Availability

        // Handle adjustment and maxing

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
                Game.time % 750 === 0) &&
                Game.cpu.bucket > 150) {
                this.setRemotes(room)
            }

            // Add remote room marker in cache
            if (Cache.age === 0 || Game.time % 50 === 0) {
                for (let roomName in room.memory.remoteSites) {
                    if (Cache.rooms[roomName] && !Cache.rooms[roomName].remoteOf) Cache.rooms[roomName].remoteOf = room.name;
                }
            }

            // Run Creep Assignment Verification
            if (Game.time % 1500 === 0) {
                for (const remoteRoomName in room.memory.remoteSites) {
                    let remoteDetails = room.memory.remoteSites[remoteRoomName];
                    for (const id of [...remoteDetails.assignedEngIds]) {
                        if (!Game.getObjectById(id)) remoteDetails.assignedEngIds.splice(remoteDetails.assignedEngIds.indexOf(id), 1);
                    }

                    for (const id of [...remoteDetails.assignedHarvIds]) {
                        if (!Game.getObjectById(id)) remoteDetails.assignedHarvIds.splice(remoteDetails.assignedHarvIds.indexOf(id), 1);
                    }

                    for (const id of [...remoteDetails.assignedTruckerIds]) {
                        if (!Game.getObjectById(id)) remoteDetails.assignedTruckerIds.splice(remoteDetails.assignedTruckerIds.indexOf(id), 1);
                    }

                    // TODO: Add carry requisite updating
                    for (const key in remoteDetails) {
                        if (['assignedHarvIds', 'assignedTruckerIds', 'assignedEngIds'].indexOf(key) >= 0) continue;
                        let sourceDetails = remoteDetails[key as Id<Source>];
                        delete sourceDetails.dist;
                        delete sourceDetails.carryReq;
                        this.setSourceProperties(room, remoteRoomName, sourceDetails, sourceDetails.dist);
                    }
                }
            }
            return RUNNING
        }

        let process = new Process(`${room.name}_remote_monitor`, HIGH, remoteTask)
        global.scheduler.addProcess(process)
    }

    private static setRemotes(room: Room) {
        let roomsInMemory = Object.values(Memory.rooms).filter(
            x => x.intel &&
                Game.map.getRoomLinearDistance(room.name, x.intel.name ?? "") <= 3 &&
                x.intel && x.intel.sourceDetail &&
                Object.keys(x.intel.sourceDetail).length < 3
        )

        let roomFrontiers = room.memory.frontiers
        if (!roomFrontiers) { return }

        // TODO: Convert to number[] where each number is path dist, then sort referencing the new array via find or indexOf. This will cheapen this sorting significantly.
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
        for (const remote of selectedRemotes) {
            if (!Cache.rooms[remote.name].remoteOf) Cache.rooms[remote.name].remoteOf = room.name;
            if (!room.memory.remoteSites) room.memory.remoteSites = {}

            // Add dist and carryReq calculations.
            let sourcesDetails = {...remote.sourceDetail};
            for (const sourceDetails of Object.values(sourcesDetails)) {
                this.setSourceProperties(room, remote.name, sourceDetails);
            }

            if (!room.memory.remoteSites[remote.name]) {
                room.memory.remoteSites[remote.name] = {
                    ...sourcesDetails,
                    assignedHarvIds: [],
                    assignedTruckerIds: [],
                    assignedEngIds: [],
                };
            }
        }
    }

    private static setSourceProperties(room: Room, remoteRoomName: string, sourceDetails: SourceDetails, dist?: number) {
        // Determine source energy per tick
        let energyPerTick = 5;
        if (Game.rooms[remoteRoomName]?.controller?.reservation) energyPerTick = 10;
        if (Utils.Typeguards.isSourceKeeperRoom(remoteRoomName)) energyPerTick = 12;
        console.log(`remoteRoomName: ${remoteRoomName} found e/t/source: ${energyPerTick}`)

        // Determine start point
        let start: RoomPosition | undefined;
        if (room.storage) start = room.storage.pos;
        else if (room.spawns[0]) start = room.spawns[0].pos;
        else if (room.controller) start = room.controller.pos;
        if (!start) return;

        // Determine end point
        let end: MoveTarget[] = [{ pos: Utils.Utility.unpackPostionToRoom(sourceDetails.packedPos, remoteRoomName), range: 1 }];
        if (!end) return;

        // Set dist value
        dist = generatePath(start, end, MOVE_OPTS_CIVILIAN)?.length
        if (!dist || dist <= 0) return;
        if (dist && dist > 3) dist = dist - 2;
        sourceDetails.dist = dist;

        // Calculate and set carryReq
        let carryReq = Math.ceil(((dist * 2) * energyPerTick) / 50)
        if (!carryReq || carryReq <= 0) return;
        sourceDetails.carryReq = carryReq;
    }
}
