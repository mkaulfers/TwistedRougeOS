import { TRACE } from 'Constants/LogConstants';
import { Utils } from 'utils/Index';
declare global {
    interface Source {
        assignablePosition(): RoomPosition | undefined
        /** Checks if the source is actually harvestable based on room state and effects. */
        canHarvest: boolean
        /** Checks if creeps assigned to source fully harvest the source. */
        fullyHarvesting: boolean
        /** FOR REMOTES ONLY: Checks if creeps assigned fully transport generated energy from source. */
        fullyTransporting: boolean
        /** Returns count of Resources of Energy adjacent to the Source. */
        nearbyEnergy: number
    }
}

export default class Source_Extended extends Source {
    assignablePosition(): RoomPosition | undefined {
        Utils.Logger.log("Source -> assignablePosition()", TRACE);
        let validPositions = this.pos.validPositions
        let assignedPositions = this.room.localCreeps.harvester.map(x => x.memory.assignedPos)
        let unassignedPositions = validPositions.filter(x => !assignedPositions.includes(Utils.Utility.packPosition(x)))
        // Logger.log(`Source ${this.id} has ${unassignedPositions.length} unassigned positions.`, DEBUG)
        return unassignedPositions[0]
    }

    // TODO: Add effect analysis
    private _canHarvest: boolean | undefined;
    get canHarvest(): boolean {
        if (!this._canHarvest) {
            let spawn = Object.values(Game.spawns)[0];
            if (!spawn || this.room.find(FIND_HOSTILE_CREEPS).length > 0) return this._canHarvest = false;
            this._canHarvest = false;
            switch (true) {
                case this.room.my:
                case !this.room.controller:
                case this.room.controller && !this.room.controller.owner && !this.room.controller.reservation:
                case this.room.controller && this.room.controller.reservation?.username === spawn.owner.username:
                    this._canHarvest = true;
            }
        }
        return this._canHarvest;
    }

    private _fullyHarvesting: boolean | undefined;
    get fullyHarvesting(): boolean {
        Utils.Logger.log("Source -> fullyHarvesting", TRACE);
        if (this._fullyHarvesting !== undefined) {
            return this._fullyHarvesting;
        } else if (this.room.my === true) {
            // Handle owned room
            let harvesters = this.room.localCreeps.harvester
            let harvestersAssignedHere: Creep[] = []

            for (let harvester of harvesters) {
                for (let position of this.pos.validPositions) {
                    if (harvester.memory.assignedPos == Utils.Utility.packPosition(position)) {
                        harvestersAssignedHere.push(harvester)
                    }
                }
            }

            let harvestablePerTick = 0
            for (let harvester of harvestersAssignedHere) {
                harvestablePerTick += harvester.workParts * 2
            }

            if (harvestablePerTick >= 10 || harvestersAssignedHere.length == this.pos.validPositions.length) {
                return this._fullyHarvesting = true;
            } else {
                return this._fullyHarvesting = false;
            }
        } else if (this.room.cache.remoteOf) {
            // Handle remote room
            // Get Harvesters Assigned
            let homeRoom = Game.rooms[this.room.cache.remoteOf];
            if (!homeRoom || !homeRoom.memory.remoteSites || !homeRoom.memory.remoteSites[this.room.name] || !homeRoom.memory.remoteSites[this.room.name][this.id]) return this._fullyHarvesting = false;
            let harvesterIds = homeRoom.memory.remoteSites[this.room.name].assignedHarvIds;

            // Get work needed
            let workNeeded = 3
            if (this.room.controller?.reservation) workNeeded = 6
            if (Utils.Typeguards.isSourceKeeperRoom(homeRoom.name)) workNeeded = 7

            // Get work present
            let workPresent = 0;
            for (const id of harvesterIds) {
                let har = Game.getObjectById(id);
                if (har && har.memory.remoteTarget && har.memory.remoteTarget[0].targetId === this.id) workPresent += har.workParts;
            }
            if (workPresent >= workNeeded) return this._fullyHarvesting = true;
            return this._fullyHarvesting = false;
        } else {
            return false;
        }
    }

    private _fullyTransporting: boolean | undefined;
    get fullyTransporting(): boolean {
        Utils.Logger.log("Source -> fullyTransporting", TRACE);

        if (!this._fullyTransporting) {
            // Handle failure modes
            if (!this.room.cache.remoteOf) return false;

            const homeRoom = Game.rooms[this.room.cache.remoteOf];
            const remoteSites = homeRoom.memory.remoteSites;
            if (!remoteSites) return false;

            let carryReq: number | undefined;
            let carryFound = 0;
            for (const remoteRoomName in remoteSites) {
                if (this.room.name !== remoteRoomName) continue;
                else {
                    const remoteDetails = remoteSites[remoteRoomName];
                    if (remoteDetails[this.id]) carryReq = remoteDetails[this.id].carryReq;
                    if (!carryReq) break;
                    for (const id of remoteDetails.assignedTruckerIds) {
                        let nTr = Game.getObjectById(id);
                        if (!nTr) continue;
                        if (nTr && nTr.carryParts && nTr.memory.remoteTarget && nTr.memory.remoteTarget[0]?.targetId === this.id) carryFound += nTr.carryParts;
                    }
                    break;
                }
            }
            if (!carryReq) return false;
            this._fullyTransporting = carryFound >= carryReq;
        }

        return this._fullyTransporting;
    }

    private _nearbyEnergy: number | undefined;
    get nearbyEnergy(): number {
        Utils.Logger.log("Source -> nearbyEnergy", TRACE);
        if (!this._nearbyEnergy) this._nearbyEnergy =this.pos.findInRange(FIND_DROPPED_RESOURCES, 1).filter(x => x.resourceType == RESOURCE_ENERGY).length
        return this._nearbyEnergy;
    }
}
