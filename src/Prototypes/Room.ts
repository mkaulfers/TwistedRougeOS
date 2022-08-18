import { Logger, LogLevel } from '../utils/Logger';
import { Role } from "../utils/Enums";
import { schedulePixelSale, scheduleThreatMonitor } from 'Managers/TaskManagement/UtilityTasks';
import { scheduleCreepTask, scheduleSpawnMonitor } from 'Managers/TaskManagement/TaskManager';
import { generateNameFor, generateTaskFor, getAvailableSpawn, getBodyFor, shouldSpawnEngineer, shouldSpawnHarvester, shouldSpawnScientist, shouldSpawnTrucker } from 'Managers/SpawnManager';

declare global {
    interface Room {
        creeps(role: Role | undefined): Creep[]
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
        spawnCreep(role: Role): void
    }
}

Room.prototype.shouldSpawn = function (role: Role): boolean {
    switch (role) {
        case Role.ENGINEER:
            return shouldSpawnEngineer()
        case Role.HARVESTER:
            return shouldSpawnHarvester()
        case Role.SCIENTIST:
            return shouldSpawnScientist()
        case Role.TRUCKER:
            return shouldSpawnTrucker()
    }
}

Room.prototype.roleToPreSpawn = function (): Role {
    return Role.HARVESTER
}

Room.prototype.spawnCreep = function(role: Role) {
    Logger.log("Spawn -> spawnCreep()", LogLevel.TRACE)
    let body = getBodyFor(this, role)
    let name = generateNameFor(role)
    let task = generateTaskFor(role, this)
    let availableSpawn = getAvailableSpawn(this)

    if (availableSpawn) {
        availableSpawn.spawnCreep(
            body,
            name, {
            memory: {
                task: task,
                role: role,
                working: false,
                target: undefined,
                homeRoom: this.name
            }
        })
    }
}

Room.prototype.creeps = function(role?: Role): Creep[] {
    if (!role) {
        return this.find(FIND_MY_CREEPS);
    }
    return this.find(FIND_MY_CREEPS, { filter: (c: Creep) => c.memory.role === role });
}

Room.prototype.scheduleTasks = function () {
    Logger.log("Room -> setupTasks()", LogLevel.TRACE)
    schedulePixelSale()
    scheduleThreatMonitor(this)
    scheduleCreepTask(this)
    scheduleSpawnMonitor(this)
}
