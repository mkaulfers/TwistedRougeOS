import { LogLevel } from "utils/Enums"
import { Utils } from "utils/Index"

export default class SpawnSchedule {
    roomName: string
    spawnName: string
    /** Position in the schedule. A number from 0 to 1500. */
    tick: number
    /** Number of ticks schedule has been halted. Used for tracking and triggering special circumstances to mitigate room-crash situations. */
    pausedTicks: number
    /** Tracker for unused space in the schedule. Each tuple is [tick, freeTickCount]. Example: [10, 350]. On tick 10 in the schedule, there is 350 ticks of free space. */
    freeSpaces: [number, number][]
    /** Number representing total quantity of ticks the spawn will be in use for the duration of the schedule. */
    usedSpace: number
    /** Number between 0.0 and 1.0 that limits the total amount of schedule used. Example: 0.8. 80% of the schedule's ticks are free to be used for spawning.*/
    limiter: number
    /** The actual schedule. Contains all SpawnOrders required, with all information required but the final name.*/
    schedule: SpawnOrder[]
    /** Used by the Spawn Manager to know when to rebuild the whole schedule. */
    needsScheduled: boolean;

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

        let externalSpawnOrders = [...spawnOrders];
        // Schedule each spawnOrder
        for (const spawnOrder of spawnOrders) {
            // SpawnOrder already exists check
            if (this.schedule.findIndex((o) => o.id === spawnOrder.id) >= 0) continue;
            // Over limiter check
            if ((opts && !opts.force || !opts) && this.usedSpace >= (this.limiter * 1500)) return externalSpawnOrders;

            // TODO: Consider spawning creeps too
            // Check for existing creep to match spawnOrder
            let relCreep = Game.rooms[this.roomName].stationedCreeps.all.find((c) => c.name.substring(0, 5) === spawnOrder.id && c.spawning == false);
            let relCFreeSpace = relCreep ? this.freeSpaces.find(freeSpace => freeSpace[0] <= (relCreep!.ticksToLive! - spawnOrder.spawnTime) &&
                (freeSpace[1] - ((relCreep!.ticksToLive! - spawnOrder.spawnTime) - freeSpace[0])) >= spawnOrder.spawnTime) : undefined;

            // TODO: Modify for travel time.
            // Set scheduleTick to PreSpawn IFF possible
            if (relCreep && relCFreeSpace) {
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
                // Set scheduleTick in first open slot
                let firstFreeSpace = this.freeSpaces.find(freeSpace => freeSpace[1] >= spawnOrder.spawnTime);
                if (!firstFreeSpace) return externalSpawnOrders;
                spawnOrder.scheduleTick = firstFreeSpace[0];
                this.freeSpaces[this.freeSpaces.indexOf(firstFreeSpace)] = [firstFreeSpace[0] + spawnOrder.spawnTime + 1, firstFreeSpace[1] - (spawnOrder.spawnTime + 1)];
            }

            // TODO: Fix usedSpace Calculations
            // Add to schedule, adjust numbers, remove SpawnOrder from externalSpawnOrders
            this.usedSpace += spawnOrder.spawnTime;
            this.schedule.push(spawnOrder);
            externalSpawnOrders.shift();
            Utils.Logger.log(`${this.spawnName} schedule added ${spawnOrder.id}`, LogLevel.INFO);
        }

        // Sort for easy legibility
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
     * Removes SpawnOrders from the schedule. UNTESTED
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
    // reschedule(): void {

    // }

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
     * Cancels prespawns, forces all as tightly as possible to allow for more spawning.
     */
    // shift(): void {

    // }
}
