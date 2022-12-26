import { TRACE } from "Constants/LogConstants";
import { LOW } from "Constants/ProcessPriorityConstants";
import { FATAL, RUNNING } from "Constants/ProcessStateConstants";
import { Role, nHARVESTER } from "Constants/RoleConstants";
import { nHARVESTING_EARLY, nHARVESTING_LATE, Task } from "Constants/TaskConstants";
import CreepRole from "Models/CreepRole";
import { Process } from "Models/Process";
import { Utils } from "utils/Index";
export class NetworkHarvester extends CreepRole {
    readonly baseBody = NetworkHarvester.baseBody;
    readonly segment = NetworkHarvester.segment;
    readonly partLimits = NetworkHarvester.partLimits;
    static baseBody = [CARRY, MOVE, WORK];
    static segment = [CARRY, MOVE, WORK];
    static partLimits = [6, 6];


    dispatch(room: Room): void {
        let networkHarvesters = room.stationedCreeps.nHarvester;
        for (let harv of networkHarvesters) {
            if (!room.storage) {
                if (!harv.memory.task) global.scheduler.swapProcess(harv, nHARVESTING_EARLY)
            } else {
                if (!harv.memory.task || (harv.memory.task && harv.memory.task == nHARVESTING_EARLY)) global.scheduler.swapProcess(harv, nHARVESTING_LATE)
            }
        }
    }

    quantityWanted(room: Room, rolesNeeded: Role[], min?: boolean | undefined): number {
        if (min && min == true) return 0;

        let networkHarvesters = rolesNeeded.filter(x => x == nHARVESTER).length
        let remotes = room.memory.remoteSites || {}

        if (!this[room.spawnEnergyLimit]) this[room.spawnEnergyLimit] = Utils.Utility.getBodyFor(room, this.baseBody, this.segment, this.partLimits);
        let workCount = this[room.spawnEnergyLimit].filter(p => p == WORK).length

        let finalCount = 0
        for (let remoteName in remotes) {
            let remote = remotes[remoteName]

            // Set total work per source needed
            let sourceWorkNeeded = 3
            let remoteRoom = Game.rooms[remoteName]
            if (remoteRoom) {
                if (remoteRoom.controller?.reservation && remoteRoom.controller.reservation.username === room.controller?.owner?.username) sourceWorkNeeded = 6
                if (!remoteRoom.controller && remoteRoom.keeperLairs.length > 0) sourceWorkNeeded = 7;
            }
            let shouldBe = Math.ceil(sourceWorkNeeded / workCount);

            for (let sourceId in remote) {
                if (['assignedHarvIds', 'assignedTruckerIds', 'assignedEngIds'].indexOf(sourceId) >= 0) continue;
                let sourceDetail = remote[sourceId as Id<Source>]
                if (room.storage || !sourceDetail.dist) {
                    if (shouldBe > sourceDetail.posCount) {
                        finalCount += sourceDetail.posCount
                    } else {
                        finalCount += shouldBe
                    }
                } else {
                    const timeToFill = Math.ceil((50 / (workCount * 2)) * 2);
                    const usedFactor = Math.ceil(((sourceDetail.dist * 2) + (timeToFill * 2)) / timeToFill);
                    finalCount += shouldBe * usedFactor;
                }

            }
        }

        return networkHarvesters < finalCount ? finalCount - networkHarvesters : 0;
    }

    preSpawnBy(room: Room, spawn: StructureSpawn, creep?: Creep): number {
        if (!room || !room.memory.remoteSites || !room.controller || !creep || !creep.memory.remoteTarget || !creep.memory.remoteTarget[0]) return 0;
        // Fetch distance from remoteSites
        let dist = room.memory.remoteSites[creep.memory.remoteTarget[0].roomName][creep.memory.remoteTarget[0].targetId].dist;
        if (!dist) return 0;
        return dist;
    }

