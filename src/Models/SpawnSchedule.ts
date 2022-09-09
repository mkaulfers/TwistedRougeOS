import { LogLevel } from "utils/Enums"
import { Utils } from "utils/Index"

export default class SpawnSchedule {
    roomName: string
    spawnName: string
    tick: number
    pausedTicks: number
    freeSpaces: [number, number][] // [tick, freeTickCount][]
    usedSpace: number
    limiter: number // Limits total amount of the schedule that is used.
    schedule: SpawnOrder[]
    needsScheduled: boolean;

    /**
     * How to create a new spawn schedule. Can also recreate an existing schedule.
     * @param roomName Name of room.
     * @param spawnName Name of spawn.
     */
    constructor(roomName: string, spawnName: string, opts?: {tick: number, pausedTicks: number, schedule: SpawnOrder[], freeSpaces: [number, number][], usedSpace: number}) {
        this.roomName = roomName;
        this.spawnName = spawnName;
        this.limiter = 0.80

        this.tick = opts ? opts.tick : 0;
        this.pausedTicks = opts ? opts.pausedTicks : 0;
        this.schedule = opts ? opts.schedule : [];
        this.freeSpaces = opts ? opts.freeSpaces : [[0,1500]];
        this.usedSpace = opts ? opts.usedSpace : 0;
        this.needsScheduled = true;
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

        // TODO: Modify to handle suggested scheduleTicks
        let externalSpawnOrders = [...spawnOrders];
        for (const spawnOrder of spawnOrders) {
            // Already exists?
            if (this.schedule.findIndex((o) => o.id === spawnOrder.id) >= 0) continue;

            let relCreep = Game.rooms[this.roomName].stationedCreeps.all.find((c) => c.name.substring(0, 5) === spawnOrder.id && c.spawning == false);
            let relCFreeSpace = relCreep ? this.freeSpaces.find(freeSpace => freeSpace[0] <= (relCreep!.ticksToLive! - spawnOrder.spawnTime) &&
                (freeSpace[1] - ((relCreep!.ticksToLive! - spawnOrder.spawnTime) - freeSpace[0])) >= spawnOrder.spawnTime) : undefined;

            if (relCreep && relCFreeSpace) {
                // Throw in to match death of existing creep
                Utils.Logger.log(`${relCreep.name} found. TTL: ${relCreep.ticksToLive}`, LogLevel.INFO);

                spawnOrder.scheduleTick = relCreep.ticksToLive! - spawnOrder.spawnTime;
                if (relCFreeSpace[0] == spawnOrder.scheduleTick) {
                    this.freeSpaces[this.freeSpaces.indexOf(relCFreeSpace)] = [relCFreeSpace[0] + spawnOrder.spawnTime + 1, relCFreeSpace[1] - (spawnOrder.spawnTime + 1)];
                    Utils.Logger.log(`Exact POST: ${JSON.stringify(this.freeSpaces)}`, LogLevel.INFO);
                }
                else {
                    let i = this.freeSpaces.indexOf(relCFreeSpace);
                    this.freeSpaces[i] = [relCFreeSpace[0], spawnOrder.scheduleTick - (relCFreeSpace[0] + 1)];
                    Utils.Logger.log(`Rel POST First: ${JSON.stringify(this.freeSpaces)}`, LogLevel.INFO);
                    this.freeSpaces.splice(i + 1, 0, [spawnOrder.scheduleTick + spawnOrder.spawnTime + 1, relCFreeSpace[1] - (spawnOrder.spawnTime + this.freeSpaces[i][1] + 2)]);
                    Utils.Logger.log(`Rel POST: ${JSON.stringify(this.freeSpaces)}`, LogLevel.INFO);
                }
            }
            else {
                // Throw in at first available open slot
                let firstFreeSpace = this.freeSpaces.find(freeSpace => freeSpace[1] >= spawnOrder.spawnTime);
                if (!firstFreeSpace || ((opts && !opts.force || !opts) && this.usedSpace >= (this.limiter * 1500)))
                    return externalSpawnOrders;
                spawnOrder.scheduleTick = firstFreeSpace[0];
                this.freeSpaces[this.freeSpaces.indexOf(firstFreeSpace)] = [firstFreeSpace[0] + spawnOrder.spawnTime + 1, firstFreeSpace[1] - (spawnOrder.spawnTime + 1)];
            }
            // TODO: Fix useSpace Calculations
            this.usedSpace += spawnOrder.spawnTime;
            this.schedule.push(spawnOrder);
            externalSpawnOrders.shift();
            Utils.Logger.log(`${this.spawnName} schedule added ${spawnOrder.id}`, LogLevel.INFO);
        }
        this.schedule = _.sortBy(this.schedule, (o) => o.scheduleTick);
        return undefined;
    }

    /**
     * Determines if SpawnSchedule has room for more SpawnOrders.
     * @returns a boolean representing if the schedule is at or above the limiter.
     */
    isFull(): boolean {
        if (this.usedSpace >= (this.limiter * 1500)) return true;
        return false;
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

            this.usedSpace -= removeThis.spawnTime;
        }
        return undefined;
    }

    /**
     * Reschedules existing schedule based on priority.
     */
    reschedule(): void {

    }

    /**
     * Resets the schedule without having to reinitialize the class.
     */
    reset(): void {
        this.tick = 0;
        this.pausedTicks = 0;
        this.schedule = [];
        this.freeSpaces = [[0,1500]];
        this.usedSpace = 0;
        this.needsScheduled = true;
    }

    /**
     *
     */
    shift(): void {

    }
}
