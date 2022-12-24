// As a TargetManager I want to provide a queue of targets for creeps to utilize so that they can be more efficient in their work.
// A target consists of either a Source, ConstructionSite, Repair, Resouce, another Creep, etc...
// The targets should be kept in a global queue, and be able to be rebuilt in the event of a global reset.
// The target should be able to be marked completed and removed from the queue.
// The target queue should be updated everytime a target is marked completed.
// The target manager should expose a function .handleTarget(creep) that will tell a creep how to handle the target. (i.e. harvest, build, repair, etc...)
// The .handleTarget(creep) function should call .completeTarget() when the target is completed, and then provide a new target to the creep.

import { BUILD, Instruction, TRANSFER, UPGRADE } from "Constants/InstructionConstants";
import { DEBUG, ERROR, INFO } from "Constants/LogConstants";
import { FATAL } from "Constants/ProcessStateConstants";
import { Target } from "Models/Target";
import { Logger } from "utils/Logger";
import Typeguards from "utils/Typeguards";

// The target manager should expose a function .requestTarget(creep) that will tell a creep what target to go after.
export class TargetManager {
    public buildQueue: { [creepId: string]: Id<ConstructionSite>[] }
    public repairQueue: { [creepId: string]: Id<AnyStructure>[] }
    public energyNeededQueue: { [creepId: string]: (Id<AnyStoreStructure | Creep>)[] }
    public energyAvailableQueue: { [creepId: string]: (Id<Resource | Tombstone | Ruin | AnyStoreStructure>)[] }
    public remoteQueue: { [creepId: string]: RoomPosition[] }

    private buildSchedule: Id<ConstructionSite>[]
    private repairSchedule: Id<Structure>[]

    private energyNeededSchedule: {
        id: (Id<AnyStoreStructure | Creep>),
        energyNeeded: number
    }[]

    private energyAvailableSchedule: {
        id: (Id<Resource | Tombstone | Ruin | AnyStoreStructure>),
        energyAvailable: number
    }[]

    private remoteTargetSchedule: RoomPosition[]

    public getHomeTargets(forRoom: Room) {
        //Find targets for the room, add them to the queue.
        this.buildSchedule = this.getConstructionTargets(forRoom)
        this.repairSchedule = this.getRepairTargets(forRoom)
        this.energyNeededSchedule = this.getEnergyNeededTargets(forRoom)
        this.energyAvailableSchedule = this.getEnergyAvailableTargets(forRoom)
    }

    private getRemoteTargets(forRoom: Room) {
        //Find targets for the remote target and add it to the remote queue.
    }

    /**
     * Returns an array of targets that need engineers assigned.
     * @devNote This will need to be updated to handle progress and progressTotal in a meaningful way.
     * @param forRoom the room to get the construction targets for.
     * @returns ConstructionSite<BuildableStructureConstant>[]
     */
    private getConstructionTargets(forRoom: Room) {
        let cSites = forRoom.constructionSites()
        return cSites.map(c => c.id)
    }

    /**
     * Returns an array of targets that need a repair.
     * It is sorted based on % damaged from greatest damage to least.
     * The forumula is (hits * 100 / maxHits) = % damaged.
     * @devNote This will need to be updated to handle walls and ramparts in a meaningful way.
     * @param forRoom the room to get the energy available targets for.
     * @returns (Resource<ResourceConstant> | Tombstone | Ruin | AnyStoreStructure)[]
     */
    private getRepairTargets(forRoom: Room): Id<Structure>[] {
        let roomStructures = forRoom.structures()
        return roomStructures
            .filter(s => s.hits < s.hitsMax)
            .sort((a, b) => (a.hits * 100 / a.hitsMax) - (b.hits * 100 / b.hitsMax))
            .map(s => s.id)
    }

