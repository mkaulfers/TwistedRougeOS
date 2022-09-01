import { Role, Task, ProcessPriority, ProcessResult, LogLevel } from '../utils/Enums'

interface SpawnOrder {
    id: string, // role + count
    scheduleTick?: number,
    spawnTime: number,
    body: BodyPartConstant[],
    memory: {[key: string]: any},
}

export default class SpawnSchedule {
    roomName: string
    spawnName: string
    tick: number
    pausedTicks: number
    freeSpaces: [number, number][] // [tick, freeTickCount][]
    usedSpace: number
    limiter: number // Limits total amount of the schedule that is used.
    schedule: SpawnOrder[]

    /**
     * How to create a new spawn schedule.
     * @param roomName Name of room.
     * @param spawnName Name of spawn.
     */
    constructor(roomName: string, spawnName: string) {
        this.roomName = roomName;
        this.spawnName = spawnName;
        this.tick = 0;
        this.pausedTicks = 0;
        this.schedule = [];
        this.freeSpaces = [[0,1500]];
        this.usedSpace = 0;
        this.limiter = 0.80
    }

    /**
     * Adds SpawnOrders to the schedule.
     * @param spawnOrders All SpawnOrders you wish to attempt to add to the schedule.
     * @param opts An optional object of optional args
     * @param opts.force To ignore the schedule's built in percentage limiter. Will only allow to 100% usage.
     * @returns SpawnOrders it couldn't add to the schedule or undefined if successful.
     */
    add(spawnOrders: SpawnOrder[], opts?: {force?: boolean}): SpawnOrder[] | undefined {
        // TODO: Modify to handle gaps between spawnOrders
        let externalSpawnOrders = spawnOrders;
        for (const spawnOrder of spawnOrders) {
            // Determine if large enough gap exists
            let firstFreeSpace = this.freeSpaces.find(freeSpace => freeSpace[1] >= spawnOrder.spawnTime);
            if (!firstFreeSpace || this.usedSpace >= (this.limiter * 1500)) return externalSpawnOrders;

            spawnOrder.scheduleTick = firstFreeSpace[0];
            this.schedule.push(spawnOrder);

            this.freeSpaces[this.freeSpaces.indexOf(firstFreeSpace)] = [firstFreeSpace[0] + spawnOrder.spawnTime, firstFreeSpace[1] - spawnOrder.spawnTime];
            this.usedSpace =+ spawnOrder.spawnTime;
            externalSpawnOrders.shift();
        }
        return undefined;
    }

    /**
     * Removes SpawnOrders from the schedule.
     * @param spawnOrders All SpawnOrders you wish to remove.
     */
    remove(spawnOrders: SpawnOrder[]): void {
        for (const spawnOrder of spawnOrders) {
            // Remove from schedule
            let removeIndex = this.schedule.findIndex(o => spawnOrder.id === o.id);
            if (removeIndex == -1) continue;
            let removeThis = this.schedule[removeIndex];
            if (!removeThis.scheduleTick) {
                this.schedule.splice(removeIndex, 1);
                continue;
            }

            // Re-add freeSpace to freeSpaces
            let matchingSpace = this.freeSpaces.find(freeSpace => freeSpace[0] == removeThis.scheduleTick);
            if (matchingSpace == undefined) matchingSpace = this.freeSpaces.find(freeSpace => freeSpace[0] < removeThis.scheduleTick! && (freeSpace[0] + freeSpace[1]) > removeThis.scheduleTick!);
            if (matchingSpace == undefined) {
                this.freeSpaces.splice(this.freeSpaces.findIndex(o => o[1] > removeThis.scheduleTick!) - 1, 0, [removeThis.scheduleTick, removeThis.spawnTime])
            } else {
                this.freeSpaces[this.freeSpaces.indexOf(matchingSpace)] = [matchingSpace[0] - removeThis.spawnTime, matchingSpace[1] + removeThis.spawnTime]
            }

            this.usedSpace =- removeThis.spawnTime;
        }
        return undefined;
    }

    /**
     * Resets the schedule without having to reinitialize the class.
     */
    rebuild(): void {
        this.tick = 0;
        this.pausedTicks = 0;
        this.schedule = [];
        this.freeSpaces = [[0,1500]];
        this.usedSpace = 0;
    }
}
