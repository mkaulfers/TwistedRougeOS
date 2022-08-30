import { Process } from 'Models/Process';
import { LogLevel, ProcessPriority, ProcessResult, Task } from 'utils/Enums';
import { Utils } from '../utils/Index';

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
    }

    interface RoomCache {
        towers: Id<StructureTower>[];
        towerTarget?: Id<AnyCreep>;
        links: {[key: Id<StructureLink>]: string};
    }

    interface CreepCache {
        harvesterDump?: Id<StructureLink | StructureContainer>;
    }

    var Cache: {
        rooms: {[key: string]: RoomCache},
        creeps: {[key: string]: CreepCache},
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

        const cacheTask = () => {
            // Build cache if deleted
            if (!global.Cache) global.Cache = {
                rooms: {},
                creeps: {},
            };
            for (const roomName in Game.rooms) {
                if (!global.Cache.rooms[roomName]) {
                    global.Cache.rooms[roomName] = {
                        towers: [],
                        links: {},
                    };
                }
            }
            for (const name in Game.creeps) {
                if (!global.Cache.creeps[name]) {
                    global.Cache.creeps[name] = {};
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

