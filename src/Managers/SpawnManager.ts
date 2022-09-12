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
            let spawns = room.spawns();
            if (!room.cache.spawnSchedules) room.cache.spawnSchedules = [];
            let spawnSchedules = room.cache.spawnSchedules;

            // For each spawn ensure we have a schedule
            let rebuild = false;
            if (spawnSchedules.length !== spawns.length) {
                for (const spawn of spawns) {
                    if (spawnSchedules && spawnSchedules.findIndex(s => s.spawnName === spawn.name) >= 0) continue;
                    spawnSchedules.push(new SpawnSchedule(room.name, spawn.name));
                    rebuild = true;
                }
            }
            // New Spawns? Rebuild schedule
            if (room.cache.spawnSchedules.length !== spawns.length || rebuild == true || _.any(spawnSchedules, (s) => s.needsScheduled == true)) {
                spawnSchedules.forEach(function(s) { s.reset(); s.needsScheduled = false });

                let minSpawnOrders: SpawnOrder[] | undefined = this.genSpawnOrders(room, true);
                Utils.Logger.log(`minSpawnOrders: ${JSON.stringify(minSpawnOrders)}`, LogLevel.INFO)


                for (let spawnSchedule of spawnSchedules) {
                    if (spawnSchedule.isFull() == true || !minSpawnOrders || minSpawnOrders.length == 0) continue;
                    minSpawnOrders = spawnSchedule.add(minSpawnOrders);
                }
                if (!minSpawnOrders || minSpawnOrders.length == 0) {
                    let extraSpawnOrders: SpawnOrder[] | undefined = this.genSpawnOrders(room);
                    Utils.Logger.log(`extraSpawnOrders: ${JSON.stringify(extraSpawnOrders)}`, LogLevel.INFO)

                    for (let spawnSchedule of spawnSchedules) {
                        if (spawnSchedule.isFull() == true || !extraSpawnOrders || extraSpawnOrders.length == 0) continue;
                        extraSpawnOrders = spawnSchedule.add(extraSpawnOrders);
                    }
                }
            }

            // Emergencies and SpawnChecks
            for (let spawnSchedule of spawnSchedules) {
                let spawnOrder: SpawnOrder | undefined = spawnSchedule.schedule.find(o => o.scheduleTick == spawnSchedule.tick);

                // Handle Emergencies
                let emergency = false;
                if (Game.spawns[spawnSchedule.spawnName].spawning && spawnOrder ||
                    spawnOrder && room.energyAvailable < Utils.Utility.bodyCost(spawnOrder.body) ||
                    room.cache.pauseSpawning && room.cache.pauseSpawning == true) emergency = true;

                if (emergency === true) {
                    Utils.Logger.log(`SpawnSchedule ${spawnSchedule.roomName}_${spawnSchedule.spawnName} is experiencing an emergency halt: ${spawnSchedule.pausedTicks}.`, LogLevel.INFO);

                    if (spawnSchedule.pausedTicks > 0 && room.localCreeps.truckers.length == 0) {
                        Utils.Logger.log(`SpawnSchedule ${spawnSchedule.roomName}_${spawnSchedule.spawnName} is spawning a restarter due to no truckers.`, LogLevel.ERROR);
                        let body = [CARRY, CARRY, MOVE];
                        let segment = [CARRY, CARRY, MOVE];
                        let modifier = Math.floor(room.energyAvailable / Utils.Utility.bodyCost(body));
                        for (let i = 0; i < modifier; i++) {
                            body.push(...segment);
                        }
                        Game.spawns[spawnSchedule.spawnName].spawnCreep(body, 're.00', { memory: {role: 'trucker', working: false, homeRoom: room.name } })
                    }

                    spawnSchedule.pausedTicks++;

                    // Is there anything else to do in an emergency? Don't think so, but...
                } else if (emergency === false && spawnSchedule.pausedTicks !== 0) {
                    // TODO: Make emergency handling better
                    if (spawnSchedule.pausedTicks > 100) {
                        spawnSchedule.reset();
                    }
                    spawnSchedule.pausedTicks = 0;
                }

                if (emergency === false) {
                    // Handle Spawning
                    if (spawnOrder) {
                        Game.spawns[spawnSchedule.spawnName].spawnCreep(spawnOrder.body, this.genNameFor(spawnOrder.id), { memory: spawnOrder.memory })
                    }

                    spawnSchedule.tick >= 1500 ? spawnSchedule.tick = 0 : spawnSchedule.tick++;
                }

            }

            // TODO: Make as cheap as possible to reconsider
            // Reconsider schedule every 1500 ticks
            if (_.any(spawnSchedules, (s) => s.tick == 1500)) {
                for (const spawnSchedule of spawnSchedules) spawnSchedule.reset();
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
    static genSpawnOrders(room: Room, minimum?: boolean): SpawnOrder[] {
        Utils.Logger.log(`SpawnManager -> genSpawnOrders(${room.name}) with minimum: ${minimum}`, LogLevel.TRACE)

        // Build array of CreepRoles in prio order
        let rolesNeeded: Role[] = [];

        for (let allFound = false; allFound == false;) {
            allFound = true;
            for (const role of Object.values(Role)) {
                if (role in Roles) {
                    let count: number = Roles[role].quantityWanted(room, rolesNeeded, minimum);
                    if (count > 0) allFound = false;
                    for (let i = 0; i < count; i++) rolesNeeded.push(role);
                }
            }
        }

        Utils.Logger.log(`rolesNeeded for ${minimum ? minimum : false}: ${JSON.stringify(rolesNeeded)}`, LogLevel.INFO)

        // Build each SpawnOrder
        let spawnOrders: SpawnOrder[] = [];
        for (const role of rolesNeeded) {
            let roleName = Utils.Utility.truncateString(role);
            let roleCount = spawnOrders.filter(o => o.id.includes(roleName)).length;
            // TODO: Consider if we have logistical support for spawnTime value
            let body = Utils.Utility.getBodyFor(room, Roles[role].baseBody, Roles[role].segment, Roles[role].partLimits ? Roles[role].partLimits : undefined)
            if (body.length === 0) {
                Utils.Logger.log(`SpawnManager.getBodyFor(${room.name}, ${role}) returned an empty body. WHY?!`, LogLevel.ERROR);
                continue;
            }
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



    /** Generates a name: XXXYY_ZZZZ, X being the role, Y being the count position in the spawn schedule, and Z being game time */
    static genNameFor(id: string, spawnScheduleNumber?: number) {
        // let stringSSN = spawnScheduleNumber ? spawnScheduleNumber.toString().length < 2 ? '0' + spawnScheduleNumber.toString() : spawnScheduleNumber.toString() : '00';
        // return Utils.Utility.truncateString(role) + stringSSN + "_" + Utils.Utility.truncateString(Game.time.toString(), 4, false)
        return id + "_" + Utils.Utility.truncateString(Game.time.toString(), 4, false)
    }

}
