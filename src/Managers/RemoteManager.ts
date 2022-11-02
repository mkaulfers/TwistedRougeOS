import { MOVE_OPTS_CIVILIAN } from "Constants/MoveOptsConstants"
import { HIGH } from "Constants/ProcessPriorityConstants"
import { ProcessState, FATAL, RUNNING } from "Constants/ProcessStateConstants"
import { nHARVESTER, nTRUCKER, RESERVER, Role } from "Constants/RoleConstants"
import CreepClasses from "Creeps/Index"
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

                // Add room memory to roomsInMemory
                roomsInMemory.push(roomMemory);
            }

            roomsInMemory.sort((a, b) => {
                // Fetch Names
                let aName = a.intel?.name;
                let bName = b.intel?.name;
                if (!aName || !bName || !Cache.rooms[aName] || Cache.rooms[bName]) return 0;

                // Consider profitability
                let aProf = Cache.rooms[aName].remoteProfitability ?? 0;
                let bProf = Cache.rooms[bName].remoteProfitability ?? 0;
                return aProf - bProf;
            })

            // TODO: Delete this before release
            let logcheck = `roomsInMemory: `;
            for (const it of roomsInMemory) logcheck += `\n ${it.intel?.name}: ${it.intel?.name ? Cache.rooms[it.intel.name].remoteProfitability : undefined}`
            console.log(logcheck)

            let selectedRemotes: RoomMemory[] = []

            for (let roomMemory of roomsInMemory) {
                let intel = roomMemory.intel
                if (!intel) continue;

                if (selectedRemotes.length >= this.goal(room)) break
                let sourceIds = intel.sourceDetail
                let threatLevel = intel.threatLevel

                if (sourceIds && Object.keys(sourceIds).length > 0 && threatLevel < 1) {
                    if (selectedRemotes.includes(roomMemory)) continue
                    selectedRemotes.push(roomMemory)
                }
            }

            for (const remote of selectedRemotes) {
                const intel = remote.intel;
                if (!intel) continue;
                if (!Cache.rooms[intel.name].remoteOf) Cache.rooms[intel.name].remoteOf = room.name;

                // Add dist and carryReq calculations.
                let sourcesDetails = {...intel.sourceDetail};
                for (const sourceDetails of Object.values(sourcesDetails)) {
                    this.setSourceProperties(room, intel.name, sourceDetails);
                }

                if (!room.memory.remoteSites[intel.name]) {
                    room.memory.remoteSites[intel.name] = {
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
        let goal = this.goal(room);
        if (!room.memory.remoteSites) return goal;

        // Consider each remote
        let externalRemoteSites = { ...room.memory.remoteSites };
        for (const remoteRoomName in externalRemoteSites) {
            const remoteDetails = externalRemoteSites[remoteRoomName];

            // Calculate and Record Profitability

            // Generate max energy
            let gennedEnergy = 0;
            for (const id of remoteDetails.assignedHarvIds) {
                const nHa = Game.getObjectById(id);
                if (!nHa) continue;
                if (room.storage) gennedEnergy += nHa.workParts * 2;
                else {
                    // Adust gennedEnergy if still in pre-storage mode.
                    if (!nHa.memory.remoteTarget || !nHa.memory.remoteTarget[0]) continue;
                    const sourceDetails = remoteDetails[nHa.memory.remoteTarget[0].targetId];
                    if (!sourceDetails || !sourceDetails.dist) continue;
                    const timeToFill = Math.ceil((50 / (nHa.workParts * 2)) * 2);
                    const usedFactor = Math.ceil(((sourceDetails.dist * 2) + (timeToFill * 2)) / timeToFill);

                    gennedEnergy += ((nHa.workParts * 2) / usedFactor);
                }
            }

            // Determine energyPerTick
            let energyPerTick = 5;
            if (Game.rooms[remoteRoomName]?.controller?.reservation) energyPerTick = 10;
            if (Utils.Typeguards.isSourceKeeperRoom(remoteRoomName)) energyPerTick = 12;
            let maxEnergyPerTick = energyPerTick * (Object.keys(remoteDetails).length - 3);

            // Adjust gennedEnergy if greater than the sources can provide
            if (gennedEnergy > maxEnergyPerTick) gennedEnergy = maxEnergyPerTick;

            // Convert to Max Energy
            gennedEnergy *= 1500;

            // Limit Max Energy by logistical capabilities if in use.
            if (room.storage) {
                let logiMoves = 0;
                for (const id of remoteDetails.assignedTruckerIds) {
                    const nTr = Game.getObjectById(id);
                    if (!nTr) continue;
                    if (!nTr.memory.remoteTarget || !nTr.memory.remoteTarget[0]) continue;
                    const sourceDetails = remoteDetails[nTr.memory.remoteTarget[0].targetId];
                    if (!sourceDetails || !sourceDetails.dist) continue;
                    logiMoves += ((nTr.carryParts * 50) * Math.floor(1500 / (sourceDetails.dist * 2)));
                }

                if (gennedEnergy > logiMoves) gennedEnergy = logiMoves;
            }

            // Consider Container Maintenance Cost
            gennedEnergy -= ((Object.keys(remoteDetails).length - 3) * 0.5 * 1500)

            // Consider Creep Cost
            for (const id of [...remoteDetails.assignedHarvIds, ...remoteDetails.assignedTruckerIds]) {
                const creep = Game.getObjectById(id);
                if (!creep) continue;
                gennedEnergy -= Utils.Utility.bodyCost(creep.bodyArray);
            }

            // Consider Energy On Floor
            const remoteRoom = Game.rooms[remoteRoomName];
            if (room.storage && remoteRoom) {
                const droppedEnergyCount = remoteRoom.find(FIND_DROPPED_RESOURCES, { filter: (r) => r.resourceType === RESOURCE_ENERGY}).length;
                gennedEnergy -= droppedEnergyCount * 1500;
            }

            // TODO: Gotta remember when we abandon a room for this...
            // Consider Minimum and Remove Failing Rooms when twice failing.
            if (gennedEnergy < this.profitMin &&
                (Cache.rooms[remoteRoomName] &&
                Cache.rooms[remoteRoomName].remoteProfitability &&
                Cache.rooms[remoteRoomName].remoteProfitability! < this.profitMin)) delete room.memory.remoteSites[remoteRoomName]

        }

        // Sort remoteSites based on found profitability.

        // Remove worst remoteSites IFF necessary to lower count to goal.

        return goal;
    }

    /** Sets path distance and carry parts required for each remote source. */
    private static setSourceProperties(room: Room, remoteRoomName: string, sourceDetails: SourceDetails, dist?: number) {
        if (sourceDetails.dist && sourceDetails.carryReq) return;
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
        if (Utils.Typeguards.isSourceKeeperRoom(remoteRoomName) && !Utils.Typeguards.isCenterRoom(remoteRoomName)) return 0;

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
        const unreserved = maxEnergy - (containerCost + creepCost);
        let reserved = 0;
        if (!Utils.Typeguards.isSourceKeeperRoom(remoteRoomName)) reserved = maxEnergy - (containerCost + creepCostReserved);

        maxEnergy - (containerCost + creepCost);

        if (room.spawnEnergyLimit >= 650 && room.storage && reserved > (unreserved + (this.profitMin / 2))) {
            Cache.rooms[remoteRoomName].remoteProfitability = reserved;
            Cache.rooms[remoteRoomName].remoteState = 'reserved';
        } else {
            Cache.rooms[remoteRoomName].remoteProfitability = unreserved;
            Cache.rooms[remoteRoomName].remoteState = 'unreserved';
        }
        return Cache.rooms[remoteRoomName].remoteProfitability ?? 0;
    }

    /** Returns Potential Creep Spawn Costs for a particular source in a remote room over a 1500 tick time. */
    private static getPotSourceCreepCosts(room: Room, sourceDetails: SourceDetails, energyPerTick: number): number {

        let cost = 0;
            for (const role in CreepClasses) {
                const theRole = CreepClasses[role as Role];
                if (!theRole) continue;
                cost += theRole.costForRemoteSource(room, sourceDetails, energyPerTick);
            }

        return cost;
    }
}
