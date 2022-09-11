import { Process } from 'Models/Process';
import SpawnSchedule from 'Models/SpawnSchedule';
import { RoomStatistics } from 'Models/RoomStatistics';
import { LogLevel, ProcessPriority, ProcessResult, Task } from 'utils/Enums';
import { Utils } from '../utils/Index';

// Add new Memory or Cache properties in this file.
declare global {
    interface CreepMemory {
        assignedPos?: number
        task?: Task
        role: string
        working: boolean
        target?: Id<any>
        homeRoom: string
    }

    interface RoomMemory {
        claim?: string
        remotes?: string[]
        frontiers?: string[]
        costMatrix: string
        blueprint: {
            anchor: number,
            containers: number[],
            links: number[],
            highways: number[],
            ramparts: number[],
            stamps: {
                type: string,
                stampPos: number,
                completed: boolean
            }[]
        }
    }

    interface Memory {
        uuid: number;
        log: any;
        kernel: string
        scheduler: string
        intelligence: RoomStatistics[]
    }

    // Add properties you wish to have stored in a room's cache in the interface below.
    // Refer to `const cacheTask` below if you make it a required property.
    interface RoomCache {
        towers: Id<StructureTower>[];
        towerTarget?: Id<AnyCreep>;
        links: {[key: Id<StructureLink>]: string};
        spawnSchedules?: SpawnSchedule[];
        pauseSpawning?: boolean;
    }

    // Add properties you wish to have stored in a creep's cache in the interface below.
    interface CreepCache {
        harvesterDump?: Id<StructureLink | StructureContainer>;
    }

    // The global Cache object. Consider it like `Memory`, it just gets rebuilt on a global reset.
    var Cache: {
        rooms: {[key: string]: RoomCache},
        creeps: {[key: string]: CreepCache},
        cmd: {[key: string]: any},
    }
}

export default class DataManager {
    static scheduleMemoryMonitor(): void | ProcessResult {

        const memoryTask = () => {
            // Cleanup Dead Creeps
            for (const name in Memory.creeps) {
                if (!Game.creeps[name]) {
                    Utils.Logger.log(`Removing dead creep: ${name}`, LogLevel.INFO)
                    global.scheduler.removeProcess(name)
                    delete Memory.creeps[name]
                }
            }
            // Cleanup rooms we aren't in
            // TODO: Modfiy to only cleanup claimed rooms of data required to run a claimed room. Keep scouting data, other data, etc.
            for (const name in Memory.rooms) {
                if (!Game.rooms[name]) {
                    Utils.Logger.log(`Removing dead room: ${name}`, LogLevel.INFO)
                    delete Memory.rooms[name]
                }
            }
        }

        let process = new Process('memory_monitor', ProcessPriority.CRITICAL, memoryTask)
        global.scheduler.addProcess(process)
    }

    static scheduleCacheMonitor() {

        // If you added a required property in one of the Cache interfaces or var above, please add it to the appropriate section below.
        const cacheTask = () => {
            // Build cache if deleted
            if (!global.Cache) global.Cache = {
                // Add required properties of Cache here
                rooms: {},
                creeps: {},
                cmd: {
                    roomPlanning: false,
                    distanceTransform: false,
                    pathfinding: false,
                    worldRoomScoring: false,
                    worldRemotes: false,
                    worldPathfinding: false,

                    destroyCreeps: true,
                    destroyCreepsInRoom: true,
                    destroyStructures: true,
                    destroyStructuresInRoom: true,
                    destroyCSites: true,
                    destroyCSitesInRoom: true,
                }
            };
            for (const roomName in Game.rooms) {
                if (!global.Cache.rooms[roomName]) {
                    global.Cache.rooms[roomName] = {
                        // Add required properties of the room's cache here
                        towers: [],
                        links: {},
                    };
                }
            }
            for (const name in Game.creeps) {
                if (!global.Cache.creeps[name]) {
                    global.Cache.creeps[name] = {
                        // Add required properties of the creep's cache here

                    };
                }
            }

            // Reset destruction command confirmations
            let checks = [
                global.Cache.cmd.destroyCreeps,
                global.Cache.cmd.destroyCreepsInRoom,
                global.Cache.cmd.destroyStructures,
                global.Cache.cmd.destroyStructuresInRoom,
                global.Cache.cmd.destroyCSites,
                global.Cache.cmd.destroyCSitesInRoom,
            ]
            if (_.any(checks, (c) => c == false)) {
                if (!global.Cache.cmd.destroyResetTick) {
                    global.Cache.cmd.destroyResetTick = Game.time + 10;
                } else if (Game.time == global.Cache.cmd.destroyResetTick) {
                    global.Cache.cmd.destroyCreeps = true;
                    global.Cache.cmd.destroyCreepsInRoom = true;
                    global.Cache.cmd.destroyStructures = true;
                    global.Cache.cmd.destroyStructuresInRoom = true;
                    global.Cache.cmd.destroyCSites = true;
                    global.Cache.cmd.destroyCSitesInRoom = true;
                    delete global.Cache.cmd.destroyResetTick;
                }
            }

            // Cleanup Dead Creeps from Cache
            for (const name in global.Cache.creeps) {
                if (!Game.creeps[name]) {
                    delete global.Cache.creeps[name];
                }
            }
            return ProcessResult.RUNNING;
        }

        let process = new Process('cache_monitor', ProcessPriority.CRITICAL, cacheTask);
        global.scheduler.addProcess(process);
    }
}

