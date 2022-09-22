import { Managers } from 'Managers/Index'
import { Utils } from 'utils/Index'
import { Logger } from 'utils/Logger'
import Roles from '../Creeps/Index'

import { Role, LogLevel } from '../utils/Enums'

type CreepFind = { [key in Role | 'all' | 'unknown']: Creep[] };
type LooseCreepFind = { [key in Role | 'all' | 'unknown']?: Creep[] };

declare global {
    interface Room {
        /**
         * A shorthand to global.cache.rooms[room.name]. You can use it for quick access the room's specific cache data object.
         */
        cache: RoomCache

        /* Game Object Getters */
        /**
         * @param ofType Filters returned cSites to just the Structure Type given.
         * @Returns Constructions sites in the room.
         * */
        constructionSites(ofType?: BuildableStructureConstant): ConstructionSite[];
        structures(ofType?: StructureConstant): Structure[];

        containers: StructureContainer[];
        extensions: StructureExtension[];
        extractor: StructureExtractor | undefined;
        factory: StructureFactory | undefined;
        invaderCores: StructureInvaderCore[];
        keeperLairs: StructureKeeperLair[];
        labs: StructureLab[];
        links: StructureLink[];
        localCreeps: CreepFind;
        mineral: Mineral | undefined;
        nuker: StructureNuker | undefined;
        observer: StructureObserver | undefined;
        portals: StructurePortal[];
        powerBank: StructurePowerBank | undefined;
        powerSpawn: StructurePowerSpawn | undefined;
        ramparts: StructureRampart[];
        roads: StructureRoad[];
        sources: Source[];
        spawns: StructureSpawn[];
        stationedCreeps: CreepFind;
        towers: StructureTower[];
        walls: StructureWall[];

        /* Custom Getters */
        getAvailableSpawn: StructureSpawn | undefined
        nextCreepToDie: Creep | undefined;
        lowestExtension: StructureExtension | undefined
        lowestScientist: Creep | undefined
        lowestSpawn: StructureSpawn | undefined
        lowestTower: StructureTower | undefined

        /* Other Functions */
        scheduleTasks(): void
        setFrontiers(room: Room): void
        updateCostMatrix(): void

        /* Other Calculations and Checks */
        areFastFillerExtensionsBuilt: boolean;
        /** Gets the distance from sources to each storage capable structure in the room. */
        averageDistanceFromSourcesToStructures: number;
        isSpawning(role: Role): boolean
        maxExtensionsAvail: number;
        maxLabsAvail: number;
        maxTowersAvail: number;
        /** Returns target goal for rampart HP in the room */
        rampartHPTarget: number;
    }
}

export default class Room_Extended extends Room {

    /*
    Game Object Getters
    */
    get cache() {
        return global.Cache.rooms[this.name] = global.Cache.rooms[this.name] || {};
    }

    set cache(value) {
        global.Cache.rooms[this.name] = value;
    }

    private _constructionSites: { [key: string]: ConstructionSite[] } | undefined;
    constructionSites(ofType?: BuildableStructureConstant) {
        if (!this._constructionSites) {
            this._constructionSites = {};
            this._constructionSites['all'] = [];
            for (const site of this.find(FIND_CONSTRUCTION_SITES)) {
                if (!this._constructionSites[site.structureType]) this._constructionSites[site.structureType] = [];
                this._constructionSites[site.structureType].push(site);
                this._constructionSites['all'].push(site);
            }
        }

        if (ofType) {
            return this._constructionSites[ofType] ? this._constructionSites[ofType] : [];
        }
        return this._constructionSites['all']
    }

    private _structures: { [key: string]: Structure[] } | undefined;
    structures(ofType?: StructureConstant) {
        if (!this._structures) {
            this._structures = {};
            this._structures['all'] = [];
            for (const site of this.find(FIND_STRUCTURES)) {
                if (!this._structures[site.structureType]) this._structures[site.structureType] = [];
                this._structures[site.structureType].push(site);
                this._structures['all'].push(site);
            }
        }

        if (ofType) {
            return this._structures[ofType] ? this._structures[ofType] : [];
        }
        return this._structures['all']
    }

    get containers() {
        const containers = this.structures(STRUCTURE_CONTAINER);
        return containers ? containers as StructureContainer[] : [];
    }

    get extensions() {
        const extensions = this.structures(STRUCTURE_EXTENSION);
        return extensions ? extensions as StructureExtension[] : [];
    }

    get extractor() {
        const extractors = this.structures(STRUCTURE_EXTRACTOR);
        return extractors[0] !== undefined ? extractors[0] as StructureExtractor : undefined;
    }

