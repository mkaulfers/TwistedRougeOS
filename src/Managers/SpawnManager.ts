import { Utils } from '../utils/Index'
import Roles from '../Creeps/Index';
import { Role, Task, LogLevel, ProcessPriority } from '../utils/Enums'
import { Process } from 'Models/Process';
import SpawnSchedule from 'Models/SpawnSchedule';

export default class SpawnManager {
    static scheduleSpawnMonitor(room: Room) {
        const roomId = room.name

        const spawnMonitorTask = () => {

            // TODO: Modify to allow for spawn-limiting due to security issues.

            let room = Game.rooms[roomId]
            Utils.Logger.log(`SpawnManager -> ${room.name}_spawn_monitor`, LogLevel.TRACE)
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
                if (Utils.Logger.devLogLevel == LogLevel.INFO || Utils.Logger.devLogLevel == LogLevel.ALL) {
                    Utils.Logger.log(`SpawnManager schedule ${spawnSchedule.spawnName} tick: ${spawnSchedule.tick}, pausedTick: ${spawnSchedule.pausedTicks}.`, LogLevel.INFO)
                    let nextOrder = spawnSchedule.schedule.find((o) => o.scheduleTick && o.scheduleTick >= spawnSchedule.tick);
                    Utils.Logger.log(`SpawnManager schedule ${spawnSchedule.spawnName} nextOrder: ${nextOrder ? nextOrder.id : spawnSchedule.schedule[0].id} in ${nextOrder && nextOrder.scheduleTick ? nextOrder.scheduleTick - spawnSchedule.tick : spawnSchedule.schedule[0].scheduleTick ? 1500 + spawnSchedule.schedule[0].scheduleTick - spawnSchedule.tick : undefined} ticks.`, LogLevel.INFO)
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
                if (_.any(spawnSchedules, (s) => s.activeELimit !== room.spawnEnergyLimit || s.rolesNeeded !== this.genRolesNeeded(room))) {
                    for (const spawnSchedule of spawnSchedules) spawnSchedule.reset();
                } else {
                    // Adjust for prespawning at 1500
                    for (const spawnSchedule of spawnSchedules) spawnSchedule.shift();
                }
            }

            room.cache.spawnSchedules = spawnSchedules;
        }

        let newProcess = new Process(`${room.name}_spawn_monitor`, ProcessPriority.LOW, spawnMonitorTask)
        global.scheduler.addProcess(newProcess)
    }