    /**
     * Returns an array of targets that need energy delivered.
     * The array is sorted in order Tower, Spawn, Extension, Container, Lab, Engineer, Scientist, Storage.
     * Each sub-section of the array, eg. Towers, are also sorted in order of most energy needed to least.
     * @param forRoom the room to get the energy needed targets for.
     * @returns (AnyStoreStructure | Creep)[]
     */
    private getEnergyNeededTargets(forRoom: Room): { id: (Id<AnyStoreStructure | Creep>), energyNeeded: number }[] {
        let targets: (AnyStoreStructure | Creep)[] = []

        let structurePriorityOrder = {
            STRUCTURE_TOWER,
            STRUCTURE_SPAWN,
            STRUCTURE_EXTENSION,
            STRUCTURE_CONTAINER,
            STRUCTURE_LAB,
            STRUCTURE_STORAGE
        }

        let roomStoreStructures = forRoom.structures()
            .filter(s => Typeguards.isAnyStoreStructure(s) && s.store.energy < s.store.getCapacity(RESOURCE_ENERGY)) as AnyStoreStructure[]

        roomStoreStructures.sort((a, b) => a.store.energy - b.store.energy)

        let roomEngineeers = forRoom.stationedCreeps.engineer
            .filter(_ => _.store.energy < _.store.getCapacity(RESOURCE_ENERGY))
            .sort((a, b) => a.store
                .energy - b.store.energy)

        let roomScientists = forRoom.stationedCreeps.scientist
            .filter(_ => _.store.energy < _.store.getCapacity(RESOURCE_ENERGY))
            .sort((a, b) => a.store
                .energy - b.store.energy)

        let fastFillerContainers = forRoom.ffContainers
        for (let structure of [...roomStoreStructures]) {
            if (structure.structureType === STRUCTURE_CONTAINER && !fastFillerContainers.includes(structure)) {
                roomStoreStructures.splice(roomStoreStructures.indexOf(structure), 1)
            }
        }

        for (let order of Object.values(structurePriorityOrder)) {
            let structures = [...roomStoreStructures].filter(s => s.structureType == order)
            targets.push(...structures)
        }

        let storageIndex = targets.findIndex(t => !Typeguards.isAnyCreep(t) && t.structureType == STRUCTURE_STORAGE)
        if (storageIndex !== -1) {
            targets.splice(storageIndex, 0, ...roomEngineeers, ...roomScientists)
        } else {
            targets.push(...roomEngineeers, ...roomScientists)
        }

        return targets.map(t => {
            return {
                id: t.id,
                energyNeeded: Typeguards.isAnyCreep(t) ? t.store.getCapacity(RESOURCE_ENERGY) - t.store.energy : t.store.getCapacity(RESOURCE_ENERGY) - t.store.energy
            }
        })
    }

    /**
     * Returns an array of targets that have energy available.
     * The array is sorted in order of most energy available to least.
     * @param forRoom the room to get the energy available targets for.
     * @returns (Resource<ResourceConstant> | Tombstone | Ruin | AnyStoreStructure)[]
     */
    private getEnergyAvailableTargets(forRoom: Room): { id: (Id<Resource | Tombstone | Ruin | AnyStoreStructure>), energyAvailable: number }[] {
        let targets: (AnyStoreStructure | Resource<ResourceConstant> | Tombstone | Ruin)[] = []

        let roomDroppedResources = forRoom.find(FIND_DROPPED_RESOURCES)
            .sort((a, b) => a.amount + b.amount)

        let roomTombstones = forRoom.find(FIND_TOMBSTONES)
            .filter(t => t.store.energy > 0)
            .sort((a, b) => a.store.energy + b.store.energy)

        let roomRuins = forRoom.find(FIND_RUINS)
            .filter(t => t.store.energy > 0)
            .sort((a, b) => a.store.energy + b.store.energy)

        let containers = forRoom.containers.filter(c => !forRoom.ffContainers.includes(c))
            .filter(t => t.store.energy > 0)
            .sort((a, b) => a.store.energy + b.store.energy)

        let storage = forRoom.storage
        let factory = forRoom.factory
        let terminal = forRoom.terminal

        for (let dropped of roomDroppedResources) {
            targets.push(dropped)
        }

        for (let tombstone of roomTombstones) {
            targets.push(tombstone)
        }

        for (let ruin of roomRuins) {
            targets.push(ruin)
        }

        for (let container of containers) {
            targets.push(container)
        }

        if (storage && storage.store.energy > 0) targets.push(storage)
        if (factory && factory.store.energy > 0) targets.push(factory)
        if (terminal && terminal.store.energy > 0) targets.push(terminal)

        return targets.map(t => {
            return {
                id: t.id,
                energyAvailable: this.getAmountForType(t)
            }
        })
    }

    /**
     * Returns a number representing the amount OR energy available in the target.
     * @param t any object that has a store or amount property.
     * @returns
     */
    private getAmountForType(t: any): number {
        if (Typeguards.isAnyCreep(t)) return t.store.energy
        if (Typeguards.isAnyStoreStructure(t)) return t.store.energy
        if (Typeguards.isResource(t)) return t.amount
        if (Typeguards.isTombstone(t)) return t.store.energy
        if (Typeguards.isRuin(t)) return t.store.energy
        return 0
    }

    public setTarget(forCreep: Creep) {
        //Set the target for the creep.
    }

    public handleTarget(forCreep: Creep) {
        //Tell the creep how to handle the target.
        //Move to the target if the creep is not there.
        //Do the instruction, if the creep is there.
        //If the target is completed, call .completeTarget(forCreep)
    }

    private completeTarget(forCreep: Creep) {
        //Mark the target as completed.
        //Remove the target from the queue.
        //Set a new target for the creep.
    }

    private rebuild(forRoom: Room) {
        Logger.log(`Rebuilding target queue for ${forRoom.name}`, INFO)
        if (!global.targetManagerFor) global.targetManagerFor = {}
    }

    constructor(forRoom: Room) {
        this.buildQueue = {}
        this.repairQueue = {}
        this.energyNeededQueue = {}
        this.energyAvailableQueue = {}
        this.remoteQueue = {}

        this.buildSchedule = []
        this.repairSchedule = []
        this.energyNeededSchedule = []
        this.energyAvailableSchedule = []
        this.remoteTargetSchedule = []

        this.rebuild(forRoom)
        this.getHomeTargets(forRoom)
    }
}
