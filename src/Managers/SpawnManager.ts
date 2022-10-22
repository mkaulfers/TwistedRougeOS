import { Utils } from '../utils/Index'
import { Process } from 'Models/Process';
import SpawnSchedule from 'Models/SpawnSchedule';
import CreepClasses from 'Creeps/Index';
import { TRACE, INFO, ERROR, DEBUG, ALL } from 'Constants/LogConstants';
import { HIGH } from 'Constants/ProcessPriorityConstants';
import { FATAL, RUNNING } from 'Constants/ProcessStateConstants';
import { Role, Roles, TRUCKER, HARVESTER } from 'Constants/RoleConstants';
export default class SpawnManager {
    static scheduleSpawnMonitor(room: Room) {
        const roomId = room.name

        const spawnMonitorTask = () => {

            // TODO: Modify to allow for spawn-limiting due to security issues.

            let room = Game.rooms[roomId]
            if (!room || !room.my) return FATAL;

            Utils.Logger.log(`SpawnManager -> ${room.name}_spawn_monitor`, TRACE)
            let spawns = room.spawns;
            if (!room.cache.spawnSchedules) room.cache.spawnSchedules = [];

            // Ensure we have a schedule for each spawn
            let rebuild = this.shouldRebuild(room.cache.spawnSchedules, spawns);

            // Rebuild schedule when needed
            if (room.cache.spawnSchedules.length !== spawns.length ||
                rebuild == true ||
                _.any(room.cache.spawnSchedules, (s) => s.needsScheduled == true) ||
                _.all(room.cache.spawnSchedules, (s) => s.schedule.length == 0)) {
                this.buildSchedules(room, room.cache.spawnSchedules);
            }
            let spawnSchedules = room.cache.spawnSchedules;

            // Emergencies and SpawnChecks
            for (let spawnSchedule of spawnSchedules) {

                // Generic Data logging, if you want it.
                if (Utils.Logger.devLogLevel == INFO || Utils.Logger.devLogLevel == ALL) {
                    Utils.Logger.log(`SpawnManager schedule ${spawnSchedule.spawnName} tick: ${spawnSchedule.tick}, pausedTick: ${spawnSchedule.pausedTicks}.`, INFO)
                    let nextOrder = spawnSchedule.schedule.find((o) => o.scheduleTick && o.scheduleTick >= spawnSchedule.tick);
                    spawnSchedule.schedule.length > 0 ? Utils.Logger.log(`SpawnManager schedule ${spawnSchedule.spawnName} nextOrder: ${nextOrder ? nextOrder.id : spawnSchedule.schedule[0].id} in ${nextOrder && nextOrder.scheduleTick ? nextOrder.scheduleTick - spawnSchedule.tick : spawnSchedule.schedule[0].scheduleTick ? 1500 + spawnSchedule.schedule[0].scheduleTick - spawnSchedule.tick : undefined} ticks.`, INFO) : undefined;
                }

                let spawnOrder: SpawnOrder | undefined = spawnSchedule.schedule.find(o => o.scheduleTick == spawnSchedule.tick);

                // Identify Emergencies
                let emergency = false;
                if (Game.spawns[spawnSchedule.spawnName].spawning && spawnOrder ||
                    spawnOrder && room.energyAvailable < Utils.Utility.bodyCost(spawnOrder.body) ||
                    room.cache.pauseSpawning && room.cache.pauseSpawning == true) emergency = true;

                // Run schedule
                if (emergency === false && spawnSchedule.pausedTicks == 0) {
                    spawnSchedule = this.runSchedule(spawnSchedule, spawnOrder);
                }

                // Handle Emergencies
                spawnSchedule = this.handleEmergency(spawnSchedule, emergency);

            }

            // Reconsider schedule every 1500 ticks
            if (_.any(spawnSchedules, (s) => s.tick == 1500)) {

                // Get fresh rolesNeeded
                let gen = this.genRolesNeeded(room)
                gen.next();
                let freshRolesNeeded = this.genRolesNeeded(room).next().value;

                // Get total spawnOrder Count and total UnusedSpace
                let sOCount = 0;
                let unusedSpace = 0;
                for (const spawnSchedule of spawnSchedules) {
                    sOCount += spawnSchedule.schedule.length;
                    unusedSpace += (1500 * spawnSchedule.limiter) - spawnSchedule.usedSpace;
                }

                if (_.any(spawnSchedules, (s) => s.activeELimit !== room.spawnEnergyLimit ||
                    s.rolesNeeded?.length !== freshRolesNeeded.length ||
                    s.rolesNeeded?.every(function(role, i) { return role === freshRolesNeeded[i] })) ||
                    (spawnSchedules[0]?.rolesNeeded && sOCount < spawnSchedules[0].rolesNeeded.length - 2 && unusedSpace > (100 * spawnSchedules.length))) {
                    for (const spawnSchedule of spawnSchedules) spawnSchedule.reset();
                } else {
                    // Adjust for prespawning at 1500
                    for (const spawnSchedule of spawnSchedules) spawnSchedule.shift();
                }
            }

            // Conditional Reschedule Checks

            // Reschedule if remote count changes.
            if (room.memory.remoteSites && !room.cache.remotesCount) room.cache.remotesCount = Object.keys(room.memory.remoteSites).length
            if (Game.time % 100 === 0 && room.memory.remoteSites && room.cache.remotesCount !== Object.keys(room.memory.remoteSites).length) {
                for (const spawnSchedule of spawnSchedules) spawnSchedule.reset();
                room.cache.remotesCount = Object.keys(room.memory.remoteSites).length;
            }

            // Construction Manager Ran and Placed cSites
            if ((Game.time - 1) % 1500 === 0 && room.constructionSites().length > 5) for (const spawnSchedule of spawnSchedules) spawnSchedule.reset();

            //

            // History Check: Respawn prematurely dead creeps if room.
            if (Game.time % 25 === 0) {
                // Find missing creep's spawn order
                let missingSpawnOrder: SpawnOrder | undefined;
                let missingFoundIn: SpawnSchedule | undefined;
                for (const spawnSchedule of spawnSchedules) {
                    if (missingSpawnOrder) break;
                    if (spawnSchedule.pausedTicks !== 0) continue;
                    for (const spawnOrder of spawnSchedule.schedule) {
                        if (missingSpawnOrder) break;
                        const foundCreep = room.stationedCreeps[spawnOrder.memory.role].find(s => s.name.includes(spawnOrder.id));
                        if (foundCreep) continue;
                        missingSpawnOrder = spawnOrder;
                        missingFoundIn = spawnSchedule;
                    }
                }

                // Handle missing creep's spawn order
                if (missingSpawnOrder) {
                    // Find available spawn
                    let spawn: StructureSpawn | undefined;
                    for (const spawnSchedule of spawnSchedules) {
                        if (spawn || spawnSchedule.pausedTicks !== 0) continue;
                        let nextOrder = spawnSchedule.schedule.find(o => o.scheduleTick && o.scheduleTick > spawnSchedule.tick);
                        if (!nextOrder || (nextOrder.scheduleTick && nextOrder.scheduleTick - spawnSchedule.tick > missingSpawnOrder.spawnTime)) spawn = Game.spawns[spawnSchedule.spawnName];
                    }

                    if (spawn) {
                        let name = missingSpawnOrder.id + "_" + Utils.Utility.truncateString(Game.time.toString(), 4, false);
                        spawn.spawnCreep(missingSpawnOrder.body, name, { memory: missingSpawnOrder.memory, energyStructures: (room.spawnEnergyStructures.length > 0 ? room.spawnEnergyStructures : undefined) });
                        Utils.Logger.log(`Found missing Creep: ${missingSpawnOrder.id}. Attempting spawn on ${spawn.name}.`, INFO);

                        // WARNING: Currently makes freespace-breaking changes to spawn schedule. Currently, shifts and reschedules cover it, but will need fixed.
                        // TODO: Make this adjustment not break the spawn schedule's internal data.
                        // Adjust spawn order's scheduled tick IFF necessary
                        if (missingSpawnOrder.scheduleTick && missingFoundIn && missingSpawnOrder.scheduleTick >= missingFoundIn.tick) missingSpawnOrder.scheduleTick = missingFoundIn.tick - 1;
                    }
                }
            }

            room.cache.spawnSchedules = spawnSchedules;
            return RUNNING;
        }

        let newProcess = new Process(`${room.name}_spawn_monitor`, HIGH, spawnMonitorTask)
        global.scheduler.addProcess(newProcess)
    }

