import trucker from 'Creeps/Trucker'
import { assign } from 'lodash'
import { Managers } from 'Managers/Index'
import { Utils } from 'utils/Index'
import { Utility } from 'utils/Utilities'
import { Roles } from '../Creeps/Index'
import { Role, Task, ProcessPriority, ProcessResult, LogLevel } from '../utils/Enums'

declare global {
    interface Room {
        /**
          * Returns a role that should be pre-spawned. The spawn should be scheduled for when a
          * creep is about to die + distance to location - spawn time = 0.
          */
        roleToPreSpawn(): Role
        /**
         * We should only call this once per creep we are adding to the queue.
         * When it is called, it will add the creep to the scheduler, which will process it
         * when it's ready. However we need to make sure that it's not called again for the same creep.
         * @param role  role to spawn
        */
        scheduleSpawn(role: Role): void
        /**
         * Returns a boolean value indicating whether a role should be spawned.
         * @param role checks to see if provided role should be spawned.
         */
        shouldSpawn(role: Role): boolean
        scheduleTasks(): void
        creeps(role?: Role): Creep[];
        spawnCreep(role: Role, spawn: StructureSpawn): void

        // /**
        // * Checks if a position around a source is a wall, or a valid position a creep can reach to harvest.
        // * O is a valid position.
        // * X is a wall.
        // *     O O O
        // *     O X O
        // *     O O O
        // */
        // validSourcePositions(): RoomPosition[]
        getAvailableSpawn(): StructureSpawn | undefined
        sourcesEnergyPotential(): number

        // n WORK bodies in the room, on harvesters, x 2 per tick.
        currentHarvesterWorkPotential(): number

        // n WORK bodies in the room, x 1 per tick.
        scientistEnergyConsumption(): number

        // n CARRY bodies in the room, on truckers, x 50.
        truckersCarryCapacity(): number

        // Gets the distance from sources to each storage capable structure in the room.
        // Spawn, Extension, Tower, Storage, Link, PowerSpawn, Nuker, Labs, Factory, etc..
        averageDistanceFromSourcesToStructures(): number
        sources(): Source[]
        sourceWithMostDroppedEnergy(): Source | undefined
        lowestSpawn(): StructureSpawn | undefined
        lowestExtension(): StructureExtension | undefined
        lowestTower(): StructureTower | undefined
        lowestScientist(): Creep | undefined

        isSpawnDemandMet(): {met: boolean, demand: number}
        isScientistDemandMet(): {met: boolean, demand: number}
    }
}

Room.prototype.scheduleTasks = function () {
    Utils.Logger.log("Room -> setupTasks()", LogLevel.TRACE)
    Managers.UtilityTasks.schedulePixelSale()
    Managers.UtilityTasks.scheduleThreatMonitor(this)
    Managers.TaskManager.scheduleCreepTask(this)
    Managers.TaskManager.scheduleSpawnMonitor(this)
    Managers.UtilityTasks.scheduleMemoryMonitor()
    Managers.TaskManager.scheduleRoomTaskMonitor(this)
}

Room.prototype.creeps = function (role?: Role): Creep[] {
    if (!role) {
        return this.find(FIND_MY_CREEPS);
    }
    return this.find(FIND_MY_CREEPS, { filter: (c: Creep) => c.memory.role === role });
}

Room.prototype.sources = function (): Source[] {
    return this.find(FIND_SOURCES)
}

Room.prototype.getAvailableSpawn = function (): StructureSpawn | undefined {
    let spawns = this.find(FIND_MY_SPAWNS)
    for (let spawn of spawns) {
        if (spawn.spawning == null) {
            return spawn
        }
    }
    return undefined
}

Room.prototype.sourcesEnergyPotential = function (): number {
    let validSourcePositions = []

    for (let source of this.sources()) {
        validSourcePositions.push(...source.validPositions())
    }

    let positionalEnergy = validSourcePositions.length * (Roles.Harvester.baseBody.filter(x => x == WORK).length * 2)
    return positionalEnergy > this.sources().length * 10 ? this.sources().length * 10 : positionalEnergy
}

Room.prototype.currentHarvesterWorkPotential = function (): number {
    let harvesters = this.creeps(Role.HARVESTER)
    let harvestersPotential = 0
    for (let harvester of harvesters) {
        harvestersPotential += harvester.getActiveBodyparts(WORK) * 2
    }

    if (harvestersPotential > this.sources().length * 10) {
        harvestersPotential = this.sources().length * 10
    }

    return harvestersPotential
}

Room.prototype.truckersCarryCapacity = function (): number {
    let truckers = this.creeps(Role.TRUCKER)
    let truckersCapacity = 0
    for (let trucker of truckers) {
        truckersCapacity += trucker.getActiveBodyparts(CARRY) * 50
    }
    return truckersCapacity
}

let _averageDistanceFromSourcesToStructures: number | undefined = undefined
Room.prototype.averageDistanceFromSourcesToStructures = function (): number {
    if (!_averageDistanceFromSourcesToStructures) {
        let sources = this.find(FIND_SOURCES)
        let structures = this.find(FIND_STRUCTURES)
        let distance = 0
        for (let source of sources) {
            for (let structure of structures) {
                distance += source.pos.getRangeTo(structure)
            }
        }
        _averageDistanceFromSourcesToStructures = distance / sources.length
        return distance / structures.length
    }
    return _averageDistanceFromSourcesToStructures
}