    readonly tasks: { [key in Task]?: (creep: Creep) => void } = {
        nHarvesting_early: function (creep: Creep) {
            let creepId = creep.id
            let creepName = creep.name;
            let homeRoom = creep.memory.homeRoom;

            const networkHarvestingEarlyTask = () => {
                let creep = Game.getObjectById(creepId)

                // Handle creep death assignment cleanup
                if (!creep || (creep.ticksToLive && creep.ticksToLive < 1)) {
                    let creepMemory = Memory.creeps[creepName];
                    if (!creepMemory || !creepMemory.remoteTarget) {
                        let remoteSites = Memory.rooms[homeRoom].remoteSites;
                        if (!remoteSites) return FATAL;
                        for (const remoteRoomName in remoteSites) {
                            let index = remoteSites[remoteRoomName].assignedHarvIds.indexOf(creepId);
                            if (index >= 0) remoteSites[remoteRoomName].assignedHarvIds.splice(index, 1);
                        }
                    } else {
                        // Use memory to precisely clean up remoteSites
                        let homeRoomMemory = Memory.rooms[creepMemory.homeRoom]
                        if (homeRoomMemory.remoteSites) {
                            let remoteDetail = homeRoomMemory.remoteSites[creepMemory.remoteTarget[0].roomName]
                            let index = remoteDetail.assignedHarvIds.indexOf(creepId);
                            if (index >= 0) remoteDetail.assignedHarvIds.splice(index, 1);
                        }
                    }
                    return FATAL;
                }

                if (creep.spawning) return RUNNING;

                if (!creep.memory.remoteTarget) {
                    NetworkHarvester.setRemoteSource(creep.room, creep)
                }

                // Switches working value if full or empty.
                if (creep.memory.working == undefined) creep.memory.working = false;
                if ((creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0 && creep.memory.working == true) ||
                    (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0 && creep.memory.working == false)) {
                    creep.memory.working = !creep.memory.working;
                    delete creep.memory.target;

                    // Check if full loop is completable.
                    if (creep.room.name === creep.memory.homeRoom && creep.room.memory.remoteSites && creep.memory.remoteTarget && creep.memory.remoteTarget[0]) {
                        const dist = creep.room.memory.remoteSites[creep.memory.remoteTarget[0].roomName][creep.memory.remoteTarget[0].targetId].dist;
                        if (dist && creep.ticksToLive && creep.ticksToLive < ((dist * 2) + (50 / (creep.workParts)))) creep.cache.shouldSuicide = true;
                    }
                }
                const working = creep.memory.working;

                // Handle EOL suicide / recycle
                if (creep.cache.shouldSuicide === true) {
                    // Find available spawn
                    if (!creep.memory.target) {
                        let spawn = creep.room.getNextAvailableSpawn;
                        if (spawn) creep.memory.target = spawn.id;
                    }
                    let spawn = creep.memory.target ? Game.getObjectById(creep.memory.target) : undefined;
                    if (!spawn || !Utils.Typeguards.isStructureSpawn(spawn)) {
                        creep.suicide();
                        return RUNNING;
                    }

                    if (creep.pos.roomName !== spawn.pos.roomName || creep.pos.getRangeTo(spawn) > 1) creep.travel(spawn);
                    else if (!spawn.spawning) spawn.recycleCreep(creep);
                    return RUNNING;
                }

                // Home Logic
                if (working) {
                    let controller = Game.rooms[creep.memory.homeRoom].controller
                    if (!controller) return FATAL
                    creep.praise(controller, false)
                }

                // Remote Logic
                if (!working) {
                    // TODO: Trigger cleanup if creepTarget || sourceInfo || target isn't defined.. No reason to repeatedly fail at the same location.
                    let creepTarget = creep.memory.remoteTarget ? creep.memory.remoteTarget[0] : undefined;
                    if (!creepTarget) return RUNNING;
                    let sourceInfo = Memory.rooms[creep.memory.homeRoom].remoteSites ? Memory.rooms[creep.memory.homeRoom].remoteSites![creepTarget.roomName][creepTarget.targetId] : undefined;
                    if (!sourceInfo) return RUNNING;
                    let remoteRoomPosition = Utils.Utility.unpackPostionToRoom(sourceInfo.packedPos, creepTarget.roomName);

                    if (creep.room.name != remoteRoomPosition.roomName) {
                        creep.travel(remoteRoomPosition)
                    } else {
                        let target = Game.getObjectById(creepTarget.targetId);
                        if (!target) return RUNNING;
                        let structures = target.pos.findInRange(FIND_STRUCTURES, 1, { filter: s => s.structureType == STRUCTURE_WALL })
                        if (structures.length > 0) {
                            creep.destroy(structures[0])
                        } else {
                            creep.mine(target)
                        }
                    }
                }

                return RUNNING
            }

            let newProcess = new Process(creep.name, LOW, networkHarvestingEarlyTask)
            global.scheduler.addProcess(newProcess)
        },
        nHarvesting_late: function (creep: Creep) {
            let creepId = creep.id
            let creepName = creep.name;
            let homeRoom = creep.memory.homeRoom;

            const networkHarvesterTask = () => {
                Utils.Logger.log("CreepTask -> networkHarvesterTask()", TRACE);
                let creep = Game.getObjectById(creepId)

                // Handle creep death assignment cleanup
                if (!creep || (creep.ticksToLive && creep.ticksToLive < 1)) {
                    let creepMemory = Memory.creeps[creepName];
                    if (!creepMemory || !creepMemory.remoteTarget) {
                        let remoteSites = Memory.rooms[homeRoom].remoteSites;
                        if (!remoteSites) return FATAL;
                        for (const remoteRoomName in remoteSites) {
                            let index = remoteSites[remoteRoomName].assignedHarvIds.indexOf(creepId);
                            if (index >= 0) remoteSites[remoteRoomName].assignedHarvIds.splice(index, 1);
                        }
                    } else {
                        // Use memory to precisely clean up remoteSites
                        let homeRoomMemory = Memory.rooms[creepMemory.homeRoom]
                        if (creepMemory.remoteTarget[0].roomName && homeRoomMemory.remoteSites) {
                            let remoteDetail = homeRoomMemory.remoteSites[creepMemory.remoteTarget[0].roomName];
                            if (!remoteDetail) return FATAL;
                            let index = remoteDetail.assignedHarvIds.indexOf(creepId);
                            if (index >= 0) remoteDetail.assignedHarvIds.splice(index, 1);
                        }
                    }

                    return FATAL;
                }

                if (creep.spawning) return RUNNING;

                if (!creep.memory.remoteTarget) {
                    NetworkHarvester.setRemoteSource(Game.rooms[creep.memory.homeRoom], creep)
                }

                let creepTarget = creep.memory.remoteTarget ? creep.memory.remoteTarget[0] : undefined
                let sourceInfo = creepTarget && Memory.rooms[creep.memory.homeRoom].remoteSites &&
                    Memory.rooms[creep.memory.homeRoom].remoteSites![creepTarget.roomName] ?
                    Memory.rooms[creep.memory.homeRoom].remoteSites![creepTarget.roomName][creepTarget.targetId] :
                    undefined;
                if (creepTarget && sourceInfo) {
                    let targetRoom = Utils.Utility.unpackPostionToRoom(sourceInfo.packedPos, creepTarget.roomName)

                    if (creep.pos.roomName != targetRoom.roomName) {
                        creep.travel(targetRoom)
                    } else {
                        let target = Game.getObjectById(creepTarget.targetId) as Source
                        if (target) {
                            let usedCapacity = creep.store.getUsedCapacity(RESOURCE_ENERGY)
                            let creepEnergyMax = creep.store.getCapacity(RESOURCE_ENERGY)

                            if (creep.pos.inRangeTo(target, 3)) {

                                let structures = target.pos.findInRange(FIND_STRUCTURES, 1, { filter: s => s.structureType == STRUCTURE_WALL })
                                if (structures.length > 0) {
                                    creep.destroy(structures[0])
                                } else {
                                    let doesContainerExist = NetworkHarvester.getContainer(target.pos) == undefined ? false : true

                                    if (doesContainerExist) {
                                        let shouldRepairContainer = NetworkHarvester.shouldRepairContainer(target.pos)
                                        if (shouldRepairContainer) {
                                            let container = NetworkHarvester.getContainer(target.pos)
                                            if (container) creep.work(container)
                                        }
                                    }

                                    // TODO: Check for existing construction site
                                    if (!doesContainerExist && creep.pos.inRangeTo(target, 1)) {
                                        let containerConstructionSite = target.pos.findInRange(FIND_CONSTRUCTION_SITES, 1)[0]
                                        if (!containerConstructionSite) creep.pos.createConstructionSite(STRUCTURE_CONTAINER)
                                        creep.work(containerConstructionSite)
                                    }

                                }
                            }

                            // Handle not being on container;
                            let container = NetworkHarvester.getContainer(target.pos)
                            if (container && creep.store.energy > (creep.store.getCapacity() * 0.8) && creep.pos.getRangeTo(container) > 0) creep.give(container, RESOURCE_ENERGY);

                            creep.mine(target)
                        }
                    }
                }

                return RUNNING
            }

            let newProcess = new Process(creep.name, LOW, networkHarvesterTask)
            global.scheduler.addProcess(newProcess)
        }
    }

