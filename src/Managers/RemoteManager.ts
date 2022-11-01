import { MOVE_OPTS_CIVILIAN } from "Constants/MoveOptsConstants"
import { HIGH } from "Constants/ProcessPriorityConstants"
import { ProcessState, FATAL, RUNNING } from "Constants/ProcessStateConstants"
import { nHARVESTER, nTRUCKER, RESERVER, Role } from "Constants/RoleConstants"
import { Process } from "Models/Process"
import { RoomStatistics } from "Models/RoomStatistics"
import { generatePath, MoveTarget } from "screeps-cartographer"
import { Utils } from "utils/Index"
export default class RemoteManager {

    private static _goal: number | undefined;

    /** Returns minimum profit a remote can generate and be kept operating. */
    private static get profitMin(): number {
        return 5000;
    }

    /** Returns maximum distance from the home room allowed. */
    private static get distMax(): number {
        return 200;
    }

    /**
     * Computes the maximum number of remotes to run.
     */
    private static goal(room: Room): number {

        // Catch Failure to have a spawn schedule at the time of checking.. If custom, return existing. If default, return 0;
        if (!room.cache.spawnSchedules || room.cache.spawnSchedules.length === 0) return this._goal ? this._goal : 0;

        // Default to 2 if undefined
        if (typeof this._goal !== 'number') this._goal = 2;

        // Spawn Availability
        let availableSpawntime = 0;
        let scheduled = 0;
        let wanted = 0;
        if (room.cache.spawnSchedules) {
            for (const spawnSchedule of room.cache.spawnSchedules) {
                availableSpawntime += (1500 * spawnSchedule.limiter) - spawnSchedule.usedSpace;
                scheduled += spawnSchedule.schedule.length;
                if (spawnSchedule.rolesNeeded && spawnSchedule.rolesNeeded.length > wanted) wanted = spawnSchedule.rolesNeeded.length;
            }
        }

        // CPU Availability
        const expenditureCPU = global.kernel.estimatedQueueCpuCost();
        let availableCPU = ((Game.cpu.limit * 0.9) - expenditureCPU) / Object.values(Game_Extended.myRooms).length;

        // TODO: Calculate actual average expenses.
        // Determine Average Spawn Expense Per Remote
        const spawnCost = 400;

        // Determine CPU Expense Per Remote
        const cpuCost = 10;

        // Handle adjustment
        if (availableCPU < 0) this._goal += Math.ceil(availableCPU / cpuCost);
        if (scheduled < wanted) this._goal--;
        else if (availableCPU > cpuCost) {
            this._goal += Math.floor(availableCPU / cpuCost);
        }

        // Ensure within bounds
        if (this._goal > 8) this._goal = 8;
        if (this._goal < 0) this._goal = 0;

        return this._goal;
    }

