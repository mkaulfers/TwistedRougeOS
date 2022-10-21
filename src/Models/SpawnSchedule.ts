import Roles from "Creeps/Index"
import { LogLevel, Role } from "utils/Enums"
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
    /** A record of the currently attempted-to-schedule roles. */
    rolesNeeded: Role[] | undefined;
    /** A record of the last used spawn energy limit. */
    activeELimit: number | undefined;

    constructor(roomName: string, spawnName: string, opts?: {tick: number, pausedTicks: number, schedule: SpawnOrder[], freeSpaces: [number, number][], usedSpace: number}) {
        this.roomName = roomName;
        this.spawnName = spawnName;
        this.limiter = 1.0

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
    add(spawnOrders: SpawnOrder[], opts?: {preSpawnOnly?: boolean, pack?: boolean, force?: boolean, shrinkBody?: boolean}): SpawnOrder[] | undefined {

        // Create external spawnOrder array to edit and return without screwing up the for loop
        let externalSpawnOrders = [...spawnOrders];
        // Schedule each spawnOrder
        for (const spawnOrder of spawnOrders) {
            // SpawnOrder already exists in schedule check
            if (this.schedule.findIndex((o) => o.id === spawnOrder.id) >= 0) continue;
            // Over limiter check
            if (((opts && !opts.force || !opts) && this.usedSpace >= (this.limiter * 1500)) || spawnOrder.spawnTime > (this.limiter * 1500) - this.usedSpace) return externalSpawnOrders;

            // Target newest creep with matching id
            const room = Game.rooms[this.roomName];
            let relCreeps = room.stationedCreeps.all.filter((c) => c.name.substring(0, 5) === spawnOrder.id);
            let relCreep: Creep | undefined;
            for (const c of relCreeps) if (c.spawning === true || (c.ticksToLive && c.ticksToLive > (relCreep ? relCreep.ticksToLive ? relCreep.ticksToLive : 1501 : 0))) relCreep = c;

            // Calculate preSpawnOffset
            const theRole = Roles[spawnOrder.memory.role]
            let preSpawnOffset = Math.ceil(spawnOrder.spawnTime + (theRole ? theRole.preSpawnBy(room, Game.spawns[this.spawnName], relCreep) : 0));

            // Determine freespace, scheduleTick
            const reversedFreeSpaces = [...this.freeSpaces].reverse();
            let foundFreeSpace: [number, number] | undefined;

            // Find Last freespace with enough space for spawntime
            if (relCreep && relCreep.spawning === true) {
                foundFreeSpace = reversedFreeSpaces.find(freeSpace => freeSpace[1] > spawnOrder.spawnTime);
                spawnOrder.scheduleTick = foundFreeSpace ? foundFreeSpace[0] + foundFreeSpace[1] - (spawnOrder.spawnTime + 1) : undefined;
            }
            // Find First freepsace with the targeted schedule tick and enough space for spawntime
            if (relCreep && relCreep.spawning === false) {
                let targetTick = relCreep && relCreep.ticksToLive ? relCreep.ticksToLive - preSpawnOffset : -1;
                foundFreeSpace = this.freeSpaces.find(freeSpace => freeSpace[0] <= targetTick &&
                    freeSpace[0] + freeSpace[1] - (spawnOrder.spawnTime + 1) >= targetTick);
                spawnOrder.scheduleTick = foundFreeSpace ? targetTick : undefined;
            }
            // Find Last freespace with enough space for spawntime before the targeted schedule tick. Final fallback requiring a relevant creep.
            if ((!opts || opts.preSpawnOnly !== true) && !foundFreeSpace && relCreep && relCreep.spawning !== true) {
                let targetTick = relCreep && relCreep.ticksToLive ? relCreep.ticksToLive - preSpawnOffset : -1;
                foundFreeSpace = reversedFreeSpaces.find(freeSpace => freeSpace[0] <= targetTick && freeSpace[1] > spawnOrder.spawnTime + 1 &&
                    freeSpace[0] + freeSpace[1] - (spawnOrder.spawnTime + 1) < targetTick);
                spawnOrder.scheduleTick = foundFreeSpace ? foundFreeSpace[0] + foundFreeSpace[1] - (spawnOrder.spawnTime + 1) : undefined;
            }
            // Find First freespace with enough space for spawntime. Final fallback period.
            if ((!opts || opts.preSpawnOnly !== true || (opts.preSpawnOnly === true && !relCreep)) && !foundFreeSpace) {
                foundFreeSpace = this.freeSpaces.find(freeSpace => freeSpace[1] > spawnOrder.spawnTime);
                spawnOrder.scheduleTick = (foundFreeSpace ? foundFreeSpace[0] : undefined);
            }
            // Desparation Scheduling Found Here. Shrinking Creep Size to fit. Finds largest freespace left.
            if (opts && opts.shrinkBody === true && !foundFreeSpace && theRole?.shrinkAllowed === true) {
                let length = 3;
                this.freeSpaces.forEach(freeSpace => {if (freeSpace[1] > length) length = freeSpace[1]})
                if (length || length > 3) {
                    foundFreeSpace = this.freeSpaces.find(freeSpace => freeSpace[1] === length);
                    spawnOrder.scheduleTick = (foundFreeSpace ? foundFreeSpace[0] : undefined);
                }
            }


            if (foundFreeSpace && typeof spawnOrder.scheduleTick === 'number' && spawnOrder.scheduleTick >= 0 && spawnOrder.scheduleTick < 1500 && foundFreeSpace[1] >= spawnOrder.spawnTime) {
                // Handle Standard freespaces

                // Update freespaces
                if (foundFreeSpace[0] === spawnOrder.scheduleTick) {
                    this.freeSpaces[this.freeSpaces.indexOf(foundFreeSpace)] = [foundFreeSpace[0] + spawnOrder.spawnTime + 1, foundFreeSpace[1] - (spawnOrder.spawnTime + 1)];
                } else {
                    let i = this.freeSpaces.indexOf(foundFreeSpace);
                    this.freeSpaces[i] = [foundFreeSpace[0], spawnOrder.scheduleTick - (foundFreeSpace[0] + 1)];
                    this.freeSpaces.splice(i + 1, 0, [spawnOrder.scheduleTick + spawnOrder.spawnTime + 1, foundFreeSpace[1] - (spawnOrder.spawnTime + this.freeSpaces[i][1] + 2)]);
                }

                // Add to schedule, adjust numbers, remove SpawnOrder from externalSpawnOrders
                this.usedSpace += spawnOrder.spawnTime + 1;
                this.schedule.push(spawnOrder);
                externalSpawnOrders.shift();
                Utils.Logger.log(`${this.spawnName} schedule added ${spawnOrder.id}`, LogLevel.INFO);
            } else if (foundFreeSpace && typeof spawnOrder.scheduleTick === 'number' && spawnOrder.scheduleTick >= 0 && spawnOrder.scheduleTick < 1500 && foundFreeSpace[1] < spawnOrder.spawnTime && theRole) {
                // Handle undersized freespaces.. DESPERATION Scheduling

                // Shrink Spawn Order to freespace
                let body = Utils.Utility.getBodyFor(room, theRole.baseBody, theRole.segment, theRole.partLimits, {sizeLimit: Math.floor(foundFreeSpace[1] / 3)});
                if (body.length > 0) {
                    // Modify spawn order values
                    spawnOrder.body = body;
                    spawnOrder.spawnTime = body.length * 3;

                    // Modify freespaces
                    let i = this.freeSpaces.indexOf(foundFreeSpace);
                    if (spawnOrder.spawnTime === foundFreeSpace[1]) this.freeSpaces.splice(i, 1)
                    else this.freeSpaces[i] = [foundFreeSpace[0] + spawnOrder.spawnTime, foundFreeSpace[1] - spawnOrder.spawnTime]

                    // Add to schedule, adjust numbers, remove from externalSpawnOrders
                    this.usedSpace += spawnOrder.spawnTime + 1;
                    this.schedule.push(spawnOrder);
                    externalSpawnOrders.shift();
                    Utils.Logger.log(`${this.spawnName} schedule added ${spawnOrder.id}`, LogLevel.INFO);
                } else {
                    Utils.Logger.log(`Desparation Spawn Scheduling for ${spawnOrder.id} failed.`, LogLevel.INFO)
                    let order = externalSpawnOrders.shift();
                    if (order) externalSpawnOrders.push(order);
                }
            } else {
                // No freespace found that qualifies
                let order = externalSpawnOrders.shift();
                if (order) externalSpawnOrders.push(order);
                Utils.Logger.log(`${this.spawnName} failed to add ${spawnOrder.id} due to no scheduleTick being set.`, LogLevel.INFO);
            }
        }

        // Sort for easy legibility
        this.schedule = _.sortBy(this.schedule, (o) => o.scheduleTick);
        return externalSpawnOrders.length > 0 ? externalSpawnOrders : undefined;
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
     * UNTESTED
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

            this.usedSpace -= (removeThis.spawnTime + 1);
        }
        return undefined;
    }

    /**
     * Reschedules existing schedule based on priority.
     */
    // reschedule(): void {

    // }

    /** Resets the schedule without having to reinitialize the class. */
    reset(): void {
        this.tick = 0;
        this.pausedTicks = 0;
        this.schedule = [];
        this.freeSpaces = [[0,1500]];
        this.usedSpace = 0;
        this.needsScheduled = true;
        this.rolesNeeded = undefined;
        this.activeELimit = undefined;
    }


    /**
     * Reschedules existing spawn orders for accurate prespawning.
     */
    shift(): void {

        let externalSchedule: SpawnOrder[] | undefined = [];
        let rolesNeeded = this.rolesNeeded;
        let activeELimit = this.activeELimit;

        // Re-sort schedule to match rolesNeeded
        if (rolesNeeded) {
            for (const role of rolesNeeded) {
                const i = this.schedule.findIndex((o) => o.memory.role === role);
                i >= 0 ? externalSchedule.push(...this.schedule.splice(i, 1)) : undefined;
            }
        } else {
            externalSchedule.push(...this.schedule);
        }

        // Remove scheduleTicks
        for (const spawnOrder of externalSchedule) spawnOrder.scheduleTick = undefined;

        this.reset();
        this.activeELimit = activeELimit;
        this.rolesNeeded = rolesNeeded;
        this.needsScheduled = false;

        // Reschedule each spawn order for prespawn
        // externalSchedule = this.add(externalSchedule, { preSpawnOnly: true });
        // if (externalSchedule && externalSchedule.length > 0)
        this.add(externalSchedule);
    }
}