    /**
     *
     * @param baseRoom The room to get the remote source from. Typically the home room.
     * @param creep The creep to assign the remote source to.
     * @returns void
     */
    static setRemoteSource(baseRoom: Room, creep: Creep) {
        if (!baseRoom.memory.remoteSites || !baseRoom) return
        let remotes = baseRoom.memory.remoteSites || {}

        // Prespawn targeting
        const matchingCreep = baseRoom.stationedCreeps.nHarvester.find((c) => c.name !== creep.name && (c.name.substring(0,6) ?? '1') === (creep.name.substring(0,6) ?? '0'))
        const matchingTarget = matchingCreep?.memory.remoteTarget ? matchingCreep.memory.remoteTarget[0] : undefined;
        if (matchingCreep && matchingTarget) {
            let remoteDetails = baseRoom.memory.remoteSites[matchingTarget.roomName]
            const sourceDetails = remoteDetails ? remoteDetails[matchingTarget.targetId] : undefined;
            // Determine creep priority level
            const priority = parseInt(creep.name.substring(3,5));
            const sourceWorkNeeded = this.getSourceWorkNeeded(baseRoom.name, matchingTarget.roomName);

            if (remoteDetails && sourceDetails && sourceDetails.dist && typeof priority === 'number') {
                // Get assigned Harvesters and work count;
                let assigned: Creep[] = [];
                for (const id of remoteDetails.assignedHarvIds) {
                    let nHa = Game.getObjectById(id);
                    if (!nHa) continue;
                    const nHaPriority = parseInt(nHa.name.substring(3,5));
                    if (nHa && nHaPriority < priority && nHa.memory.remoteTarget && nHa.memory.remoteTarget[0]?.targetId === matchingTarget.targetId) {
                        assigned.push(nHa);
                    } else {
                        // TODO: Reference cleanup function
                    }
                }
                let workCount = this.getTotalWorkAssigned(assigned);

                if (baseRoom.storage && sourceDetails.posCount > assigned.length && workCount < sourceWorkNeeded) {
                    if (this.assignRemote(creep, baseRoom, matchingTarget.roomName, matchingTarget.targetId) === OK) return;
                } else if (!baseRoom.storage && baseRoom.cache.spawnSchedules && sourceDetails.dist) {
                    if (this.preStorageAssignRemote(creep, baseRoom, sourceWorkNeeded, sourceDetails, assigned, matchingTarget.roomName, matchingTarget.targetId) === OK) return;
                }
            }
        }

        // TODO: Rebuild to handle multiple assigned targets
        if (!creep.memory.remoteTarget || creep.memory.remoteTarget.length <= 0) {
            for (let remoteRoomName in remotes) {
                let remoteDetails = remotes[remoteRoomName]

                for (let sourceId in remoteDetails) {
                    if (['assignedHarvIds', 'assignedTruckerIds', 'assignedEngIds'].indexOf(sourceId) >= 0) continue;
                    let sourceDetails = remoteDetails[sourceId as Id<Source>];

                    // Set total work per source expected
                    let sourceWorkNeeded = this.getSourceWorkNeeded(baseRoom.name, remoteRoomName);

                    // Get assigned Harvesters and work count;
                    let assigned: Creep[] = [];
                    for (const id in remoteDetails.assignedHarvIds) {
                        let harvID = remoteDetails.assignedHarvIds[id];
                        let nHa = Game.getObjectById(harvID);
                        if (nHa && nHa.memory.remoteTarget && nHa.memory.remoteTarget[0]?.targetId === sourceId) {
                            assigned.push(nHa);
                        } else {
                            // TODO: Reference cleanup function
                        }
                    }
                    let workCount = this.getTotalWorkAssigned(assigned);
                    if (baseRoom.storage && sourceDetails.posCount > assigned.length && workCount < sourceWorkNeeded) {
                        if (this.assignRemote(creep, baseRoom, remoteRoomName, sourceId as Id<Source>) === OK) return;
                    } else if (!baseRoom.storage && baseRoom.cache.spawnSchedules && sourceDetails.dist) {
                        if (this.preStorageAssignRemote(creep, baseRoom, sourceWorkNeeded, sourceDetails, assigned, remoteRoomName, sourceId as Id<Source>) === OK) return;
                    }
                }
            }
        }
    }

