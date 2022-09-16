import { Managers } from 'Managers/Index'
import { Utils } from 'utils/Index'
import { Logger } from 'utils/Logger'
import Roles from '../Creeps/Index'

import { Role, LogLevel } from '../utils/Enums'

declare global {
    interface Room {
        /**
         * A shorthand to global.cache.rooms[room.name]. You can use it for quick access the room's specific cache data object.
         */
        cache: RoomCache

        /* Game Object Getters */
        /**
         * @param isBuilding Filters returned cSites to just the Structure Type given.
         * @Returns Constructions sites in the room.
         * */
        constructionSites(ofType?: BuildableStructureConstant): ConstructionSite[];
        extensions: StructureExtension[];
        extractor: StructureExtractor | undefined;
        mineral: Mineral | undefined;
        nuker: StructureNuker | undefined;
        labs: StructureLab[];
        links: StructureLink[];
        observer: StructureObserver | undefined;
        sources: Source[];
        spawns: StructureSpawn[];
        /** A room's towers, as found within the last 100 ticks || last time one died. */
        towers: StructureTower[];

        localCreeps: {
            all: Creep[],
            harvesters: Creep[],
            scientists: Creep[],
            truckers: Creep[],
            engineers: Creep[],
            fillers: Creep[],
            agents: Creep[],
            networkHarvesters: Creep[],
            networkHaulers: Creep[],
            networkEngineers: Creep[]
        };
        stationedCreeps: {
            all: Creep[]
            harvesters: Creep[],
            scientists: Creep[],
            truckers: Creep[],
            engineers: Creep[],
            fillers: Creep[],
            agents: Creep[],
            networkHarvesters: Creep[],
            networkHaulers: Creep[],
            networkEngineers: Creep[]
        };

        /* Custom Getters */
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
        averageDistanceFromSourcesToStructures: number;getAvailableSpawn: StructureSpawn | undefined
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

    private _constructionSites: {[key: string]: ConstructionSite[]} | undefined;
    constructionSites(ofType?: BuildableStructureConstant) {
        if (!this._constructionSites) {
            this._constructionSites = {};
            this._constructionSites['all'] = [];
            for (const site of this.find(FIND_MY_CONSTRUCTION_SITES)) {
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

    // TODO: Rewrite so one find & filter
    private _extensions: StructureExtension[] | undefined;
    get extensions() {
        if (!this._extensions) this._extensions = this.find(FIND_MY_STRUCTURES).filter(x => x.structureType == STRUCTURE_EXTENSION) as StructureExtension[]
        return this.find(FIND_MY_STRUCTURES).filter(x => x.structureType == STRUCTURE_EXTENSION) as StructureExtension[]
    }

    get extractor() {
        return undefined;
    }

    get minerals() {
        return this.find(FIND_MINERALS);
    }

    get nuker() {
        return undefined;
    }

    get labs() {
        return this.find(FIND_MY_STRUCTURES, { filter: { structureType: STRUCTURE_LAB } }) as StructureLab[]
    }

    get links() {
        return [];
    }

    get observer() {
        let observers: StructureObserver[] = this.find(FIND_STRUCTURES, { filter: { StructureType: STRUCTURE_OBSERVER } });
        return observers[0] ? observers[0] : undefined;
    }

    _sources: Source[] | undefined
    get sources() {
        if (this._sources) { return this._sources }
        return this._sources = this.find(FIND_SOURCES)
    }

    get spawns() {
        let mySpawns = this.find(FIND_MY_SPAWNS);
        if (mySpawns) {
            return mySpawns;
        } else {
            return this.find(FIND_HOSTILE_SPAWNS);
        }
    }

    get towers() {
        if (!this.cache.towers || Game.time % 100 == 0) {
            let towers: StructureTower[] = this.find(FIND_STRUCTURES, { filter: { structureType: STRUCTURE_TOWER } });
            if (towers.length == 0) return [];
            let towerIds: Id<StructureTower>[] = [];
            towers.forEach((t) => towerIds.push(t.id as Id<StructureTower>));

            this.cache.towers = towerIds;
            return towers;
        } else {
            let towers: StructureTower[] = [];
            let recalc = false;

            for (let tid of this.cache.towers) {
                let tower = Game.getObjectById(tid);
                if (tower == null) {
                    recalc = true;
                    continue;
                }
                towers.push(tower);
            }

            if (recalc == true) this.cache.towers = [];
            if (towers.length == 0) return [];
            return towers;
        }
    }

    _localCreeps: {
        all: Creep[],
        harvesters: Creep[],
        scientists: Creep[],
        truckers: Creep[],
        engineers: Creep[],
        fillers: Creep[],
        agents: Creep[],
        networkHarvesters: Creep[],
        networkHaulers: Creep[],
        networkEngineers: Creep[]
    } | undefined

    get localCreeps(): {
        all: Creep[],
        harvesters: Creep[],
        scientists: Creep[],
        truckers: Creep[],
        engineers: Creep[],
        fillers: Creep[],
        agents: Creep[],
        networkHarvesters: Creep[],
        networkHaulers: Creep[],
        networkEngineers: Creep[]
    } {
        if (this._localCreeps) { return this._localCreeps }
        let all: Creep[] = []
        let harvesters: Creep[] = []
        let scientists: Creep[] = []
        let truckers: Creep[] = []
        let engineers: Creep[] = []
        let fillers: Creep[] = []
        let agents: Creep[] = []
        let networkHarvesters: Creep[] = []
        let networkHaulers: Creep[] = []
        let networkEngineers: Creep[] = []

        for (let creep of this.find(FIND_MY_CREEPS)) {
            all.push(creep)
            switch (creep.memory.role) {
                case Role.HARVESTER:
                    harvesters.push(creep)
                    break
                case Role.SCIENTIST:
                    scientists.push(creep)
                    break
                case Role.TRUCKER:
                    truckers.push(creep)
                    break
                case Role.ENGINEER:
                    engineers.push(creep)
                    break
                case Role.FILLER:
                    fillers.push(creep)
                    break
                case Role.AGENT:
                    agents.push(creep)
                    break
                case Role.NETWORK_HARVESTER:
                    networkHarvesters.push(creep)
                    break
                case Role.NETWORK_HAULER:
                    networkHaulers.push(creep)
                    break
                case Role.NETWORK_ENGINEER:
                    networkEngineers.push(creep)
                    break
            }
        }

        this._localCreeps = {
            all: all,
            harvesters: harvesters,
            scientists: scientists,
            truckers: truckers,
            engineers: engineers,
            fillers: fillers,
            agents: agents,
            networkHarvesters: networkHarvesters,
            networkHaulers: networkHaulers,
            networkEngineers: networkEngineers
        }

        return this._localCreeps
    }

    _stationedCreeps: {
        all: Creep[],
        harvesters: Creep[],
        scientists: Creep[],
        truckers: Creep[],
        engineers: Creep[],
        fillers: Creep[],
        agents: Creep[],
        networkHarvesters: Creep[],
        networkHaulers: Creep[]
        networkEngineers: Creep[]
    } | undefined

    get stationedCreeps(): {
        all: Creep[],
        harvesters: Creep[],
        scientists: Creep[],
        truckers: Creep[],
        engineers: Creep[],
        fillers: Creep[],
        agents: Creep[],
        networkHarvesters: Creep[],
        networkHaulers: Creep[],
        networkEngineers: Creep[]
    } {
        if (this._stationedCreeps) { return this._stationedCreeps }
        let all: Creep[] = []
        let harvesters: Creep[] = []
        let scientists: Creep[] = []
        let truckers: Creep[] = []
        let engineers: Creep[] = []
        let fillers: Creep[] = []
        let agents: Creep[] = []
        let networkHarvesters: Creep[] = []
        let networkHaulers: Creep[] = []
        let networkEngineers: Creep[] = []

        for (let name in Memory.creeps) {
            let creep = Game.creeps[name]
            if (creep && creep.memory.homeRoom === this.name) {
                all.push(creep)
                switch (creep.memory.role) {
                    case Role.HARVESTER:
                        harvesters.push(creep)
                        break
                    case Role.SCIENTIST:
                        scientists.push(creep)
                        break
                    case Role.TRUCKER:
                        truckers.push(creep)
                        break
                    case Role.ENGINEER:
                        engineers.push(creep)
                        break
                    case Role.FILLER:
                        fillers.push(creep)
                        break
                    case Role.AGENT:
                        agents.push(creep)
                        break
                    case Role.NETWORK_HARVESTER:
                        networkHarvesters.push(creep)
                        break
                    case Role.NETWORK_HAULER:
                        networkHaulers.push(creep)
                        break
                    case Role.NETWORK_ENGINEER:
                        networkEngineers.push(creep)
                        break
                }
            }
        }

        this._stationedCreeps = {
            all: all,
            harvesters: harvesters,
            scientists: scientists,
            truckers: truckers,
            engineers: engineers,
            fillers: fillers,
            agents: agents,
            networkHarvesters: networkHarvesters,
            networkHaulers: networkHaulers,
            networkEngineers: networkEngineers
        }

        return this._stationedCreeps
    }

    /*
    Custom Getters
    */

    get getAvailableSpawn() {
        let spawns = this.find(FIND_MY_SPAWNS)
        for (let spawn of spawns) {
            if (spawn.spawning == null) {
                return spawn
            }
        }
        return undefined
    }

    get nextCreepToDie() {
        let creeps = this.localCreeps.all
        let nextCreepToDie: Creep | undefined = undefined
        for (let creep of creeps) {
            if (!nextCreepToDie) { nextCreepToDie = creep }
            if (creep.ticksToLive && nextCreepToDie.ticksToLive) {
                if (creep.ticksToLive < nextCreepToDie.ticksToLive) {
                    nextCreepToDie = creep
                }
            }
        }
        Logger.log(`Next Creep To Die: ${nextCreepToDie ? nextCreepToDie.name : "None"}`, LogLevel.INFO)
        return nextCreepToDie
    }

    get lowestExtension() {
        let extensions = this.find(FIND_MY_STRUCTURES).filter(x => x.structureType == STRUCTURE_EXTENSION) as StructureExtension[]
        let lowestExtension = undefined
        for (let extension of extensions) {
            if (!lowestExtension) { lowestExtension = extension }
            if (extension.store.energy < lowestExtension.store.energy) {
                lowestExtension = extension
            }
        }
        return lowestExtension
    }

    get lowestScientist() {
        let scientists = this.localCreeps.scientists
        let lowestScientist = undefined
        for (let scientist of scientists) {
            if (!lowestScientist) { lowestScientist = scientist }
            if (scientist.store.energy < lowestScientist.store.energy) {
                lowestScientist = scientist
            }
        }
        return lowestScientist
    }

    get lowestSpawn() {
        let spawns = this.find(FIND_MY_SPAWNS)
        let lowestSpawn = undefined
        for (let spawn of spawns) {
            if (!lowestSpawn) { lowestSpawn = spawn }
            if (spawn.store.energy < lowestSpawn.store.energy) {
                lowestSpawn = spawn
            }
        }
        return lowestSpawn
    }

    get lowestTower() {
        let towers = this.find(FIND_MY_STRUCTURES).filter(x => x.structureType == STRUCTURE_TOWER) as StructureTower[]
        let lowestTower = undefined
        for (let tower of towers) {
            if (!lowestTower) { lowestTower = tower }
            if (tower.store.energy < lowestTower.store.energy) {
                lowestTower = tower
            }
        }
        return lowestTower
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
    }

    setFrontiers(room: Room) {
        let frontiers: string[] = []
        let currentRoomGlobalPos = Utils.Utility.roomNameToCoords(this.name)
        for (let wx = currentRoomGlobalPos.wx - 10; wx <= currentRoomGlobalPos.wx + 10; wx++) {
            for (let wy = currentRoomGlobalPos.wy - 10; wy <= currentRoomGlobalPos.wy + 10; wy++) {
                let prospectFrontier = Utils.Utility.roomNameFromCoords(wx, wy)
                let result = Game.map.describeExits(prospectFrontier)
                if (result != null && Game.map.getRoomStatus(prospectFrontier).status == Game.map.getRoomStatus(room.name).status) {
                    frontiers.push(prospectFrontier)
                }
            }
        }

        frontiers = _.sortByOrder(frontiers, (roomName: string) => {
            let roomGlobalPos = Utils.Utility.roomNameToCoords(roomName)
            let dx = roomGlobalPos.wx - currentRoomGlobalPos.wx
            let dy = roomGlobalPos.wy - currentRoomGlobalPos.wy
            return Math.abs(dx) + Math.abs(dy)
        }, 'asc')

        frontiers.splice(0, 1)

        room.memory.frontiers = frontiers
    }

    updateCostMatrix() {
        let costMatrix = Utils.Utility.distanceTransform(this.name)
        this.memory.costMatrix = JSON.stringify(costMatrix.serialize())
    }

    /*
    Other Calculations and Checks
    */

    _averageDistanceFromSourcesToStructures: number | undefined = undefined
    get averageDistanceFromSourcesToStructures(): number {
        if (!this._averageDistanceFromSourcesToStructures || Game.time % 1500 == 0) {
            let sources = this.sources
            let structures = this.find(FIND_STRUCTURES)
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

    get areFastFillerExtensionsBuilt(): boolean {
        let anchorPos = Utils.Utility.unpackPostionToRoom(this.memory.blueprint.anchor, this.name)
        let results = this.lookAtArea(anchorPos.y - 2, anchorPos.x - 2, anchorPos.y + 2, anchorPos.x + 2, true).filter(x => x.structure?.structureType == STRUCTURE_EXTENSION)
        if (results.length >= 14) {
            return true
        }
        return false
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

    get maxExtensionsAvail(): number {
        let controller = this.controller
        if (!controller) return 0
        switch (controller.level) {
            case 1:
                return 0;
            case 2:
                return 5;
            case 3:
                return 10;
            case 4:
                return 20;
            case 5:
                return 30;
            case 6:
                return 40;
            case 7:
                return 50;
            case 8:
                return 60;
        }
        return 0
    }

    get maxLabsAvail(): number {
        let controller = this.controller
        if (!controller) return 0
        switch (controller.level) {
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
                return 0;
            case 6:
                return 3;
            case 7:
                return 6;
            case 8:
                return 10;
        }
        return 0
    }

    get maxTowersAvail(): number {
        let controller = this.controller
        if (!controller) return 0
        switch (controller.level) {
            case 1:
            case 2:
                return 0;
            case 3:
            case 4:
                return 1;
            case 5:
            case 6:
                return 2;
            case 7:
                return 3;
            case 8:
                return 6;
        }
        return 0
    }

    get rampartHPTarget() {
        if (!this.controller) return 0;
        switch (this.controller.level) {
            case 1:
            case 2:
            case 3:
                return 100000;
            case 4:
                return 500000;
            case 5:
                return 1000000;
            case 6:
                return 5000000;
            case 7:
            case 8:
                return 10000000;
        }
        return 0;
    }


}