    get factory() {
        const factories = this.structures(STRUCTURE_FACTORY);
        return factories[0] !== undefined ? factories[0] as StructureFactory : undefined;
    }

    get invaderCores() {
        const invaderCores = this.structures(STRUCTURE_EXTENSION);
        return invaderCores ? invaderCores as StructureInvaderCore[] : [];
    }

    get keeperLairs() {
        const keeperLairs = this.structures(STRUCTURE_EXTENSION);
        return keeperLairs ? keeperLairs as StructureKeeperLair[] : [];
    }

    private _mineral: Mineral | undefined;
    get mineral() {
        if (this._mineral) return this._mineral;
        let minerals = this.find(FIND_MINERALS);
        return this._mineral = minerals[0] !== undefined ? minerals[0] : undefined;
    }

    get nuker() {
        const nukers = this.structures(STRUCTURE_NUKER);
        return nukers[0] !== undefined ? nukers[0] as StructureNuker : undefined;
    }

    get labs() {
        const labs = this.structures(STRUCTURE_LAB);
        return labs ? labs as StructureLab[] : [];
    }

    get links() {
        const links = this.structures(STRUCTURE_LINK);
        return links ? links as StructureLink[] : [];
    }

    get observer() {
        const observers = this.structures(STRUCTURE_OBSERVER);
        return observers[0] !== undefined ? observers[0] as StructureObserver : undefined;
    }

    get portals() {
        const portals = this.structures(STRUCTURE_PORTAL);
        return portals ? portals as StructurePortal[] : [];
    }

    get powerBank() {
        const powerBanks = this.structures(STRUCTURE_POWER_BANK);
        return powerBanks[0] !== undefined ? powerBanks[0] as StructurePowerBank : undefined;
    }

    get powerSpawn() {
        const powerSpawns = this.structures(STRUCTURE_POWER_SPAWN);
        return powerSpawns[0] !== undefined ? powerSpawns[0] as StructurePowerSpawn : undefined;
    }

    get roads() {
        const roads = this.structures(STRUCTURE_ROAD);
        return roads ? roads as StructureRoad[] : [];
    }

    private _sources: Source[] | undefined
    get sources() {
        if (this._sources) return this._sources;
        let sources = this.find(FIND_SOURCES);
        return this._sources = sources ? sources as Source[] : [];
    }

    get spawns() {
        const spawns = this.structures(STRUCTURE_SPAWN);
        return spawns ? spawns as StructureSpawn[] : [];
    }

    get towers() {
        const towers = this.structures(STRUCTURE_TOWER);
        return towers ? towers as StructureTower[] : [];
    }

    get walls() {
        const walls = this.structures(STRUCTURE_WALL);
        return walls ? walls as StructureWall[] : [];
    }

    private _localCreeps: CreepFind | undefined;
    get localCreeps() {
        if (!this._localCreeps) {
            let setup: LooseCreepFind = {};
            setup['all'] = [];
            setup['unknown'] = [];
            for (const role of Object.values(Role)) setup[role] = [];

            this._localCreeps = setup as CreepFind;

            for (const creep of this.find(FIND_MY_CREEPS)) {
                const role = creep.memory.role;
                if (!role || !(Object.values(Role).includes(role as Role))) {
                    this._localCreeps.unknown.push(creep);
                } else {
                    this._localCreeps[role as Role].push(creep);
                }
                this._localCreeps.all.push(creep);
            }
        }

        return this._localCreeps;
    }

    private _stationedCreeps: CreepFind | undefined;
    get stationedCreeps() {
        if (!this._stationedCreeps) {
            let setup: LooseCreepFind = {};
            setup['all'] = [];
            setup['unknown'] = [];
            for (const role of Object.values(Role)) setup[role] = [];

            this._stationedCreeps = setup as CreepFind;

            for (const creep of Object.values(Game.creeps)) {
                if (creep.memory.homeRoom !== this.name) continue;
                const role = creep.memory.role;
                if (!role || !(Object.values(Role).includes(role as Role))) {
                    this._stationedCreeps.unknown.push(creep);
                } else {
                    this._stationedCreeps[role as Role].push(creep);
                }
                this._stationedCreeps.all.push(creep);
            }
        }

        return this._stationedCreeps;
    }

    /*
    Custom Getters
    */

    private _availableSpawn: StructureSpawn | undefined;
    get getAvailableSpawn() {
        if (!this._availableSpawn) {
            for (const spawn of this.spawns) {
                if (spawn.spawning === null) return this._availableSpawn = spawn;
            }
        }
        return this._availableSpawn;
    }

