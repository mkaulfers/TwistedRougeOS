import { Managers } from 'Managers/Index';
import { Utils } from 'utils/Index';

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

        /**
        * Checks if a position around a source is a wall, or a valid position a creep can reach to harvest.
        * O is a valid position.
        * X is a wall.
        *     O O O
        *     O X O
        *     O O O
        */
        validSourcePositions(): RoomPosition[]
        getAvailableSpawn(): StructureSpawn | undefined
        sourcesEnergyPotential(): number
        harvestersWorkPotential(): number
        sources(): Source[]
      }
}

Room.prototype.scheduleTasks = function () {
    Utils.Logger.log("Room -> setupTasks()", LogLevel.TRACE)
    Managers.UtilityTasks.schedulePixelSale()
    Managers.UtilityTasks.scheduleThreatMonitor(this)
    Managers.TaskManager.scheduleCreepTask(this)
    Managers.TaskManager.scheduleSpawnMonitor(this)
    Managers.UtilityTasks.scheduleMemoryMonitor()
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

// I statically programmed the positions to reduce CPU usage.
// There is an algorithm that can do this, but it's not worth the CPU in this case.
Room.prototype.validSourcePositions = function (): RoomPosition[] {
    let sources = this.find(FIND_SOURCES)
    let validPositions: RoomPosition[] = []
    let nonValidatedPositions: { x: number, y: number }[] = []

    for (let source of sources) {
        nonValidatedPositions.push(
            { x: source.pos.x - 1, y: source.pos.y - 1 },
            { x: source.pos.x, y: source.pos.y - 1 },
            { x: source.pos.x + 1, y: source.pos.y - 1 },
            { x: source.pos.x - 1, y: source.pos.y },
            { x: source.pos.x + 1, y: source.pos.y },
            { x: source.pos.x - 1, y: source.pos.y + 1 },
            { x: source.pos.x, y: source.pos.y + 1 },
            { x: source.pos.x + 1, y: source.pos.y + 1 }
        )
    }

    let roomTerrain = Game.map.getRoomTerrain(this.name)

    for (let position of nonValidatedPositions) {
        if (roomTerrain.get(position.x, position.y) != TERRAIN_MASK_WALL) {
            validPositions.push(new RoomPosition(position.x, position.y, this.name))
        }
    }

    this.memory.validPackedSourcePositions = Utils.Utility.packPositionArray(validPositions)
    return validPositions
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
    let validSourcePositions = this.validSourcePositions()
    let positionalEnergy = validSourcePositions.length * (Managers.SpawnManager.baseHarBody.filter(x => x == WORK).length * 2)
    return positionalEnergy > this.sources().length * 10 ? this.sources().length * 10 : positionalEnergy
}

Room.prototype.harvestersWorkPotential = function (): number {
    let harvesters = this.creeps(Role.HARVESTER)
    let harvestersPotential = 0
    for (let harvester of harvesters) {
        harvestersPotential += harvester.getActiveBodyparts(WORK)
    }
    return harvestersPotential * 2
}

Room.prototype.shouldSpawn = function (role: Role): boolean {
    switch (role) {
        case Role.ENGINEER:
            return Managers.SpawnManager.shouldSpawnEngineer()
        case Role.HARVESTER:
            return Managers.SpawnManager.shouldSpawnHarvester(this)
        case Role.SCIENTIST:
            return Managers.SpawnManager.shouldSpawnScientist()
        case Role.TRUCKER:
            return Managers.SpawnManager.shouldSpawnTrucker()
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

    spawn.spawnCreep(
        body,
        name, {
        memory: {
            assignedPos: role == Role.HARVESTER ? Managers.HarvesterTasks.getUnassignedPackedPos(this) : undefined,
            task: task,
            role: role,
            working: false,
            target: undefined,
            homeRoom: this.name
        }
    })
}