    /**
     * Generates SpawnOrders for the room
     * @param room The room to consider.
     * @param minimum Limits SpawnOrder generation to just ones considered required for room functionality.
     */
    private static genSpawnOrders(room: Room, rolesWanted: Role[]): SpawnOrder[] {
        Utils.Logger.log(`SpawnManager -> genSpawnOrders(${room.name})`, TRACE)

        // Build each SpawnOrder
        let spawnOrders: SpawnOrder[] = [];
        for (const role of rolesWanted) {
            let roleName = Utils.Utility.truncateString(role);
            let roleCount = spawnOrders.filter(o => o.id.includes(roleName)).length;
            const theRole = CreepClasses[role];
            if (!theRole) continue;
            if (!theRole.partLimits || theRole.partLimits.length == 0) theRole.partLimits = Utils.Utility.buildPartLimits(theRole.baseBody, theRole.segment);
            let partLimits: number[] = theRole.partLimits;
            if (!theRole[room.spawnEnergyLimit]) theRole[room.spawnEnergyLimit] = Utils.Utility.getBodyFor(room, theRole.baseBody, theRole.segment, partLimits);
            let body = theRole[room.spawnEnergyLimit];

            if (body.length === 0) {
                Utils.Logger.log(`SpawnManager.getBodyFor(${room.name}, ${role}) returned an empty body. WHY?!`, ERROR);
                continue;
            }
            // TODO: Reconsider if SpawnOrder should really have creep memory stored within
            let spawnOrder: SpawnOrder = {
                id: roleName + (roleCount.toString().length < 2 ? `0` + roleCount.toString() : roleCount.toString()),
                body: body,
                spawnTime: body.length * 3,
                memory: {
                    role: role,
                    working: false,
                    target: undefined,
                    homeRoom: room.name
                }
            };

            spawnOrders.push(spawnOrder);
        }

        return spawnOrders;
    }

