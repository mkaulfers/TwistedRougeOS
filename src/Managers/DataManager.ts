import { Process } from 'Models/Process';
import SpawnSchedule from 'Models/SpawnSchedule';
import { RoomStatistics } from 'Models/RoomStatistics';
import { LogLevel, ProcessPriority, ProcessResult, Role, StampType, Task } from 'utils/Enums';
import { Utils } from '../utils/Index';

// Add new Memory or Cache properties in this file.
declare global {
    interface CreepMemory {
        assignedPos?: number
        homeRoom: string
        remoteTarget?: { [roomName: string]: { targetId: Id<any>, x: number, y: number } }
        role: Role
        target?: Id<any>
        task?: Task
        working: boolean
    }

    interface RoomMemory {
        blueprint?: {
            anchor: number,
            containers: number[],
            links: number[],
            highways: number[],
            ramparts: number[],
            stamps: {
                type: StampType,
                stampPos: number,
                completed: boolean
            }[]
        }

        claim?: string
        frontiers?: string[]
        intel?: RoomStatistics
        rclOne?: number
        rclTwo?: number
        rclThree?: number
        rclFour?: number
        rclFive?: number
        rclSix?: number
        rclSeven?: number
        rclEight?: number

        // remotes?: RoomStatistics[]
        remoteSites?: {
            [roomName: string]: {
                sourcePositions: { targetId: Id<any>, x: number, y: number }[],
                assignedHarvesters: Id<Creep>[],
                assignedTruckers: Id<Creep>[],
                assignedEngineers: Id<Creep>[],
                assignedClaimers: Id<Creep>[]
            }
        }
    }

    interface Memory {
        kernel: string
        scheduler: string

        autoMarket?: boolean
    }

    // Add properties you wish to have stored in a room's cache in the interface below.
    // Refer to `const cacheTask` below if you make it a required property.
    interface RoomCache {
        pathfindingCM?: string;
        openSpaceCM?: string;
        links?: { [key: Id<StructureLink>]: string };
        pauseSpawning?: boolean;
        spawnSchedules?: SpawnSchedule[];
        spawnEnergyStructIds?: Id<StructureSpawn | StructureExtension>[];
        towerTarget?: Id<AnyCreep>;

        recentlyAttacked?: boolean,
        attackedTime?: number,
    }

    // Add properties you wish to have stored in a creep's cache in the interface below.
    interface CreepCache {
        dump?: Id<StructureLink | StructureContainer>;
        supply?: Id<StructureLink | StructureContainer>;
    }

    // The global Cache object. Consider it like `Memory`, it just gets rebuilt on a global reset.
    var Cache: {
        rooms: { [key: string]: RoomCache },
        creeps: { [key: string]: CreepCache },
        cmd: { [key: string]: any },
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

            for (const name in Memory.rooms) {
                //Delete the room from Memory if it is not owned by me AND it does not contain intel.
                if (Game.rooms[name] && Game.rooms[name].my && Memory.rooms[name].intel) delete Memory.rooms[name].intel;
                if (!Game.rooms[name] && !Memory.rooms[name].intel) {
                    Utils.Logger.log(`Removing room: ${name}`, LogLevel.INFO)
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

                    };
                }

                // Temporary RCL tick tracker
                let room = Game.rooms[roomName];
                if (room.controller && room.controller.my) {
                    if (!room.memory.rclOne) room.memory.rclOne = Game.time;
                    if (room.controller.level == 2 && !room.memory.rclTwo) room.memory.rclTwo = Game.time - room.memory.rclOne;
                    if (room.controller.level == 3 && !room.memory.rclThree) room.memory.rclThree = Game.time - room.memory.rclOne;
                    if (room.controller.level == 4 && !room.memory.rclFour) room.memory.rclFour = Game.time - room.memory.rclOne;
                    if (room.controller.level == 5 && !room.memory.rclFive) room.memory.rclFive = Game.time - room.memory.rclOne;
                    if (room.controller.level == 6 && !room.memory.rclSix) room.memory.rclSix = Game.time - room.memory.rclOne;
                    if (room.controller.level == 7 && !room.memory.rclSeven) room.memory.rclSeven = Game.time - room.memory.rclOne;
                    if (room.controller.level == 8 && !room.memory.rclEight) room.memory.rclEight = Game.time - room.memory.rclOne;
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

