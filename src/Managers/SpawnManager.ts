import { Utils } from '../utils/Index'
import { Roles } from '../Creeps/Index';
import { Role, Task, LogLevel, ProcessPriority } from '../utils/Enums'
import { Process } from 'Models/Process';
import SpawnSchedule from 'Models/SpawnSchedule';
import { Logger } from 'utils/Logger';

export default class SpawnManager {
    static scheduleSpawnMonitor(room: Room) {
        const roomId = room.name

        const spawnMonitorTask = () => {

            // TODO: Modify so newly built schedules adjust and account for existing creeps and their lifetimes.
            // TODO: Modify to allow for spawn-limiting due to security issues.

            let room = Game.rooms[roomId]
            Utils.Logger.log(`SpawnManager -> ${room.name}_spawn_monitor`, LogLevel.DEBUG)
            let spawns = room.spawns();
            if (!room.cache.spawnSchedules) room.cache.spawnSchedules = [];
            let spawnSchedules = room.cache.spawnSchedules;

            // room.getAvailableSpawn()
            // room.spawnCreep(role, availableSpawn)                           ////////// PROBABLY KILL THIS
            // room.shouldPreSpawn(spawn: StructureSpawn): Creep | undefined
            // room.scheduleSpawn(role: Role): void
            // room.shouldSpawn(role: Role): boolean
            // room.isSpawning(role: Role): boolean
            // room.spawnCreep(role: Role, spawn: StructureSpawn, memory?: CreepMemory): void
            // room.getAvailableSpawn(): StructureSpawn | undefined
            // room.sourcesEnergyPotential(): number
            // n WORK bodies in the room, on harvesters, x 2 per tick.
            // room.currentHarvesterWorkPotential(): number
            // n WORK bodies in the room, x 1 per tick.
            // room.scientistEnergyConsumption(): number
            // n WORK bodies in the room, x 1 per tick.
            // room.engineerEnergyConsumption(): number
            // n CARRY bodies in the room, on truckers, x 50.
            // room.truckersCarryCapacity(): number
            // room.averageDistanceFromSourcesToStructures(): number
            // room.sources(): Source[]
            // room.isSpawnDemandMet(): {met: boolean, demand: number}
            // room.isScientistDemandMet(): {met: boolean, demand: number}
            // room.scientistsWorkCapacity(): number
            // room.rampartHPTarget(): number
            // room.towers(): StructureTower[];
            // room.labs(): StructureLab[];
            // room.links(): StructureLink[];
            // room.nuker(): StructureNuker;
            // room.extractor(): StructureExtractor;
            // room.extensions(): StructureExtension[];
            // room.constructionSites(isBuilding?: BuildableStructureConstant): ConstructionSite[];
            // room.minerals(): Mineral[];
            // room.nextCreepToDie(): Creep | undefined

            // creep.upgradeEnergyConsumptionPerTick(): number
            // creep.buildEnergyConsumptionPerTick(): number
            // creep.repairEnergyConsumptionPerTick(): number
            // creep.dismantleEnergyConsumptionPerTick(): number
            // room.creeps(role?: Role): Creep[]
            // room.sourceWithMostDroppedEnergy(): Source | undefined
            // room.lowestSpawn(): StructureSpawn | undefined
            // room.lowestExtension(): StructureExtension | undefined
            // room.lowestTower(): StructureTower | undefined
            // room.lowestScientist(): Creep | undefined
            // source.validPositions(): RoomPosition[]
            // source.isHarvestingAtMaxEfficiency(): boolean
            // source.assignablePosition(): RoomPosition
            // source.droppedEnergy(): Resource | undefined

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
            if (room.cache.spawnSchedules.length !== spawns.length || rebuild == true) {
                Utils.Logger.log(`SpawnManager in spawnSchedule check`, LogLevel.DEBUG)
                spawnSchedules.forEach(s => s.reset());

                let minSpawnOrders: SpawnOrder[] | undefined = this.genSpawnOrders(room, true);
                Logger.log(`minSpawnOrders: ${JSON.stringify(minSpawnOrders)}`, LogLevel.DEBUG)


                for (let spawnSchedule of spawnSchedules) {
                    if (spawnSchedule.isFull() == true || !minSpawnOrders || minSpawnOrders.length == 0) continue;
                    minSpawnOrders = spawnSchedule.add(minSpawnOrders);
                }
                if (!minSpawnOrders || minSpawnOrders.length == 0) {
                    let extraSpawnOrders: SpawnOrder[] | undefined = this.genSpawnOrders(room);
                    Logger.log(`extraSpawnOrders: ${JSON.stringify(extraSpawnOrders)}`, LogLevel.DEBUG)

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
                    Utils.Logger.log(`SpawnSchedule ${spawnSchedule.roomName}_${spawnSchedule.spawnName} is experiencing an emergency halt: ${spawnSchedule.pausedTicks}.`, LogLevel.DEBUG);
                    spawnSchedule.pausedTicks++;

                    // Is there anything else to do in an emergency? Don't think so, but...
                } else if (emergency === false && spawnSchedule.pausedTicks !== 0) {
                    // If we don't have enough freespace, rebuild single schedule with the existing schedule, resorted by priority, else just shift.
                    if (spawnSchedule.pausedTicks > (1500 - spawnSchedule.usedSpace)) {
                        Utils.Logger.log(`Emergency for SpawnSchedule ${spawnSchedule.roomName}_${spawnSchedule.spawnName} hit RESCHEDULE requisites to clear`, LogLevel.DEBUG)
                    } else {
                        Utils.Logger.log(`Emergency for SpawnSchedule ${spawnSchedule.roomName}_${spawnSchedule.spawnName} hit SHIFT requisites to clear`, LogLevel.DEBUG)
                    }
                    spawnSchedule.pausedTicks = 0;
                }

                Utils.Logger.log(`SpawnManager schedule ${spawnSchedule.spawnName} tick: ${spawnSchedule.tick}`, LogLevel.DEBUG)
                if (emergency === false) {
                    // Handle Spawning
                    if (spawnOrder) {
                        Game.spawns[spawnSchedule.spawnName].spawnCreep(spawnOrder.body, this.genNameFor(spawnOrder.id), { memory: spawnOrder.memory })
                    }

                    spawnSchedule.tick >= 1500 ? spawnSchedule.tick = 0 : spawnSchedule.tick++;
                }

            }

            // Reconsider schedule when entering a freeSpace


            // ONLY SHIFT for prespawning when we have open space to move into! ALSO limit max shifting to space size

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
        Utils.Logger.log(`SpawnManager -> genSpawnOrders(${room.name}) with minimum: ${minimum}`, LogLevel.DEBUG)

        // Build array of CreepRoles in prio order
        let rolesNeeded: Role[] = [];

        for (let allFound = false; allFound == false;) {
            allFound = true;
            for (const role of Object.values(Role)) {
                if (role in Roles) {
                    let count: number = Roles[role].shouldSpawn(room, rolesNeeded, minimum);
                    if (count > 0) allFound = false;
                    for (let i = 0; i < count; i++) rolesNeeded.push(role);
                }
            }
        }

        Logger.log(`rolesNeeded for ${minimum ? minimum : false}: ${JSON.stringify(rolesNeeded)}`, LogLevel.DEBUG)

        // Build each SpawnOrder
        let spawnOrders: SpawnOrder[] = [];
        for (const role of rolesNeeded) {
            let roleName = Utils.Utility.truncateString(role);
            let roleCount = spawnOrders.filter(o => o.id.includes(roleName)).length;
            // TODO: Consider if we have logistical support for spawnTime value
            let body = Utils.Utility.getBodyFor(room, Roles[role].baseBody, Roles[role].segment)
            if (body.length === 0) {
                Logger.log(`SpawnManager.getBodyFor(${room.name}, ${role}) returned an empty body. WHY?!`, LogLevel.ERROR);
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

    static genTaskFor(role: Role, room: Room): Task | undefined { // Probably killing this
        Utils.Logger.log("SpawnManager -> generateTaskFor()", LogLevel.TRACE)
        switch (role) {
            case Role.HARVESTER:
                if (room.localCreeps.truckers.length < room.sources.length) {
                    return Task.HARVESTER_EARLY
                }
                return Task.HARVESTER_SOURCE
            case Role.TRUCKER:
                break;
            case Role.ENGINEER:
                return Task.ENGINEER_BUILDING;
        }
        return undefined
    }
}