    private static genRolesNeeded = function*(room: Room): Generator<Role[], Role[], void> {
        // Build array of CreepRoles in priority
        let rolesNeeded: Role[] = [];

        // Find all Roles Required for room functionality.
        for (let allFound = false; allFound == false;) {
            allFound = true;
            for (const role of Roles) {
                if (role in CreepClasses) {
                    const theRole = CreepClasses[role];
                    if (!theRole) continue;
                    let count: number = theRole.quantityWanted(room, rolesNeeded, true);
                    if (count > 0) allFound = false;
                    for (let i = 0; i < (count ? count : 0); i++) rolesNeeded.push(role);
                }
            }
        }

        Utils.Logger.log(`rolesNeeded Minimum: ${JSON.stringify(rolesNeeded)}`, INFO)
        yield rolesNeeded;

        // Find All Roles the the room could want.
        for (let allFound = false; allFound == false;) {
            allFound = true;
            for (const role of Roles) {
                if (role in CreepClasses) {
                    const theRole = CreepClasses[role as Role];
                    if (!theRole) continue;
                    let count: number = theRole.quantityWanted(room, rolesNeeded, false);

                    if (count > 0) allFound = false;
                    for (let i = 0; i < (count ? count : 0); i++) rolesNeeded.push(role as Role);
                }
            }
        }

        Utils.Logger.log(`rolesNeeded final: ${JSON.stringify(rolesNeeded)}`, INFO)
        yield rolesNeeded;
        return rolesNeeded;
    }

    /** Boolean check of if the schedule needs rebuilt */
    private static shouldRebuild(spawnSchedules: SpawnSchedule[], spawns: StructureSpawn[]): boolean {
        if (spawnSchedules.length !== spawns.length) {
            for (const spawn of spawns) {
                if (spawnSchedules && spawnSchedules.findIndex(s => s.spawnName === spawn.name) >= 0) continue;
                spawnSchedules.push(new SpawnSchedule(spawn.room.name, spawn.name));
            }
            spawns.length > 0 ? spawns[0].room.cache.spawnSchedules = spawnSchedules : undefined;
            return true;
        }
        return false;
    }

    /** Rebuilds the schedule */
    private static buildSchedules(room: Room, spawnSchedules: SpawnSchedule[]): void {
        // Reset conditional so as to not rebuild again next tick.
        spawnSchedules.forEach(function(s) { s.reset(); s.needsScheduled = false });

        // Add rolesNeeded to schedule based on generator return values, split as many times as the generator yields.
        let genRolesNeeded = this.genRolesNeeded(room);
        for (let genRolesNeededReturn = genRolesNeeded.next(); !genRolesNeededReturn.done; genRolesNeededReturn = genRolesNeeded.next()) {
            // Get rolesNeeded
            let rolesNeeded = genRolesNeededReturn.value;

            // Convert rolesNeeded to spawn orders, trim previously handled rolesNeeded.
            let spawnOrders: SpawnOrder[] | undefined = this.genSpawnOrders(room, rolesNeeded);
            if (spawnSchedules[0].rolesNeeded) spawnOrders.splice(0, spawnSchedules[0].rolesNeeded.length);
            // Set current rolesNeeded to schedules.
            for (const schedule of spawnSchedules) schedule.rolesNeeded = [...rolesNeeded];

            spawnOrders = this.addToSchedules(room, spawnOrders);

            Utils.Logger.log(`Failed to schedule ${spawnOrders ? spawnOrders.length : 0} spawn orders.`, INFO)
        }

    }