    static scheduleRemoteMonitor(room: Room): void | ProcessState {
        const roomId = room.name

        const remoteTask = () => {
            let room = Game.rooms[roomId]
            if (!room || !room.my) return FATAL;

            // Update Remotes when missing or time for updating
            if ((!room.memory || !room.memory.remoteSites || Game.time % 750 === 0) && Game.cpu.bucket > 150) this.setRemotes(room)

            // TODO: Modify to global room marker
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

    /** Reviews, then adds remotes when goal is not met. */
    private static setRemotes(room: Room) {

        // Handle memory guarantee
        if (!room.memory.remoteSites) room.memory.remoteSites = {}

        // Review existing remotes
        const goal = this.reviewRemotes(room);

        if (Object.keys(room.memory.remoteSites).length < goal) {
            // Determine rooms within range
            let roomNames = Utils.Utility.getRoomNamesInRange(room.name, 3);

            // Get homeRoom Status
            let status = Game.map.getRoomStatus(room.name).status;

            // Convert rooms within range to the memories of each room within range.
            let roomsInMemory: RoomMemory[] = [];
            for (const roomName of roomNames) {
                const roomMemory = Memory.rooms[roomName];
                if (!roomMemory || !roomMemory.intel) continue;
                if (Game.map.getRoomStatus(roomName).status !== status) continue;
                // Calculate details needed for consideration
                const potentialProfit = this.considerRemote(room, roomName);
                if (potentialProfit < this.profitMin) continue;

                // Add room intel to roomsInMemory
                roomsInMemory.push(roomMemory);
            }


            roomsInMemory.sort((a, b) => {
                if (!a.intel || !b.intel) { return 0 }
                let aPath = PathFinder.search(new RoomPosition(25, 25, room.name), { pos: new RoomPosition(25, 25, a.intel.name), range: 20 }).path
                let bPath = PathFinder.search(new RoomPosition(25, 25, room.name), { pos: new RoomPosition(25, 25, b.intel.name), range: 20 }).path
                return aPath.length - bPath.length
            })

            let selectedRemotes: RoomStatistics[] = []

            for (let roomIntel of roomsInMemory) {
                let intel = roomIntel.intel
                if (!intel) continue;

                if (selectedRemotes.length >= this.goal(room)) break
                let sourceIds = intel.sourceDetail
                let threatLevel = intel.threatLevel

                if (sourceIds && Object.keys(sourceIds).length > 0 && threatLevel < 1) {
                    if (selectedRemotes.includes(intel)) continue
                    selectedRemotes.push(intel)
                }
            }

            for (const remote of selectedRemotes) {
                if (!Cache.rooms[remote.name].remoteOf) Cache.rooms[remote.name].remoteOf = room.name;

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
    }

    /** Reviews existing remotes, checks profitability, and removes any excess remotes given goal or any that fall under profitability level minimums. */
    private static reviewRemotes(room: Room): number {
        return 0;
    }

    /** Sets path distance and carry parts required for each remote source. */
    private static setSourceProperties(room: Room, remoteRoomName: string, sourceDetails: SourceDetails, dist?: number) {
        // Determine source energy per tick
        let energyPerTick = 5;
        if (Game.rooms[remoteRoomName]?.controller?.reservation) energyPerTick = 10;
        if (Utils.Typeguards.isSourceKeeperRoom(remoteRoomName)) energyPerTick = 12;

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

    /** Considers the profitability, pathability, etc. of a potential remote. */
    private static considerRemote(room: Room, remoteRoomName: string): number {

        // Retrieve intel
        let intel = Memory.rooms[remoteRoomName]?.intel;
        if (!intel || !intel.sourceDetail) return 0;

        // Initiate source-specific variables
        let maxEnergy = 0;
        let maxEnergyReserved = 0;
        let containerCost = 0;
        let creepCost = 0;
        let creepCostReserved = 0;

        // Consider each source.
        for (const sourceId in intel.sourceDetail) {
            const sourceDetails = intel.sourceDetail[sourceId as Id<Source>];
            if (!sourceDetails) continue;
            sourceDetails.dist = undefined;
            sourceDetails.carryReq = undefined;
            this.setSourceProperties(room, remoteRoomName, sourceDetails);

            // Set Distance
            const dist = sourceDetails.dist;
            if (!dist || dist <= 0 || dist - 2 > this.distMax) continue;

            // Set Carry Requisite
            const carryReq = sourceDetails.carryReq;
            if (!carryReq || carryReq <= 0) continue;

            // Update profitability related variables
            if (!Utils.Typeguards.isSourceKeeperRoom(remoteRoomName)) {
                maxEnergy += 5;
                maxEnergyReserved += 10;
                creepCost += this.getPotSourceCreepCosts(room, sourceDetails, 5);
                creepCostReserved += this.getPotSourceCreepCosts(room, sourceDetails, 10);
            }
            else if (Utils.Typeguards.isCenterRoom(remoteRoomName)) {
                maxEnergy += 12;
                creepCost += this.getPotSourceCreepCosts(room, sourceDetails, 12);
            }
            containerCost += 0.5;
        }

        // Determine Max Energy Generation
        maxEnergy = maxEnergy * 1500;
        maxEnergyReserved = maxEnergyReserved * 1500;

        // Determine Container Costs
        containerCost = containerCost * 1500;

        // Set calculated values
        if (!Cache.rooms[remoteRoomName]) Cache.rooms[remoteRoomName] = {};
        Cache.rooms[remoteRoomName].remoteProfUnres = maxEnergy - (containerCost + creepCost);
        if (!Utils.Typeguards.isSourceKeeperRoom(remoteRoomName)) Cache.rooms[remoteRoomName].remoteProfRes = maxEnergy - (containerCost + creepCostReserved);

        return room.spawnEnergyLimit >= 650 && Cache.rooms[remoteRoomName].remoteProfRes ? (Cache.rooms[remoteRoomName].remoteProfRes ?? 0) : (Cache.rooms[remoteRoomName].remoteProfUnres ?? 0);
    }

    // TODO: Make automatically expandable. Idea: Function on CreepRole identifying if a remote creep? Not sure
    /** Returns Potential Creep Spawn Costs for a particular source in a remote room over a 1500 tick time. */
    private static getPotSourceCreepCosts(room: Room, sourceDetails: SourceDetails, energyPerTick: number): number {
        // Determine roles to consider
        let roles: Role[] = [nHARVESTER];

        return 0;
    }
}