    private _nextCreepToDie: Creep | undefined;
    get nextCreepToDie() {
        if (!this._nextCreepToDie) {
            for (const creep of this.stationedCreeps.all) {
                const gonnaLive = creep.ticksToLive ? creep.ticksToLive : 1500;
                const willLive = this._nextCreepToDie && this._nextCreepToDie.ticksToLive ? this._nextCreepToDie.ticksToLive : 1500;
                if (gonnaLive < willLive) this._nextCreepToDie = creep;
            }
        }
        return this._nextCreepToDie;
    }

    private _lowestExtension: StructureExtension | undefined;
    get lowestExtension() {
        if (this._lowestExtension) {
            for (const extension of this.extensions) if (extension.store.energy < (this._lowestExtension && this._lowestExtension.store.energy ? this._lowestExtension.store.energy : 200)) this._lowestExtension = extension;
        }
        return this._lowestExtension;
    }

    private _lowestScientist: Creep | undefined;
    get lowestScientist() {
        for (const scientist of this.localCreeps.scientist) if (scientist.store.energy < (this._lowestScientist && this._lowestScientist.store.energy ? this._lowestScientist.store.energy : 10000)) this._lowestScientist = scientist;
        return this._lowestScientist;
    }

    private _lowestSpawn: StructureSpawn | undefined;
    get lowestSpawn() {
        for (const spawn of this.spawns) if (spawn.store.energy < (this._lowestSpawn && this._lowestSpawn.store.energy ? this._lowestSpawn.store.energy : 200)) this._lowestSpawn = spawn;
        return this._lowestSpawn;
    }

    private _lowestTower: StructureTower | undefined;
    get lowestTower() {
        for (const tower of this.towers) if (tower.store.energy < (this._lowestTower && this._lowestTower.store.energy ? this._lowestTower.store.energy : 200)) this._lowestTower = tower;
        return this._lowestTower;
    }

    /*
    Other Functions
    */

    scheduleTasks() {
        Utils.Logger.log("Room -> setupTasks()", LogLevel.TRACE)
        Managers.UtilityManager.schedulePixelSale()
        Managers.ThreatManager.scheduleThreatMonitor(this)
        Managers.CreepManager.scheduleCreepTask(this)
        Managers.SpawnManager.scheduleSpawnMonitor(this)
        Managers.CreepManager.scheduleRoomTaskMonitor(this)
        Managers.LinkManager.schedule(this);
        Managers.ConstructionManager.scheduleConstructionMonitor(this)
        Managers.RemoteManager.scheduleRemoteMonitor(this)
    }

    setFrontiers(room: Room) {
        let frontiers: string[] = []
        let currentRoomGlobalPos = Utils.Utility.roomNameToCoords(this.name)

        let deltaX = 1;
        let deltaY = 0;
        let segmentLength = 1;

        let x = 0;
        let y = 0;
        let segmentPassed = 0;

        for (let k = 0; k < 120; ++k) {
            x += deltaX;
            y += deltaY;
            ++segmentPassed;

            Logger.log(`WX: ${currentRoomGlobalPos.wx + x} WY: ${currentRoomGlobalPos.wy + y}`, LogLevel.DEBUG)
            let prospectFrontier = Utils.Utility.roomNameFromCoords(currentRoomGlobalPos.wx + x, currentRoomGlobalPos.wy + y)
            let result = Game.map.describeExits(prospectFrontier)
            if (result != null && Game.map.getRoomStatus(prospectFrontier).status == Game.map.getRoomStatus(room.name).status) {
                frontiers.push(prospectFrontier)
            }

            if (segmentPassed == segmentLength) {
                segmentPassed = 0;
                let temp = deltaX;
                deltaX = -deltaY;
                deltaY = temp;

                if (deltaY == 0) {
                    ++segmentLength;
                }
            }
        }

        room.memory.frontiers = frontiers
    }

    updateCostMatrix() {
        let costMatrix = Utils.Utility.distanceTransform(this.name)
        this.cache.openSpaceCM = JSON.stringify(costMatrix.serialize());
    }

    /*
    Other Calculations and Checks
    */

    private _averageDistanceFromSourcesToStructures: number | undefined = undefined
    get averageDistanceFromSourcesToStructures(): number {
        if (!this._averageDistanceFromSourcesToStructures || Game.time % 1500 == 0) {
            let sources = this.sources
            let structures = this.structures();
            structures.filter((s) => { return ('store' in s) });
            let distance = 0
            for (let source of sources) {
                for (let structure of structures) {
                    distance += source.pos.getRangeTo(structure)
                }
            }
            this._averageDistanceFromSourcesToStructures = distance / (sources.length * structures.length)
        }
        return this._averageDistanceFromSourcesToStructures
    }