    /** Adds SpawnOrders to schedule. Assumes spawnSchedules !== undefined. */
    private static addToSchedules(room: Room, spawnOrders: SpawnOrder[] | undefined): SpawnOrder[] | undefined {
        let spawnSchedules = room.cache.spawnSchedules;
        if (!spawnSchedules) return;
        // Exact Prespawn only additions
        for (let spawnSchedule of spawnSchedules) {
            if (spawnSchedule.isFull() == true || !spawnOrders || spawnOrders.length == 0) continue;
            spawnOrders = spawnSchedule.add(spawnOrders, {preSpawnOnly: true});
            if (spawnSchedule.activeELimit !== room.spawnEnergyLimit) spawnSchedule.activeELimit = room.spawnEnergyLimit;
        }

        // All Standard Body Size Additions
        if (spawnOrders && spawnOrders.length > 0) {
            for (let spawnSchedule of spawnSchedules) {
                if (spawnSchedule.isFull() == true || !spawnOrders || spawnOrders.length == 0) continue;
                spawnOrders = spawnSchedule.add(spawnOrders);
                if (spawnSchedule.activeELimit !== room.spawnEnergyLimit) spawnSchedule.activeELimit = room.spawnEnergyLimit;
            }
        }

        // Desparate to spawn Additions (Body Size Shrinking)
        if (spawnOrders && spawnOrders.length > 0) {
            for (let spawnSchedule of spawnSchedules) {
                if (spawnSchedule.isFull() == true || !spawnOrders || spawnOrders.length == 0) continue;
                spawnOrders = spawnSchedule.add(spawnOrders, {shrinkBody: true});
                if (spawnSchedule.activeELimit !== room.spawnEnergyLimit) spawnSchedule.activeELimit = room.spawnEnergyLimit;
            }
        }

        room.cache.spawnSchedules = spawnSchedules;
        return spawnOrders;
    }

    /** Handles emergency conditions and emergency end */
    private static handleEmergency(spawnSchedule: SpawnSchedule, emergency: boolean): SpawnSchedule {
        let room = Game.rooms[spawnSchedule.roomName];
        if (emergency === true) {
            Utils.Logger.log(`SpawnSchedule ${spawnSchedule.roomName}_${spawnSchedule.spawnName} is experiencing an emergency halt: ${spawnSchedule.pausedTicks}.`, DEBUG);

            // Handle Restarting
            if (spawnSchedule.pausedTicks > 25 && room.localCreeps.trucker.length == 0 && room.controller && room.controller.level > 2) {
                // Handle Restarting if energy available
                let segment: BodyPartConstant[];
                let modifier: number;
                let role: Role;
                if (room.storage && room.storage.store.energy > (room.energyCapacityAvailable * 3)) {
                    segment = [CARRY, CARRY, MOVE];
                    modifier = Math.floor(room.energyAvailable / Utils.Utility.bodyCost(segment));
                    role = TRUCKER;
                } else {
                    segment = [WORK, CARRY, MOVE];
                    modifier = Math.floor(room.energyAvailable / Utils.Utility.bodyCost(segment));
                    role = HARVESTER;
                }

                let body: BodyPartConstant[] = [];
                for (let i = 0; i < modifier; i++) {
                    body.push(...segment);
                }

                let eResult = Game.spawns[spawnSchedule.spawnName].spawnCreep(body, 'RE' + role, { memory: {role: role, working: false, homeRoom: room.name }, energyStructures: (room.spawnEnergyStructures.length > 0 ? room.spawnEnergyStructures : undefined)})
                Utils.Logger.log(`SpawnSchedule ${spawnSchedule.roomName}_${spawnSchedule.spawnName} is spawning a restarter due to no truckers: ${eResult}. Body Length: ${body.length}. Body Cost: ${Utils.Utility.bodyCost(body)}. Available Energy: ${room.energyAvailable}`, DEBUG);
            }

            spawnSchedule.pausedTicks++;

            // Paused too long? Reset
            if (spawnSchedule.pausedTicks > 250) spawnSchedule.reset();

        } else if (emergency === false && spawnSchedule.pausedTicks !== 0) {
            if (spawnSchedule.pausedTicks > 100) {
                spawnSchedule.reset();
            } else if (spawnSchedule.pausedTicks > 10) {
                spawnSchedule.shift();
            }
            spawnSchedule.pausedTicks = 0;
        }
        return spawnSchedule;
    }

    /** Handles Spawning and Tick Incrementation */
    private static runSchedule(spawnSchedule: SpawnSchedule, spawnOrder: SpawnOrder | undefined): SpawnSchedule {
        // Handle Spawning
        if (spawnOrder) {
            let name = spawnOrder.id + "_" + Utils.Utility.truncateString(Game.time.toString(), 4, false);
            let spawn = Game.spawns[spawnSchedule.spawnName];
            spawn.spawnCreep(spawnOrder.body, name, { memory: spawnOrder.memory, energyStructures: (spawn.room.spawnEnergyStructures.length > 0 ? spawn.room.spawnEnergyStructures : undefined) });
        }
        // Increment tick, reseting to 0 when 1500 is reached.
        spawnSchedule.tick >= 1500 ? spawnSchedule.tick = 0 : spawnSchedule.tick++;
        return spawnSchedule;
    }


}
