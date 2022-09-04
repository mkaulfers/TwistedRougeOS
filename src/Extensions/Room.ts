import { Managers } from 'Managers/Index'
import { Utils } from 'utils/Index'
import { Logger } from 'utils/Logger'
import { Roles } from '../Creeps/Index'
import { Role, LogLevel } from '../utils/Enums'

declare global {
    interface Room {
        /**
         * A shorthand to global.cache.rooms[room.name]. You can use it for quick access the room's specific cache data object.
         */
         cache: RoomCache
        /**
          * Returns a role that should be pre-spawned. The spawn should be scheduled for when a
          * creep is about to die + distance to location - spawn time = 0.
          */
        shouldPreSpawn(spawn: StructureSpawn): Creep | undefined
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
        isSpawning(role: Role): boolean
        spawnCreep(role: Role, spawn: StructureSpawn, memory?: CreepMemory): void
        getAvailableSpawn(): StructureSpawn | undefined
        sourcesEnergyPotential(): number

        // n WORK bodies in the room, on harvesters, x 2 per tick.
        currentHarvesterWorkPotential(): number

        // n WORK bodies in the room, x 1 per tick.
        scientistEnergyConsumption(): number

        // n WORK bodies in the room, x 1 per tick.
        engineerEnergyConsumption(): number

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
        scientistsWorkCapacity(): number
        /**
         * Returns target goal for rampart HP in the room
        */
        rampartHPTarget(): number
        updateCostMatrix(): void
        /**
         * A room's towers, as found within the last 100 ticks || last time one died.
         */
        towers(): StructureTower[];
        labs(): StructureLab[];
        links(): StructureLink[];
        nuker(): StructureNuker;
        extractor(): StructureExtractor;
        extensions(): StructureExtension[];
        constructionSites(isBuilding?: BuildableStructureConstant): ConstructionSite[];
        minerals(): Mineral[];
        spawns(): StructureSpawn[];
        observer(): StructureObserver | undefined;

        maxExtensionsAvail(): number;
        maxTowersAvail(): number;
        maxLabsAvail(): number;

        nextCreepToDie(): Creep | undefined;
        setFrontiers(room: Room): void
    }
}

export default class Room_Extended extends Room {
    get cache() {
        return global.Cache.rooms[this.name] = global.Cache.rooms[this.name] || {};
    }
    set cache(value) {
        global.Cache.rooms[this.name] = value;
    }

    scheduleTasks() {
        Utils.Logger.log("Room -> setupTasks()", LogLevel.TRACE)
        Managers.UtilityManager.schedulePixelSale()
        Managers.ThreatManager.scheduleThreatMonitor(this)
        Managers.CreepManager.scheduleCreepTask(this)
        Managers.SpawnManager.scheduleSpawnMonitor(this)
        Managers.CreepManager.scheduleRoomTaskMonitor(this)
        Managers.LinkManager.schedule(this);
        Managers.ConstructionManager.scheduleConstructionMonitor(this)
    }

    creeps(role?: Role): Creep[] {
        if (!role) {
            return this.find(FIND_MY_CREEPS);
        }
        return this.find(FIND_MY_CREEPS, { filter: (c: Creep) => c.memory.role === role });
    }

    sources(): Source[] {
        return this.find(FIND_SOURCES)
    }

    getAvailableSpawn(): StructureSpawn | undefined {
        let spawns = this.find(FIND_MY_SPAWNS)
        for (let spawn of spawns) {
            if (spawn.spawning == null) {
                return spawn
            }
        }
        return undefined
    }

    sourcesEnergyPotential(): number {
        let validSourcePositions = []

        for (let source of this.sources()) {
            validSourcePositions.push(...source.validPositions())
        }

        let positionalEnergy = validSourcePositions.length * (Roles.harvester.baseBody.filter((x: BodyPartConstant) => x == WORK).length * 2)
        return positionalEnergy > this.sources().length * 10 ? this.sources().length * 10 : positionalEnergy
    }