    private static getSourceWorkNeeded(homeRoomName: string, remoteRoomName: string): number {
        let sourceWorkNeeded = 3
        let remoteRoom = Game.rooms[remoteRoomName];
        let homeRoom = Game.rooms[homeRoomName];
        if (remoteRoom && homeRoom) {
            if (remoteRoom.controller?.reservation && remoteRoom.controller.reservation.username === homeRoom.controller?.owner?.username) sourceWorkNeeded = 6;
            if (!remoteRoom.controller && remoteRoom.keeperLairs.length > 0) sourceWorkNeeded = 7;
        }
        return sourceWorkNeeded;
    }

    private static preStorageAssignRemote(creep: Creep, homeRoom: Room, sourceWorkNeeded: number, sourceDetails: SourceDetails, assigned: Creep[], remoteRoomName: string, sourceId: Id<Source>): number {
        // Fetch eLimit
        if (!sourceDetails.dist) return ERR_INVALID_TARGET;
        let eLimit = homeRoom.cache.spawnSchedules && homeRoom.cache.spawnSchedules[0] ? homeRoom.cache.spawnSchedules[0].activeELimit : undefined;
        if (!eLimit) eLimit = homeRoom.spawnEnergyLimit;
        if (!eLimit) return ERR_INVALID_TARGET;

        // Get Body
        if (!this.prototype[eLimit]) this.prototype[eLimit] = Utils.Utility.getBodyFor(homeRoom, this.baseBody, this.segment, this.partLimits);
        let workCount = this.prototype[eLimit].filter(p => p == WORK).length

        // Calculate UsedFactor
        const timeToFill = Math.ceil(50 / (workCount * 2)) * 2;
        const usedFactor = Math.ceil(((sourceDetails.dist * 2) + (timeToFill * 2)) / timeToFill);

        // Set as target if passes checks
        if (workCount < (sourceWorkNeeded * usedFactor) && assigned.length < (sourceDetails.posCount * usedFactor)) {
            if (this.assignRemote(creep, homeRoom, remoteRoomName, sourceId as Id<Source>) === OK) return OK;
        }
        return ERR_INVALID_TARGET;
    }