Room.prototype.shouldSpawn = function (role: Role): boolean {
    switch (role) {
        case Role.ENGINEER:
            return Roles.Engineer.shouldSpawn(this)
        case Role.HARVESTER:
            return Roles.Harvester.shouldSpawn(this)
        case Role.SCIENTIST:
            return Roles.Scientist.shouldSpawn(this)
        case Role.TRUCKER:
            return Roles.Trucker.shouldSpawn(this)
    }
}

Room.prototype.roleToPreSpawn = function (): Role {
    return Role.HARVESTER
}

Room.prototype.spawnCreep = function (role: Role, spawn: StructureSpawn) {
    Utils.Logger.log("Spawn -> spawnCreep()", LogLevel.TRACE)
    let body = Managers.SpawnManager.getBodyFor(this, role)
    let name = Managers.SpawnManager.generateNameFor(role)
    let task = Managers.SpawnManager.generateTaskFor(role, this)

    let sources = spawn.room.sources()
    let assignableSource: Source | undefined = undefined
    for (let source of sources) {
        if (!source.isHarvestingAtMaxEfficiency()) {
            assignableSource = source
            break
        }
    }

    spawn.spawnCreep(
        body,
        name, {
        memory: {
            assignedPos: role == Role.HARVESTER && assignableSource ? Utils.Utility.packPosition(assignableSource.assignablePosition()) : undefined,
            task: task,
            role: role,
            working: false,
            target: undefined,
            homeRoom: this.name
        }
    })
}

Room.prototype.sourceWithMostDroppedEnergy = function (): Source | undefined {
    let sources = this.sources()
    let sourceWithMostDroppedEnergy = undefined
    for (let source of sources) {
        if (!sourceWithMostDroppedEnergy) { sourceWithMostDroppedEnergy = source }
        if (source.nearbyEnergy() > sourceWithMostDroppedEnergy.nearbyEnergy()) {
            sourceWithMostDroppedEnergy = source
        }
    }
    return sourceWithMostDroppedEnergy
}

Room.prototype.lowestSpawn = function (): StructureSpawn | undefined {
    let spawns = this.find(FIND_MY_SPAWNS)
    let lowestSpawn = undefined
    for (let spawn of spawns) {
        if (!lowestSpawn) { lowestSpawn = spawn }
        if (spawn.store.energy < lowestSpawn.store.energy) {
            lowestSpawn = spawn
        }
    }
    return lowestSpawn
}

Room.prototype.lowestExtension = function (): StructureExtension | undefined {
    let extensions = this.find(FIND_MY_STRUCTURES).filter(x => x.structureType == STRUCTURE_EXTENSION) as StructureExtension[]
    let lowestExtension = undefined
    for (let extension of extensions) {
        if (!lowestExtension) { lowestExtension = extension }
        if (extension.store.energy < lowestExtension.store.energy) {
            lowestExtension = extension
        }
    }
    return lowestExtension
}

Room.prototype.lowestTower = function (): StructureTower | undefined {
    let towers = this.find(FIND_MY_STRUCTURES).filter(x => x.structureType == STRUCTURE_TOWER) as StructureTower[]
    let lowestTower = undefined
    for (let tower of towers) {
        if (!lowestTower) { lowestTower = tower }
        if (tower.store.energy < lowestTower.store.energy) {
            lowestTower = tower
        }
    }
    return lowestTower
}

Room.prototype.scientistEnergyConsumption = function (): number {
    let scientists = this.creeps(Role.SCIENTIST)
    let scientistEnergyConsumption = 0
    for (let scientist of scientists) {
        scientistEnergyConsumption += scientist.getActiveBodyparts(WORK)
    }
    return scientistEnergyConsumption
}

Room.prototype.lowestScientist = function (): Creep | undefined {
    let scientists = this.creeps(Role.SCIENTIST)
    let lowestScientist = undefined
    for (let scientist of scientists) {
        if (!lowestScientist) { lowestScientist = scientist }
        if (scientist.store.energy < lowestScientist.store.energy) {
            lowestScientist = scientist
        }
    }
    return lowestScientist
}

Room.prototype.isSpawnDemandMet = function (): {met: boolean, demand: number} {
    let spawns = this.find(FIND_MY_SPAWNS)
    let truckers = this.creeps(Role.TRUCKER).filter(x => x.memory.task == Task.TRUCKER_STORAGE)
    let totalDemand = spawns.length * 300

    let truckersFulfillingDemand = 0
    for (let _trucker of truckers) {
        truckersFulfillingDemand += _trucker.getActiveBodyparts(CARRY) * (this.averageDistanceFromSourcesToStructures() * trucker.carryModifier)
    }
    return {met: truckersFulfillingDemand >= totalDemand, demand: totalDemand}
}

Room.prototype.isScientistDemandMet = function (): {met: boolean, demand: number} {
    let scientists = this.creeps(Role.SCIENTIST)
    let truckers = this.creeps(Role.TRUCKER).filter(x => x.memory.task == Task.TRUCKER_SCIENTIST)

    let totalDemand = 0
    for (let scientist of scientists) {
        totalDemand += scientist.upgradeEnergyConsumptionPerTick()
    }

    let truckersFulfillingDemand = 0
    for (let _trucker of truckers) {
        truckersFulfillingDemand += _trucker.getActiveBodyparts(CARRY) * (this.averageDistanceFromSourcesToStructures() * trucker.carryModifier)
    }
    return { met: truckersFulfillingDemand >= totalDemand, demand: totalDemand }
}