    /**
     * Generates SpawnOrders for the room
     * @param room The room to consider.
     * @param minimum Limits SpawnOrder generation to just ones considered required for room functionality.
     */
    private static genSpawnOrders(room: Room, spawnSchedules: SpawnSchedule[], rolesWanted?: Role[]): SpawnOrder[] {
        Utils.Logger.log(`SpawnManager -> genSpawnOrders(${room.name})`, LogLevel.TRACE)

        // Build array of CreepRoles in priority
        let rolesNeeded: Role[] = rolesWanted ? rolesWanted : this.genRolesNeeded(room);
        for (const schedule of spawnSchedules) schedule.rolesNeeded = rolesNeeded;


        // Build each SpawnOrder
        let spawnOrders: SpawnOrder[] = [];
        for (const role of rolesNeeded) {
            let roleName = Utils.Utility.truncateString(role);
            let roleCount = spawnOrders.filter(o => o.id.includes(roleName)).length;
            const theRole = Roles[role];
            if (!theRole) continue;
            if (!theRole.partLimits || theRole.partLimits.length == 0) theRole.partLimits = Utils.Utility.buildPartLimits(theRole.baseBody, theRole.segment);
            let partLimits: number[] = theRole.partLimits;
            if (!theRole[room.spawnEnergyLimit]) theRole[room.spawnEnergyLimit] = Utils.Utility.getBodyFor(room, theRole.baseBody, theRole.segment, partLimits);
            let body = theRole[room.spawnEnergyLimit];

            if (body.length === 0) {
                Utils.Logger.log(`SpawnManager.getBodyFor(${room.name}, ${role}) returned an empty body. WHY?!`, LogLevel.ERROR);
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

    private static genRolesNeeded(room: Room): Role[] {
        // Build array of CreepRoles in priority
        let rolesNeeded: Role[] = [];

        // Repeatedly runs through .quantityWanted() until all return 0;
        for (let allFound = false; allFound == false;) {
            allFound = true;
            for (const role of Object.values(Role)) {
                if (role in Roles) {

                    const theRole = Roles[role];
                    if (!theRole) continue;
                    let count: number = theRole.quantityWanted(room, rolesNeeded, true);
                    if (count > 0) allFound = false;
                    for (let i = 0; i < (count ? count : 0); i++) rolesNeeded.push(role);
                }
            }
        }

        // Repeatedly runs through .quantityWanted() until all return 0;
        for (let allFound = false; allFound == false;) {
            allFound = true;
            for (const role of Object.values(Role)) {
                if (role in Roles) {

                    const theRole = Roles[role];
                    if (!theRole) continue;
                    let count: number = theRole.quantityWanted(room, rolesNeeded, false);

                    if (count > 0) allFound = false;
                    for (let i = 0; i < (count ? count : 0); i++) rolesNeeded.push(role);
                }
            }
        }

        Utils.Logger.log(`rolesNeeded final: ${JSON.stringify(rolesNeeded)}`, LogLevel.INFO)

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


        let spawnOrders: SpawnOrder[] | undefined = this.genSpawnOrders(room, spawnSchedules);

        spawnOrders = this.addToSchedules(room, spawnOrders);

        Utils.Logger.log(`Failed to schedule ${spawnOrders ? spawnOrders.length : 0} spawn orders.`, LogLevel.INFO)
    }

    /** Adds SpawnOrders to schedule. Assumes spawnSchedules !== undefined. */
    private static addToSchedules(room: Room, spawnOrders: SpawnOrder[] | undefined): SpawnOrder[] | undefined {
        let spawnSchedules = room.cache.spawnSchedules;
        if (!spawnSchedules) return;
        for (let spawnSchedule of spawnSchedules) {
            if (spawnSchedule.isFull() == true || !spawnOrders || spawnOrders.length == 0) continue;
            spawnOrders = spawnSchedule.add(spawnOrders);
            if (spawnSchedule.activeELimit !== room.spawnEnergyLimit) spawnSchedule.activeELimit = room.spawnEnergyLimit;
        }
        room.cache.spawnSchedules = spawnSchedules;
        return spawnOrders;
    }

    /** Handles emergency conditions and emergency end */
    private static handleEmergency(spawnSchedule: SpawnSchedule, emergency: boolean): SpawnSchedule {
        let room = Game.rooms[spawnSchedule.roomName];
        if (emergency === true) {
            Utils.Logger.log(`SpawnSchedule ${spawnSchedule.roomName}_${spawnSchedule.spawnName} is experiencing an emergency halt: ${spawnSchedule.pausedTicks}.`, LogLevel.DEBUG);

            // Handle Restarting
            if (spawnSchedule.pausedTicks > 25 && room.localCreeps.trucker.length == 0 && room.controller && room.controller.level > 2) {
                // Handle Restarting if energy available
                let segment: BodyPartConstant[];
                let modifier: number;
                let role: Role;
                if (room.storage && room.storage.store.energy > (room.energyCapacityAvailable * 3)) {
                    segment = [CARRY, CARRY, MOVE];
                    modifier = Math.floor(room.energyAvailable / Utils.Utility.bodyCost(segment));
                    role = Role.TRUCKER;
                } else {
                    segment = [WORK, CARRY, MOVE];
                    modifier = Math.floor(room.energyAvailable / Utils.Utility.bodyCost(segment));
                    role = Role.HARVESTER;
                }

                let body: BodyPartConstant[] = [];
                for (let i = 0; i < modifier; i++) {
                    body.push(...segment);
                }

                let eResult = Game.spawns[spawnSchedule.spawnName].spawnCreep(body, 'RE' + role, { memory: {role: role, working: false, homeRoom: room.name } })
                Utils.Logger.log(`SpawnSchedule ${spawnSchedule.roomName}_${spawnSchedule.spawnName} is spawning a restarter due to no truckers: ${eResult}. Body Length: ${body.length}. Body Cost: ${Utils.Utility.bodyCost(body)}. Available Energy: ${room.energyAvailable}`, LogLevel.DEBUG);
            }

            // Paused too long? Reset
            if (spawnSchedule.pausedTicks > 250) spawnSchedule.reset();

            spawnSchedule.pausedTicks++;

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
            Game.spawns[spawnSchedule.spawnName].spawnCreep(spawnOrder.body, name, { memory: spawnOrder.memory });
        }
        // Increment tick, reseting to 0 when 1500 is reached.
        spawnSchedule.tick >= 1500 ? spawnSchedule.tick = 0 : spawnSchedule.tick++;
        return spawnSchedule;
    }
}