    /** Assigns given remote to given creep */
    private static assignRemote(creep: Creep, homeRoom: Room, remoteRoomName: string, sourceId: Id<Source>): number {
        if (!homeRoom.memory.remoteSites) return ERR_INVALID_ARGS
        if (!creep.memory.remoteTarget) creep.memory.remoteTarget = [];
        creep.memory.remoteTarget.push({ roomName: remoteRoomName, targetId: sourceId })
        homeRoom.memory.remoteSites[remoteRoomName].assignedHarvIds.push(creep.id)
        return OK;
    }

    /**
     * Ensures that the remote memory matches the actual harvesters stationed from the base room.
     * @param baseRoom Typically the home room of the creep.
     */
    private static validateRemoteHarvesters(baseRoom: Room) {
        for (let remoteRoomName in baseRoom.memory.remoteSites) {
            let updatedAssignedHarvesters: Id<Creep>[] = []

            for (const nHaId of baseRoom.memory.remoteSites[remoteRoomName].assignedHarvIds) if (Game.getObjectById(nHaId) !== null) updatedAssignedHarvesters.push(nHaId);

            baseRoom.memory.remoteSites[remoteRoomName].assignedHarvIds = updatedAssignedHarvesters;
        }
    }

    /**
     *
     * @param sourcePos The position of the source to check the container.
     * @returns True if the container should be repaired, false if no container exists or the container hp is below 100%.
     */
    private static shouldRepairContainer(sourcePos: RoomPosition): boolean {
        let container = this.getContainer(sourcePos)
        return (container?.hits ?? 0) < (container?.hitsMax ?? 0)
    }

    /**
     *
     * @param sourcePos The position of the source to get the container for.
     * @returns a container object if one exists, otherwise undefined.
     */
    private static getContainer(sourcePos: RoomPosition): StructureContainer | undefined {
        let container = sourcePos.findInRange(FIND_STRUCTURES, 1, { filter: Utils.Typeguards.isStructureContainer })[0]
        return container
    }

    /**
     * Gets the total # of WORK parts for all harvesters in the sourceDetail.
     * @param sourceDetail The sourceDetail to get the total WORK parts for.
     * @returns The total # of WORK parts for all harvesters in the sourceDetail * 2
     */
    private static getTotalWorkAssigned(assigned: Creep[]): number {
        let harvWorkPartsCount = 0

        for (const creep of assigned) {
                harvWorkPartsCount += creep.workParts
        }

        return harvWorkPartsCount
    }
}

