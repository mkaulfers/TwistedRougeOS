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
export class LogisticsManager {
    private scheduledConstruction: { [creepId: string]: Id<ConstructionSite>[] }
    private scheduledRepairs: { [creepId: string]: Id<AnyStructure>[] }
    private scheduledDeliveries: { [creepId: string]: { [id: (Id<AnyStoreStructure | Creep>)]: number } }
    private scheduledRestocks: { [creepId: string]: { [id: (Id<Resource | Tombstone | Ruin | AnyStoreStructure>)]: number } }

    private unscheduledBuilds: Id<ConstructionSite>[]
    private unscheduledRepairs: Id<Structure>[]
    private orderQueue: { [id: (Id<AnyStoreStructure | Creep>)]: number }
    private stockQueue: { [id: (Id<Resource | Tombstone | Ruin | AnyStoreStructure>)]: number }

    private getHomeTargets(forRoom: Room) {
        //Find targets for the room, add them to the queue.
        this.unscheduledBuilds = this.getConstructionTargets(forRoom)
        this.unscheduledRepairs = this.getRepairTargets(forRoom)
        this.orderQueue = this.getOrders(forRoom)
        this.stockQueue = this.getStock(forRoom)
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
     * @returns
     */
    private getOrders(forRoom: Room): { [id: (Id<AnyStoreStructure | Creep>)]: number } {
        let newOrders: { [id: (Id<AnyStoreStructure | Creep>)]: number } = {}

        let structurePriorityOrder = [
            STRUCTURE_TOWER,
            STRUCTURE_SPAWN,
            STRUCTURE_EXTENSION,
            STRUCTURE_CONTAINER,
            STRUCTURE_LAB,
            STRUCTURE_STORAGE
        ]

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

        for (let order of structurePriorityOrder) {
            if (order === STRUCTURE_STORAGE) continue
            let structures = [...roomStoreStructures].filter(s => s.structureType == order)
            for (let structure of structures) {
                newOrders[structure.id] = structure.store.getCapacity(RESOURCE_ENERGY) - structure.store.energy
            }
        }

        for (let engineer of roomEngineeers) {
            newOrders[engineer.id] = engineer.store.getCapacity(RESOURCE_ENERGY) - engineer.store.energy
        }

        for (let scientist of roomScientists) {
            newOrders[scientist.id] = scientist.store.getCapacity(RESOURCE_ENERGY) - scientist.store.energy
        }

        for (let order of structurePriorityOrder) {
            if (order !== STRUCTURE_STORAGE) continue
            let structures = [...roomStoreStructures].filter(s => s.structureType == order)
            for (let structure of structures) {
                newOrders[structure.id] = structure.store.getCapacity(RESOURCE_ENERGY) - structure.store.energy
            }
        }

        for (let deliveries of Object.values(this.scheduledDeliveries)) {
            for (let id in deliveries) {
                if (newOrders[id as Id<any>]) {
                    newOrders[id as Id<any>] -= deliveries[id as Id<any>]
                    if (newOrders[id as Id<any>] <= 0) delete newOrders[id as Id<any>]
                }
            }
        }

        Logger.log(`ORDERS: ${JSON.stringify(newOrders)}`, DEBUG)
        return newOrders
    }

    /**
     * Returns an array of targets that have energy available.
     * The array is sorted in order of most energy available to least.
     * @param forRoom the room to get the energy available targets for.
     * @returns
     */
    private getStock(forRoom: Room): { [id: (Id<Resource | Tombstone | Ruin | AnyStoreStructure>)]: number } {
        let targets: { [id: (Id<Resource | Tombstone | Ruin | AnyStoreStructure>)]: number } = {}

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


        for (let dropped of roomDroppedResources) targets[dropped.id] = dropped.amount
        for (let tombstone of roomTombstones) targets[tombstone.id] = tombstone.store.energy
        for (let ruin of roomRuins) targets[ruin.id] = ruin.store.energy
        for (let container of containers) targets[container.id] = container.store.energy

        if (storage && storage.store.energy > 0) targets[storage.id] = storage.store.energy
        if (factory && factory.store.energy > 0) targets[factory.id] = factory.store.energy
        if (terminal && terminal.store.energy > 0) targets[terminal.id] = terminal.store.energy

        for (let pickups of Object.values(this.scheduledRestocks)) {
            for (let id in pickups) {
                if (targets[id as Id<any>]) {
                    targets[id as Id<any>] -= pickups[id as Id<any>]

                    if (targets[id as Id<any>] <= 0) delete targets[id as Id<any>]
                }
            }
        }

        Logger.log(`STOCK: ${JSON.stringify(targets)}`, DEBUG)
        return targets
    }

    private setTargets(forCreep: Creep) {
        let carryCapacity = forCreep.store.getCapacity(RESOURCE_ENERGY)
        let currentlyHolding = forCreep.store.getUsedCapacity(RESOURCE_ENERGY)
        let availableCapacity = carryCapacity - currentlyHolding

        let creepScheduledDeliveries = forCreep.memory.scheduledDeliveries
        let creepScheduledRestocks = forCreep.memory.scheduledRestocks

        let availableDeliveries = this.scheduledDeliveries[forCreep.room.name]
        let availableRestocks = this.scheduledRestocks[forCreep.room.name]

        if(Object.keys(creepScheduledDeliveries).length === 0 && currentlyHolding >= 50) {
            this.setCreepDeliveries(forCreep)
        }

        if(Object.keys(creepScheduledRestocks).length === 0 && currentlyHolding < 50 || Object.keys(creepScheduledDeliveries).length === 0) {
            this.setCreepRestocks(forCreep)
        }
    }

    private setCreepDeliveries(forCreep: Creep) {
        forCreep.memory.scheduledRestocks = {}
        if (!forCreep.memory.scheduledDeliveries) forCreep.memory.scheduledDeliveries = {}
        let availableCapacity = forCreep.store.getFreeCapacity(RESOURCE_ENERGY)
        let availableDeliveries = this.scheduledDeliveries[forCreep.room.name]

        for (let id in availableDeliveries) {
            if (availableCapacity <= 0) break
            if (availableDeliveries[id as Id<any>] <= 0) continue

            let amount = Math.min(availableDeliveries[id as Id<any>], availableCapacity)
            forCreep.memory.scheduledDeliveries[id as Id<any>] = amount
            availableDeliveries[id as Id<any>] -= amount
            availableCapacity -= amount
        }

    }

    private setCreepRestocks(forCreep: Creep) {
        forCreep.memory.scheduledDeliveries = {}
    }

    public handleTarget(forCreep: Creep) {
        let scheduledConstruction = forCreep.memory.scheduledConstruction
        let scheduledRepairs = forCreep.memory.scheduledRepairs
        let scheduledDeliveries = forCreep.memory.scheduledDeliveries
        let scheduledRestocks = forCreep.memory.scheduledRestocks

        if (!scheduledConstruction) forCreep.memory.scheduledConstruction = []
        if (!scheduledRepairs) forCreep.memory.scheduledRepairs = []
        if (!scheduledDeliveries) forCreep.memory.scheduledDeliveries = {}
        if (!scheduledRestocks) forCreep.memory.scheduledRestocks = {}

        this.setTargets(forCreep)

        if (Object.keys(forCreep.memory.scheduledDeliveries).length > 0) {
            let target = Game.getObjectById(Object.keys(forCreep.memory.scheduledDeliveries)[0] as Id<AnyStoreStructure>)
            if (target) {
                forCreep.give(target, RESOURCE_ENERGY, forCreep.memory.scheduledDeliveries[target.id])
                this.completeTarget(forCreep, target.id)
            }
        }

        if (Object.keys(forCreep.memory.scheduledRestocks).length > 0) {
            let target = Game.getObjectById(Object.keys(forCreep.memory.scheduledRestocks)[0] as Id<Resource | Tombstone | Ruin | AnyStoreStructure>)
            if (target) {
                forCreep.take(target, RESOURCE_ENERGY, forCreep.memory.scheduledRestocks[target.id])
                Logger.log(`TEST3`, DEBUG)
                this.completeTarget(forCreep, target.id)
            }
        }
    }

    private completeTarget(forCreep: Creep, targetId: Id<any>) {
        delete forCreep.memory.scheduledDeliveries[targetId]
        delete forCreep.memory.scheduledRestocks[targetId]
        delete this.scheduledDeliveries[forCreep.id][targetId]
        delete this.scheduledRestocks[forCreep.id][targetId]
        this.getHomeTargets(forCreep.room)
        this.setTargets(forCreep)
    }

    private rebuild(forRoom: Room) {
        Logger.log(`Rebuilding target queue for ${forRoom.name}`, INFO)
    }

    constructor(forRoom: Room) {
        this.scheduledConstruction = {}
        this.scheduledRepairs = {}
        this.scheduledDeliveries = {}
        this.scheduledRestocks = {}

        this.unscheduledBuilds = []
        this.unscheduledRepairs = []
        this.orderQueue = {}
        this.stockQueue = {}

        this.rebuild(forRoom)
        this.getHomeTargets(forRoom)
    }
}