    currentHarvesterWorkPotential(): number {
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

    truckersCarryCapacity(): number {
        let truckers = this.creeps(Role.TRUCKER)
        let truckersCapacity = 0
        for (let trucker of truckers) {
            truckersCapacity += trucker.getActiveBodyparts(CARRY) * 50
        }
        return truckersCapacity
    }

    _averageDistanceFromSourcesToStructures: number | undefined = undefined
    averageDistanceFromSourcesToStructures(): number {
        if (!this._averageDistanceFromSourcesToStructures || Game.time % 1500 == 0) {
            let sources = this.find(FIND_SOURCES)
            let structures = this.find(FIND_STRUCTURES)
            structures.filter((s) => { return ('store' in s)});
            let distance = 0
            for (let source of sources) {
                for (let structure of structures) {
                    distance += source.pos.getRangeTo(structure)
                }
            }
            this._averageDistanceFromSourcesToStructures = distance / (sources.length * structures.length)
        }
        return this._averageDistanceFromSourcesToStructures
    }

    shouldSpawn(role: Role): boolean {
        switch (role) {
            default:
                if (this.isSpawning(role)) {
                    return false
                }
            case Role.ENGINEER:
                return Roles.engineer.shouldSpawn(this)
            case Role.HARVESTER:
                return Roles.harvester.shouldSpawn(this)
            case Role.SCIENTIST:
                return Roles.scientist.shouldSpawn(this)
            case Role.TRUCKER:
                return Roles.trucker.shouldSpawn(this)
            case Role.FILLER:
                return Roles.filler.shouldSpawn(this)
            case Role.AGENT:
                return Roles.agent.shouldSpawn(this)
            case Role.NETWORK_ENGINEER:
            case Role.NETWORK_HARVESTER:
            case Role.NETWORK_ENGINEER:
                return false
        }
    }

    shouldPreSpawn(spawn: StructureSpawn): Creep | undefined {
        let creep = this.nextCreepToDie()
        let creepToSpawn: Creep | undefined
        if (creep && creep.ticksToLive) {
            let distFromSpawnToCreep = spawn.pos.getRangeTo(creep)
            let totalTickCost = Managers.SpawnManager.getBodyFor(this, creep.memory.role as Role).length * 3 + distFromSpawnToCreep
            if ( creep.ticksToLive * 1.02 <= totalTickCost) {
                creepToSpawn = creep
            }
        }
        return creepToSpawn
    }

    isSpawning(role: Role): boolean {
        let subString = role.substring(0, 3)
        let spawns = this.find(FIND_MY_SPAWNS)
        for (let spawn of spawns) {
            let spawningName = spawn.name.substring(0,3)
            if (spawningName == subString) {
                return true
            }
        }
        return false
    }

    spawnCreep(role: Role, spawn: StructureSpawn, memory?: CreepMemory) {
        Utils.Logger.log("Spawn -> spawnCreep()", LogLevel.TRACE)
        let body = Managers.SpawnManager.getBodyFor(this, role)
        let name = Managers.SpawnManager.genNameFor(role)
        let task = Managers.SpawnManager.genTaskFor(role, this)

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
                task: memory ? memory.task : task,
                role: memory? memory.role : role,
                working: memory? memory.working : false,
                target: memory ? memory.target : undefined,
                homeRoom: memory ? memory.homeRoom : this.name
            }
        })
    }

    sourceWithMostDroppedEnergy(): Source | undefined {
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

    lowestSpawn(): StructureSpawn | undefined {
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

    lowestExtension(): StructureExtension | undefined {
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

    lowestTower(): StructureTower | undefined {
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

    scientistEnergyConsumption(): number {
        let scientists = this.creeps(Role.SCIENTIST)
        let scientistEnergyConsumption = 0
        for (let scientist of scientists) {
            scientistEnergyConsumption += scientist.getActiveBodyparts(WORK)
        }
        return scientistEnergyConsumption
    }

    engineerEnergyConsumption(): number {
        let engineers = this.creeps(Role.ENGINEER)
        let engineerEnergyConsumption = 0
        for (let engineer of engineers) {
            engineerEnergyConsumption += engineer.getActiveBodyparts(WORK)
        }
        return engineerEnergyConsumption * 5
    }

    lowestScientist(): Creep | undefined {
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

    nextCreepToDie(): Creep | undefined {
        let creeps = this.creeps()
        let nextCreepToDie: Creep | undefined = undefined
        for (let creep of creeps) {
            if (!nextCreepToDie) { nextCreepToDie = creep }
            if (creep.ticksToLive && nextCreepToDie.ticksToLive) {
                if (creep.ticksToLive < nextCreepToDie.ticksToLive) {
                    nextCreepToDie = creep
                }
            }
        }
        Logger.log(`Next Creep To Die: ${nextCreepToDie ? nextCreepToDie.name : "None"}`, LogLevel.DEBUG)
        return nextCreepToDie
    }

    scientistsWorkCapacity(): number {
        let scientists = this.creeps(Role.SCIENTIST)
        let scientistsWorkCapacity = 0
        for (let scientist of scientists) {
            scientistsWorkCapacity += scientist.getActiveBodyparts(WORK)
        }
        return scientistsWorkCapacity
    }


    updateCostMatrix() {
        let costMatrix = Utils.Utility.distanceTransform(this.name)
        this.memory.costMatrix = JSON.stringify(costMatrix.serialize())
    }

    constructionSites(ofType?: BuildableStructureConstant): ConstructionSite[]{
        if (ofType) {
            return this.find(FIND_MY_CONSTRUCTION_SITES).filter(x => x.structureType == ofType)
        }
        return this.find(FIND_MY_CONSTRUCTION_SITES)
    }

    extensions(): StructureExtension[] {
        return this.find(FIND_MY_STRUCTURES).filter(x => x.structureType == STRUCTURE_EXTENSION) as StructureExtension[]
    }

    towers() {
        if (!this.cache.towers || Game.time % 100 == 0) {
            let towers: StructureTower[] = this.find(FIND_STRUCTURES, { filter: { structureType: STRUCTURE_TOWER } });
            if (towers.length == 0) return [];
            let towerIds: Id<StructureTower>[] = [];
            towers.forEach((t) => towerIds.push(t.id as Id<StructureTower>));

            this.cache.towers = towerIds;
            return towers;
        } else {
            let towers: StructureTower[] = [];
            let recalc = false;

            for (let tid of this.cache.towers) {
                let tower = Game.getObjectById(tid);
                if (tower == null) {
                    recalc = true;
                    continue;
                }
                towers.push(tower);
            }

            if (recalc == true) this.cache.towers = [];
            if (towers.length == 0) return [];
            return towers;
        }
    }

    labs() {
        return this.find(FIND_MY_STRUCTURES, { filter: { structureType: STRUCTURE_LAB } }) as StructureLab[]
    }

    minerals() {
        return this.find(FIND_MINERALS)
    }

    spawns() {
        let mySpawns = this.find(FIND_MY_SPAWNS);
        if (mySpawns) {
            return mySpawns;
        } else {
            return this.find(FIND_HOSTILE_SPAWNS);
        }
    }

    observer() {
        let observers: StructureObserver[] = this.find(FIND_STRUCTURES, { filter: { StructureType: STRUCTURE_OBSERVER } });
        return observers[0] ? observers[0] : undefined;
    }

    rampartHPTarget(): number {
        if (!this.controller) return 0;
        switch (this.controller.level) {
            case 1:
            case 2:
            case 3:
                return 100000;
            case 4:
                return 500000;
            case 5:
                return 1000000;
            case 6:
                return 5000000;
            case 7:
            case 8:
                return 10000000;
        }
        return 0;
    }

    maxExtensionsAvail(): number {
        let controller = this.controller
        if (!controller) return 0
        switch (controller.level) {
            case 1:
                return 0;
            case 2:
                return 5;
            case 3:
                return 10;
            case 4:
                return 20;
            case 5:
                return 30;
            case 6:
                return 40;
            case 7:
                return 50;
            case 8:
                return 60;
        }
        return 0
    }

    maxTowersAvail(): number {
        let controller = this.controller
        if (!controller) return 0
        switch (controller.level) {
            case 1:
            case 2:
                return 0;
            case 3:
            case 4:
                return 1;
            case 5:
            case 6:
                return 2;
            case 7:
                return 3;
            case 8:
                return 6;
        }
        return 0
    }

    maxLabsAvail(): number {
        let controller = this.controller
        if (!controller) return 0
        switch (controller.level) {
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
                return 0;
            case 6:
                return 3;
            case 7:
                return 6;
            case 8:
                return 10;
        }
        return 0
    }

    setFrontiers(room: Room) {
        let frontiers: string[] = []
        let currentRoomGlobalPos = Utils.Utility.roomNameToCoords(this.name)
        for (let wx = currentRoomGlobalPos.wx - 10; wx <= currentRoomGlobalPos.wx + 10; wx++) {
            for (let wy = currentRoomGlobalPos.wy - 10; wy <= currentRoomGlobalPos.wy + 10; wy++) {
                let roomName = Utils.Utility.roomNameFromCoords(wx, wy)
                let result = Game.map.describeExits(roomName)
                if (result != null) {
                    frontiers.push(roomName)
                }
            }
        }

        frontiers = _.sortByOrder(frontiers, (roomName: string) => {
            let roomGlobalPos = Utils.Utility.roomNameToCoords(roomName)
            let dx = roomGlobalPos.wx - currentRoomGlobalPos.wx
            let dy = roomGlobalPos.wy - currentRoomGlobalPos.wy
            return Math.abs(dx) + Math.abs(dy)
        }, 'asc')

        frontiers.splice(0, 1)

        room.memory.frontiers = frontiers
    }
}