    private _areFastFillerExtensionsBuilt: boolean | undefined;
    get areFastFillerExtensionsBuilt() {
        if (!this._areFastFillerExtensionsBuilt) {
            if (!this.memory.blueprint) return this._areFastFillerExtensionsBuilt = false;
            let anchorPos = Utils.Utility.unpackPostionToRoom(this.memory.blueprint.anchor, this.name)
            let results = this.lookAtArea(anchorPos.y - 2, anchorPos.x - 2, anchorPos.y + 2, anchorPos.x + 2, true).filter(x => x.structure?.structureType == STRUCTURE_EXTENSION)
            if (results.length >= 14) {
                this._areFastFillerExtensionsBuilt = true;
            } else {
                this._areFastFillerExtensionsBuilt = false;
            }
        }
        return this._areFastFillerExtensionsBuilt;
    }

    isSpawning(role: Role): boolean {
        let subString = role.substring(0, 3)
        let spawns = this.find(FIND_MY_SPAWNS)
        for (let spawn of spawns) {

            let spawningName = spawn.name.substring(0, 3)
            if (spawningName == subString) {
                return true
            }
        }
        return false
    }

    private _maxExtensionsAvail: number | undefined;
    get maxExtensionsAvail(): number {
        if (!this._maxExtensionsAvail) {
            let controller = this.controller
            if (!controller) return 0;
            switch (controller.level) {
                case 1:
                    this._maxExtensionsAvail = 0;
                    break;
                case 2:
                    this._maxExtensionsAvail = 5;
                    break;
                case 3:
                    this._maxExtensionsAvail = 10;
                    break;
                case 4:
                    this._maxExtensionsAvail = 20;
                    break;
                case 5:
                    this._maxExtensionsAvail = 30;
                    break;
                case 6:
                    this._maxExtensionsAvail = 40;
                    break;
                case 7:
                    this._maxExtensionsAvail = 50;
                    break;
                case 8:
                    this._maxExtensionsAvail = 60;
                    break;
                default:
                    this._maxExtensionsAvail = 0;
                    break;
            }
        }
        return this._maxExtensionsAvail;
    }

    private _maxLabsAvail: number | undefined;
    get maxLabsAvail(): number {
        if (!this._maxLabsAvail) {
            let controller = this.controller
            if (!controller) return 0
            switch (controller.level) {
                case 1:
                case 2:
                case 3:
                case 4:
                case 5:
                    this._maxLabsAvail = 0;
                    break;
                case 6:
                    this._maxLabsAvail = 3;
                    break;
                case 7:
                    this._maxLabsAvail = 6;
                    break;
                case 8:
                    this._maxLabsAvail = 10;
                    break;
                default:
                    this._maxLabsAvail = 0;
                    break;
            }
        }
        return this._maxLabsAvail;
    }

    private _maxTowersAvail: number | undefined;
    get maxTowersAvail(): number {
        if (!this._maxTowersAvail) {
            let controller = this.controller
            if (!controller) return 0
            switch (controller.level) {
                case 1:
                case 2:
                    this._maxTowersAvail = 0;
                    break;
                case 3:
                case 4:
                    this._maxTowersAvail = 1;
                    break;
                case 5:
                case 6:
                    this._maxTowersAvail = 2;
                    break;
                case 7:
                    this._maxTowersAvail = 3;
                    break;
                case 8:
                    this._maxTowersAvail = 6;
                    break;
                default:
                    this._maxTowersAvail = 0;
                    break;
            }
        }
        return this._maxTowersAvail;
    }

    _rampartHPTarget: number | undefined;
    get rampartHPTarget() {
        if (!this._rampartHPTarget) {
            if (!this.controller) return 0;
            switch (this.controller.level) {
                case 1:
                case 2:
                case 3:
                    this._rampartHPTarget = 100000;
                    break;
                case 4:
                    this._rampartHPTarget = 500000;
                    break;
                case 5:
                    this._rampartHPTarget = 1000000;
                    break;
                case 6:
                    this._rampartHPTarget = 5000000;
                    break;
                case 7:
                case 8:
                    this._rampartHPTarget = 10000000;
                    break;
                default:
                    this._rampartHPTarget = 0;
                    break;
            }
        }
        return this._rampartHPTarget;
    }
}
