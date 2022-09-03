import { Utils } from '../utils/Index'
import { Roles } from '../Creeps/Index';
import { Role, Task, LogLevel, ProcessPriority } from '../utils/Enums'
import { Process } from 'Models/Process';
import SpawnSchedule from 'Models/SpawnSchedule';

export default class SpawnManager {
    static scheduleSpawnMonitor(room: Room) {
        const roomId = room.name

        const spawnMonitorTask = () => {
            // TODO: Modify so newly built schedules adjust and account for existing creeps and their lifetimes.
            // TODO: Modify to allow for spawn-limiting due to security issues.

            let room = Game.rooms[roomId]
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
            if (spawnSchedules.length !== spawns.length) {
                for (const spawn of spawns) {
                    if (spawnSchedules && spawnSchedules.findIndex(s => s.spawnName === spawn.name) >= 0) continue;
                    spawnSchedules.push(new SpawnSchedule(room.name, spawn.name));
                }
            }

            // New Spawns? Rebuild schedule
            if (room.cache.spawnSchedules.length !== spawns.length) {
                spawnSchedules.forEach(s => s.reset());

                let minSpawnOrders: SpawnOrder[] | undefined = this.genMinSpawnOrders(room);

                for (let spawnSchedule of spawnSchedules) {
                    if (spawnSchedule.isFull() == true || !minSpawnOrders || minSpawnOrders.length == 0) continue;
                    minSpawnOrders = spawnSchedule.add(minSpawnOrders);
                }
                if (!minSpawnOrders || minSpawnOrders.length == 0) {
                    let extraSpawnOrders: SpawnOrder[] | undefined = this.genExtraSpawnOrders(room);
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
                    Utils.Logger.log(`SpawnSchedule ${spawnSchedule.roomName}_${spawnSchedule.spawnName} is experiencing an emergency halt.`, LogLevel.DEBUG);
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

                if (emergency === false) {
                    // Handle Spawning
                    if (spawnOrder) {
                        Game.spawns[spawnSchedule.spawnName].spawnCreep(spawnOrder.body, this.generateNameFor(spawnOrder.memory.role as Role), { memory: spawnOrder.memory })
                    }
                    spawnSchedule.tick++;
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
     * Generates SpawnOrders for the minimum number of creeps to operate the room.
     * @param room The room to consider.
     */
    static genMinSpawnOrders(room: Room): SpawnOrder[] {
        // Do we have full logistical support? IFF not, calculate spawntimes based on required time to fill system

        // Array of CreepRoles in prio order
        let rolesNeeded: Role[] = [];

        for (const role of Object.values(Role)) {
            if (role in Roles) {
                let count: number = Roles[role].shouldSpawn(room, true);
                for (let i = 0; i < count; i++) {
                    rolesNeeded.push(role);
                }
            }
        }

        // Build each SpawnOrder

        return []
    }

    /**
     * Generates SpawnOrders for the extra creeps usable by the room.
     * @param room The room to consider.
     */
    static genExtraSpawnOrders(room: Room): SpawnOrder[] {
        // Do we have full logistical support? IFF not, calculate spawntimes based on required time to fill system

        return []
    }

    static getBodyFor(room: Room, role: Role): BodyPartConstant[] {
        Utils.Logger.log("Spawn -> getBodyFor()", LogLevel.TRACE)
        let tempBody: BodyPartConstant[] = []
        let tempSegment: BodyPartConstant[] = []

        switch (role) {
            case Role.ENGINEER:
                tempBody = Roles.engineer.baseBody
                tempSegment = Roles.engineer.segment
                break
            case Role.HARVESTER:
                tempBody = Roles.harvester.baseBody
                tempSegment = Roles.harvester.segment
                break
            case Role.SCIENTIST:
                tempBody = Roles.scientist.baseBody
                tempSegment = Roles.scientist.segment
                break
            case Role.TRUCKER:
                tempBody = Roles.trucker.baseBody
                tempSegment = Roles.trucker.segment
                break
            case Role.FILLER:
                tempBody = Roles.filler.baseBody
                tempSegment = Roles.filler.segment
            case Role.AGENT:
                tempBody = Roles.agent.baseBody
                tempSegment = Roles.agent.segment
        }

        let baseCost = Utils.Utility.bodyCost(tempBody)
        if (baseCost > room.energyAvailable) {
            return []
        }
        if (baseCost <= room.energyAvailable) {
            let additionalSegmentCount = Math.floor((room.energyAvailable - baseCost) / Utils.Utility.bodyCost(tempSegment))
            for (let i = 0; i < additionalSegmentCount && tempBody.length < 50; i++) {
                switch (role) {
                    case Role.HARVESTER:
                        if (tempBody.filter(x => x == WORK).length >= 5) { return tempBody }
                        tempBody = tempBody.concat(tempSegment)
                        break
                    case Role.FILLER:
                        if (tempBody.filter(x => x == CARRY).length >= 22) { return tempBody }
                        tempBody = tempBody.concat(tempSegment)
                    //TODO: Add more role restrictions, for example at RCL 8 there is a max amount for upgrading.
                    //TODO: Sort the body parts before returning.
                    //TODO: Perhaps set a wait timer to bigger bodies are spawned instead of a bunch of small ones.
                    case Role.AGENT:
                        return tempBody
                    default:
                        if (tempBody.length + tempSegment.length > 50) { return tempBody }
                        tempBody = tempBody.concat(tempSegment)
                }
            }
        }
        Utils.Logger.log(`Temp Body Length: ${tempBody.length}`, LogLevel.DEBUG)
        return tempBody
    }

    static generateNameFor(role: Role) {
        return Utils.Utility.truncateString(role) + 0 + "_" + Utils.Utility.truncateString(Game.time.toString(), 4, false)
    }

    static generateTaskFor(role: Role, room: Room): Task | undefined { // Probably killing this
        Utils.Logger.log("Spawn -> generateTaskFor()", LogLevel.TRACE)
        switch (role) {
            case Role.HARVESTER:
                if (room.creeps(Role.TRUCKER).length < room.find(FIND_SOURCES).length) {
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
