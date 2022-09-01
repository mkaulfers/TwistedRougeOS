import { Utils } from '../utils/Index'
import { Roles } from '../Creeps/Index';
import { Role, Task, LogLevel, ProcessPriority } from '../utils/Enums'
import { Process } from 'Models/Process';

export default class SpawnManager {
    static scheduleSpawnMonitor(room: Room) {
        const roomId = room.name

        const spawnMonitorTask = () => {
            let room = Game.rooms[roomId]
            // room.getAvailableSpawn()
            // room.spawnCreep(role, availableSpawn)
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
        }

        let newProcess = new Process(`${room.name}_spawn_monitor`, ProcessPriority.LOW, spawnMonitorTask)
        global.scheduler.addProcess(newProcess)
    }

    /**
     * Generates SpawnOrders for the minimum number of creeps to operate the room.
     * @param room The room to consider.
     */
    static genMinCreepOrders(room: Room) {

    }

    /**
     * Generates SpawnOrders for the extra creeps usable by the room.
     * @param room The room to consider.
     */
    static genExtraCreepOrders(room: Room) {

    }

    static getBodyFor(room: Room, role: Role): BodyPartConstant[] {
        Utils.Logger.log("Spawn -> getBodyFor()", LogLevel.TRACE)
        let tempBody: BodyPartConstant[] = []
        let tempSegment: BodyPartConstant[] = []

        switch (role) {
            case Role.ENGINEER:
                tempBody = Roles.Engineer.baseBody
                tempSegment = Roles.Engineer.segment
                break
            case Role.HARVESTER:
                tempBody = Roles.Harvester.baseBody
                tempSegment = Roles.Harvester.segment
                break
            case Role.SCIENTIST:
                tempBody = Roles.Scientist.baseBody
                tempSegment = Roles.Scientist.segment
                break
            case Role.TRUCKER:
                tempBody = Roles.Trucker.baseBody
                tempSegment = Roles.Trucker.segment
                break
            case Role.FILLER:
                tempBody = Roles.Filler.baseBody
                tempSegment = Roles.Filler.segment
        }

        let baseCost = this.bodyCost(tempBody)
        if (baseCost > room.energyAvailable) {
            return []
        }
        if (baseCost <= room.energyAvailable) {
            let additionalSegmentCount = Math.floor((room.energyAvailable - baseCost) / this.bodyCost(tempSegment))
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
                    default:
                        if (tempBody.length + tempSegment.length > 50) { return tempBody }
                        tempBody = tempBody.concat(tempSegment)
                }
            }
        }
        Utils.Logger.log(`Temp Body Length: ${tempBody.length}`, LogLevel.DEBUG)
        return tempBody
    }

    static bodyCost(body: BodyPartConstant[]): number {
        let sum = 0;
        for (let i in body)
            sum += BODYPART_COST[body[i]];
        return sum;
    }

    static generateNameFor(role: Role) {
        return Utils.Utility.truncateString(role) + "_" + Utils.Utility.truncateString(Game.time.toString(), 4, false)
    }

    static generateTaskFor(role: Role, room: Room): Task | undefined {
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
