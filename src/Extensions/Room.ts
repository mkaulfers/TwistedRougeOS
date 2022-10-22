import { TRACE, DEBUG } from 'Constants/LogConstants'
import { Role, Roles } from 'Constants/RoleConstants'
import { HUB } from 'Constants/StampConstants'
import CreepRoles from 'Creeps/Index'
import { Managers } from 'Managers/Index'
import { Utils } from 'utils/Index'
import { Logger } from 'utils/Logger'

type CreepFind = { [key in Role | 'all' | 'unknown']: Creep[] }
type LooseCreepFind = { [key in Role | 'all' | 'unknown']?: Creep[] }

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
        constructionSites(ofType?: BuildableStructureConstant): ConstructionSite[]
        structures(ofType?: StructureConstant): Structure[]

        containers: StructureContainer[]
        exits: RoomPosition[] | undefined
        extensions: StructureExtension[]
        extractor: StructureExtractor | undefined
        factory: StructureFactory | undefined
        invaderCores: StructureInvaderCore[]
        keeperLairs: StructureKeeperLair[]
        labs: StructureLab[]
        links: StructureLink[]
        localCreeps: CreepFind
        mineral: Mineral | undefined
        nuker: StructureNuker | undefined
        observer: StructureObserver | undefined
        portals: StructurePortal[]
        powerBank: StructurePowerBank | undefined
        powerSpawn: StructurePowerSpawn | undefined
        ramparts: StructureRampart[]
        roads: StructureRoad[]
        sources: Source[]
        spawns: StructureSpawn[]
        stationedCreeps: CreepFind
        towers: StructureTower[]
        walls: StructureWall[]

        /* Custom Getters */
        getAvailableSpawn: StructureSpawn | undefined
        ffContainers: StructureContainer[]
        nextCreepToDie: Creep | undefined
        lowestExtension: StructureExtension | undefined
        lowestScientist: Creep | undefined
        lowestSpawn: StructureSpawn | undefined
        lowestTower: StructureTower | undefined
        spawnEnergyStructures: (StructureSpawn | StructureExtension)[]

        /* Other Functions */
        scheduleTasks(): void
        setFrontiers(room: Room): void
        updateCostMatrix(): void

        /* Other Calculations and Checks */
        areFastFillerExtensionsBuilt: boolean
        remoteMultiplier: number
        /** Gets the distance from sources to each storage capable structure in the room. */
        averageDistanceFromSourcesToStructures: number
        /** Returns a per tick energy income */
        energyIncome: number
        isAnchorFunctional: boolean
        isSpawning(role: Role): boolean
        maxExtensionsAvail: number
        maxLabsAvail: number
        maxTowersAvail: number
        my: boolean
        /** Returns target goal for rampart HP in the room */
        rampartHPTarget: number
        spawnEnergyLimit: number
    }
}

export default class Room_Extended extends Room {

    /*
    Game Object Getters
    */
    get cache() {
        return global.Cache.rooms[this.name] = global.Cache.rooms[this.name] || {}
    }

    set cache(value) {
        global.Cache.rooms[this.name] = value
    }

    private _constructionSites: { [key: string]: ConstructionSite[] } | undefined
    constructionSites(ofType?: BuildableStructureConstant) {
        if (!this._constructionSites) {
            this._constructionSites = {}
            this._constructionSites['all'] = []
            for (const site of this.find(FIND_CONSTRUCTION_SITES)) {
                if (!this._constructionSites[site.structureType]) this._constructionSites[site.structureType] = []
                this._constructionSites[site.structureType].push(site)
                this._constructionSites['all'].push(site)
            }
        }

        if (ofType) {
            return this._constructionSites[ofType] ? this._constructionSites[ofType] : []
        }
        return this._constructionSites['all']
    }

    private _structures: { [key: string]: AnyStructure[] } | undefined
    structures(ofType?: StructureConstant) {
        if (!this._structures) {
            this._structures = {}
            this._structures['all'] = []
            for (const site of this.find(FIND_STRUCTURES)) {
                if (!this._structures[site.structureType]) this._structures[site.structureType] = []
                this._structures[site.structureType].push(site)
                this._structures['all'].push(site)
            }
        }

        if (ofType) {
            return this._structures[ofType] ? this._structures[ofType] : []
        }
        return this._structures['all']
    }

    private _containers: StructureContainer[] | undefined
    get containers() {
        if (!this._containers) {
            const containers = this.structures(STRUCTURE_CONTAINER)
            if (containers.every(Utils.Typeguards.isStructureContainer)) this._containers = containers
        }
        return this._containers ? this._containers : []
    }

    private _exits: RoomPosition[] | undefined
    get exits() {
        if (!this._exits) {
            this._exits = this.find(FIND_EXIT)
        }
        return this._exits
    }

    private _extensions: StructureExtension[] | undefined
    get extensions() {
        if (!this._extensions) {
            const extensions = this.structures(STRUCTURE_EXTENSION)
            if (extensions.every(Utils.Typeguards.isStructureExtension)) this._extensions = extensions
        }
        return this._extensions ? this._extensions : []
    }

    private _extractor: StructureExtractor | undefined
    get extractor() {
        if (!this._extractor) {
            const extractors = this.structures(STRUCTURE_EXTRACTOR)
            if (extractors[0] && Utils.Typeguards.isStructureExtractor(extractors[0])) this._extractor = extractors[0]
        }
        return this._extractor
    }

    private _factory: StructureFactory | undefined
    get factory() {
        if (!this._factory) {
            const factories = this.structures(STRUCTURE_FACTORY)
            if (factories[0] && Utils.Typeguards.isStructureFactory(factories[0])) this._factory = factories[0]
        }
        return this._factory
    }

    private _invaderCores: StructureInvaderCore[] | undefined
    get invaderCores() {
        if (!this._invaderCores) {
            const invaderCores = this.structures(STRUCTURE_INVADER_CORE)
            if (invaderCores.every(Utils.Typeguards.isStructureInvaderCore)) this._invaderCores = invaderCores
        }
        return this._invaderCores ? this._invaderCores : []
    }

    private _keeperLairs: StructureKeeperLair[] | undefined
    get keeperLairs() {
        if (!this._keeperLairs) {
            const keeperLairs = this.structures(STRUCTURE_KEEPER_LAIR)
            if (keeperLairs.every(Utils.Typeguards.isStructureKeeperLair)) this._keeperLairs = keeperLairs
        }
        return this._keeperLairs ? this._keeperLairs : []
    }

    private _mineral: Mineral | undefined
    get mineral() {
        if (this._mineral) return this._mineral
        let minerals = this.find(FIND_MINERALS)
        return this._mineral = minerals[0] !== undefined ? minerals[0] : undefined
    }

    private _nuker: StructureNuker | undefined
    get nuker() {
        if (!this._nuker) {
            const nukers = this.structures(STRUCTURE_NUKER)
            if (nukers[0] && Utils.Typeguards.isStructureNuker(nukers[0])) this._nuker = nukers[0]
        }
        return this._nuker
    }

    private _labs: StructureLab[] | undefined
    get labs() {
        if (!this._labs) {
            const labs = this.structures(STRUCTURE_LAB)
            if (labs.every(Utils.Typeguards.isStructureLab)) this._labs = labs
        }
        return this._labs ? this._labs : []
    }

    private _links: StructureLink[] | undefined
    get links() {
        if (!this._links) {
            const links = this.structures(STRUCTURE_LINK)
            if (links.every(Utils.Typeguards.isStructureLink)) this._links = links
        }
        return this._links ? this._links : []
    }

    private _observer: StructureObserver | undefined
    get observer() {
        if (!this._observer) {
            const observers = this.structures(STRUCTURE_OBSERVER)
            if (observers[0] && Utils.Typeguards.isStructureObserver(observers[0])) this._observer = observers[0]
        }
        return this._observer
    }

    private _portals: StructurePortal[] | undefined
    get portals() {
        if (!this._portals) {
            const portals = this.structures(STRUCTURE_PORTAL)
            if (portals.every(Utils.Typeguards.isStructurePortal)) this._portals = portals
        }
        return this._portals ? this._portals : []
    }

    private _powerBank: StructurePowerBank | undefined
    get powerBank() {
        if (!this._powerBank) {
            const powerBanks = this.structures(STRUCTURE_POWER_BANK)
            if (powerBanks[0] && Utils.Typeguards.isStructurePowerBank(powerBanks[0])) this._powerBank = powerBanks[0]
        }
        return this._powerBank
    }

    private _powerSpawn: StructurePowerSpawn | undefined
    get powerSpawn() {
        if (!this._powerSpawn) {
            const powerSpawns = this.structures(STRUCTURE_POWER_SPAWN)
            if (powerSpawns[0] && Utils.Typeguards.isStructurePowerSpawn(powerSpawns[0])) this._powerSpawn = powerSpawns[0]
        }
        return this._powerSpawn
    }

    private _roads: StructureRoad[] | undefined
    get roads() {
        if (!this._roads) {
            const roads = this.structures(STRUCTURE_ROAD)
            if (roads.every(Utils.Typeguards.isStructureRoad)) this._roads = roads
        }
        return this._roads ? this._roads : []
    }

    private _sources: Source[] | undefined
    get sources() {
        if (this._sources) return this._sources
        let sources = this.find(FIND_SOURCES)
        return this._sources = sources ? sources : []
    }

    private _spawns: StructureSpawn[] | undefined
    get spawns() {
        if (!this._spawns) {
            const spawns = this.structures(STRUCTURE_SPAWN)
            if (spawns.every(Utils.Typeguards.isStructureSpawn)) this._spawns = spawns
        }
        return this._spawns ? this._spawns : []
    }

    private _towers: StructureTower[] | undefined
    get towers() {
        if (!this._towers) {
            const towers = this.structures(STRUCTURE_TOWER)
            if (towers.every(Utils.Typeguards.isStructureTower)) this._towers = towers
        }
        return this._towers ? this._towers : []
    }

    private _walls: StructureWall[] | undefined
    get walls() {
        if (!this._walls) {
            const walls = this.structures(STRUCTURE_WALL)
            if (walls.every(Utils.Typeguards.isStructureWall)) this._walls = walls
        }
        return this._walls ? this._walls : []
    }

    private _localCreeps: CreepFind | undefined
    get localCreeps() {
        if (!this._localCreeps) {
            let setup: LooseCreepFind = {}
            setup['all'] = []
            setup['unknown'] = []
            for (const role in CreepRoles) setup[role as Role] = []

            this._localCreeps = setup as CreepFind

            for (const creep of this.find(FIND_MY_CREEPS)) {
                const role = creep.memory.role
                if (!role || !(Roles.includes(role))) {
                    this._localCreeps.unknown.push(creep)
                } else {
                    this._localCreeps[role as Role].push(creep)
                }
                this._localCreeps.all.push(creep)
            }
        }

        return this._localCreeps
    }

    private _stationedCreeps: CreepFind | undefined
    get stationedCreeps() {
        if (!this._stationedCreeps) {
            let setup: LooseCreepFind = {}
            setup['all'] = []
            setup['unknown'] = []
            for (const role in CreepRoles) setup[role as Role] = []

            this._stationedCreeps = setup as CreepFind

            for (const creep of Object.values(Game.creeps)) {
                if (creep.memory.homeRoom !== this.name) continue
                const role = creep.memory.role
                if (!role || !(Roles.includes(role))) {
                    this._stationedCreeps.unknown.push(creep)
                } else {
                    this._stationedCreeps[role as Role].push(creep)
                }
                this._stationedCreeps.all.push(creep)
            }
        }

        return this._stationedCreeps
    }

    /*
    Custom Getters
    */

    private _availableSpawn: StructureSpawn | undefined
    get getAvailableSpawn() {
        if (!this._availableSpawn) {
            for (const spawn of this.spawns) {
                if (spawn.spawning === null) return this._availableSpawn = spawn
            }
        }
        return this._availableSpawn
    }

    private _ffContainers: StructureContainer[] | undefined
    get ffContainers() {
        if (!this._ffContainers) {
            if (!this.memory.blueprint || !this.memory.blueprint.anchor || this.memory.blueprint.anchor === 0) return []
            let anchorPos = Utils.Utility.unpackPostionToRoom(this.memory.blueprint.anchor, this.name)
            let containers: StructureContainer[] = []
            this.containers.forEach(function(s) {
                if (s.pos.getRangeTo(anchorPos) === 2) containers.push(s)
            })
            this._ffContainers = containers
        }
        return this._ffContainers
    }

    private _nextCreepToDie: Creep | undefined
    get nextCreepToDie() {
        if (!this._nextCreepToDie) {
            for (const creep of this.stationedCreeps.all) {
                const gonnaLive = creep.ticksToLive ? creep.ticksToLive : 1500
                const willLive = this._nextCreepToDie && this._nextCreepToDie.ticksToLive ? this._nextCreepToDie.ticksToLive : 1500
                if (gonnaLive < willLive) this._nextCreepToDie = creep
            }
        }
        return this._nextCreepToDie
    }

    private _lowestExtension: StructureExtension | undefined
    get lowestExtension() {
        if (!this._lowestExtension) {
            for (const extension of this.extensions) if (extension.store.energy < (this._lowestExtension ? this._lowestExtension.store.energy : extension.store.getCapacity(RESOURCE_ENERGY))) this._lowestExtension = extension
        }
        return this._lowestExtension
    }

    private _lowestScientist: Creep | undefined
    get lowestScientist() {
        if (!this._lowestScientist) {
            for (const scientist of this.localCreeps.scientist) if (scientist.store.energy < (this._lowestScientist ? this._lowestScientist.store.energy : scientist.store.getCapacity(RESOURCE_ENERGY))) this._lowestScientist = scientist
        }
        return this._lowestScientist
    }

    private _lowestSpawn: StructureSpawn | undefined
    get lowestSpawn() {
        if (!this._lowestSpawn) {
            for (const spawn of this.spawns) if (spawn.store.energy < (this._lowestSpawn ? this._lowestSpawn.store : spawn.store.getCapacity(RESOURCE_ENERGY))) this._lowestSpawn = spawn
        }
        return this._lowestSpawn
    }

    private _lowestTower: StructureTower | undefined
    get lowestTower() {
        if (!this._lowestTower) {
            for (const tower of this.towers) if (tower.store.energy < (this._lowestTower ? this._lowestTower.store : tower.store.getCapacity(RESOURCE_ENERGY))) this._lowestTower = tower
        }
        return this._lowestTower
    }

    private _spawnEnergyStructures: (StructureSpawn | StructureExtension)[] | undefined
    get spawnEnergyStructures() {
        if (!this.cache.spawnEnergyStructIds || Game.time % 100 === 0) {
            let spawns = [...this.spawns]
            let extensions = [...this.extensions]
            let structures: (StructureSpawn | StructureExtension)[] = []

            // FastFiller and Anchor Structures
            if (this.memory.blueprint && this.memory.blueprint.anchor && this.memory.blueprint.anchor !== 0) {
                let anchorPos = Utils.Utility.unpackPostionToRoom(this.memory.blueprint.anchor, this.name)

                // FF Spawns
                for (const spawn of this.spawns) {
                    if (spawn.pos.getRangeTo(anchorPos) <= 2) {
                        let theSpawn = spawns.splice(spawns.indexOf(spawn), 1)[0]
                        if (theSpawn) structures.push(theSpawn)
                    }
                }

                // FF Extensions
                for (const extension of this.extensions) {
                    if (extension.pos.getRangeTo(anchorPos) <= 2) {
                        let theExtension = extensions.splice(extensions.indexOf(extension), 1)[0]
                        if (theExtension) structures.push(theExtension)
                    }
                }

                // Anchor Spawn
                if (spawns.length > 0) {
                    let anchorStamp = this.memory.blueprint.stamps.find(stamp => stamp.type == HUB)
                    let anchorStampPos: RoomPosition | undefined
                    let theSpawn: StructureSpawn | undefined
                    if (anchorStamp) anchorStampPos = Utils.Utility.unpackPostionToRoom(anchorStamp.stampPos, this.name)
                    if (anchorStampPos) theSpawn = anchorStampPos.findInRange(spawns, 1)[0]
                    if (theSpawn) theSpawn = spawns.splice(spawns.indexOf(theSpawn), 1)[0]
                    if (theSpawn) structures.push(theSpawn)

                }
            }

            // All remaining based on storage distance. Fallback: Spawn Distance
            if (spawns.length > 0 || extensions.length > 0) {
                let leftovers = [...spawns, ...extensions]
                const target = this.storage ? this.storage.pos : this.spawns[0] ? this.spawns[0].pos : undefined
                if (!target) structures.push(...leftovers)
                else {
                    leftovers = _.sortBy(leftovers, (s) => s.pos.getRangeTo(target))
                    structures.push(...leftovers)
                }
            }

            // Build Id Array
            let ids: Id<StructureSpawn | StructureExtension>[] = []
            for (const s of structures) ids.push(s.id)
            this._spawnEnergyStructures = structures
            this.cache.spawnEnergyStructIds = ids

        }

        if (!this._spawnEnergyStructures && this.cache.spawnEnergyStructIds && this.cache.spawnEnergyStructIds.length > 0) {
            let structures: (StructureSpawn | StructureExtension)[] = []
            for (const id of this.cache.spawnEnergyStructIds) {
                let struct = Game.getObjectById(id)
                if (struct) structures.push(struct)
                else {
                    delete this.cache.spawnEnergyStructIds
                    return []
                }
            }
            this._spawnEnergyStructures = structures
        }

        return this._spawnEnergyStructures ? this._spawnEnergyStructures : []
    }

    /*
    Other Functions
    */

    scheduleTasks() {
        Utils.Logger.log("Room -> setupTasks()", TRACE)
        Managers.UtilityManager.schedulePixelSale()
        Managers.ThreatManager.scheduleThreatMonitor(this)
        Managers.CreepManager.scheduleCreepTask(this)
        Managers.SpawnManager.scheduleSpawnMonitor(this)
        Managers.CreepManager.scheduleRoomTaskMonitor(this)
        Managers.LinkManager.schedule(this)
        Managers.ConstructionManager.scheduleConstructionMonitor(this)
        Managers.RemoteManager.scheduleRemoteMonitor(this)
        Managers.MarketManager.schedule(this)
    }

    setFrontiers(room: Room) {
        let frontiers: string[] = []
        let currentRoomGlobalPos = Utils.Utility.roomNameToCoords(this.name)

        let deltaX = 1
        let deltaY = 0
        let segmentLength = 1

        let x = 0
        let y = 0
        let segmentPassed = 0

        for (let k = 0;  k < 120;  ++k) {
            x += deltaX
            y += deltaY
            ++segmentPassed

            Logger.log(`WX: ${currentRoomGlobalPos.wx + x} WY: ${currentRoomGlobalPos.wy + y}`, DEBUG)
            let prospectFrontier = Utils.Utility.roomNameFromCoords(currentRoomGlobalPos.wx + x, currentRoomGlobalPos.wy + y)
            let result = Game.map.describeExits(prospectFrontier)
            if (result != null && Game.map.getRoomStatus(prospectFrontier).status == Game.map.getRoomStatus(room.name).status) {
                frontiers.push(prospectFrontier)
            }

            if (segmentPassed == segmentLength) {
                segmentPassed = 0
                let temp = deltaX
                deltaX = -deltaY
                deltaY = temp

                if (deltaY == 0) {
                    ++segmentLength
                }
            }
        }
        room.memory.frontiers = frontiers
    }

    updateCostMatrix() {
        let costMatrix = Utils.Utility.distanceTransform(this.name)
        this.cache.openSpaceCM = JSON.stringify(costMatrix.serialize())
    }

    /*
    Other Calculations and Checks
    */

    private _averageDistanceFromSourcesToStructures: number | undefined = undefined
    get averageDistanceFromSourcesToStructures(): number {
        if (!this._averageDistanceFromSourcesToStructures || Game.time % 1500 == 0) {
            let sources = this.sources
            let structures = this.structures()
            structures.filter((s) => { return Utils.Typeguards.isAnyStoreStructure(s) || Utils.Typeguards.isStructureController(s) })
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

    private _areFastFillerExtensionsBuilt: boolean | undefined
    get areFastFillerExtensionsBuilt() {
        if (!this._areFastFillerExtensionsBuilt) {
            if (!this.memory.blueprint || this.memory.blueprint.anchor == 0) return this._areFastFillerExtensionsBuilt = false
            let anchorPos = Utils.Utility.unpackPostionToRoom(this.memory.blueprint.anchor, this.name)
            let results = this.lookAtArea(anchorPos.y - 2, anchorPos.x - 2, anchorPos.y + 2, anchorPos.x + 2, true).filter(x => x.structure?.structureType == STRUCTURE_EXTENSION)
            if (results.length >= 14) {
                this._areFastFillerExtensionsBuilt = true
            } else {
                this._areFastFillerExtensionsBuilt = false
            }
        }
        return this._areFastFillerExtensionsBuilt
    }

    // TODO: Modify 3 to be a calculated value based on path distances and expenditure times.
    private _remoteMultiplier: number | undefined
    get remoteMultiplier() {
        if (!this._remoteMultiplier) {
            this._remoteMultiplier = !this.storage ? 3 : 1
        }
        return this._remoteMultiplier
    }

    // TODO: Modify to consider Power Creep Effects
    private _energyIncome: number | undefined
    get energyIncome() {
        if (!this._energyIncome) {
            this._energyIncome = 0
            // Local Sources
            for (const source of this.sources) if (source.isHarvestingAtMaxEfficiency) this._energyIncome += 10

            // Remote Sources
            if (this.controller && this.controller.level > 4) {
                if (this.memory.remoteSites) {
                    for (const roomName in this.memory.remoteSites) {
                        // Determine potential source energy generation
                        let energyPerTick = 5;
                        if (Game.rooms[roomName]?.controller?.reservation) energyPerTick = 10;
                        if (Utils.Typeguards.isSourceKeeperRoom(roomName)) energyPerTick = 12;

                        for (const sourceId in this.memory.remoteSites[roomName].sourceDetail) {
                            let source = Game.getObjectById(sourceId as Id<Source>);
                            if (source && source.isHarvestingAtMaxEfficiency) this._energyIncome += energyPerTick;
                        }
                    }
                }
            }
        }
        return this._energyIncome
    }

    private _isAnchorFunctional: boolean | undefined
    get isAnchorFunctional() {
        if (!this._isAnchorFunctional) {
            if (!this.memory.blueprint || this.memory.blueprint.anchor === 0) return this._isAnchorFunctional = false
            const anchorStamp = this.memory.blueprint.stamps.find((s) => s.type === HUB)
            if (!anchorStamp) return this._isAnchorFunctional = false

            const wantThese: StructureConstant[] = [
                STRUCTURE_LINK,
                STRUCTURE_SPAWN,
                STRUCTURE_TERMINAL,
                STRUCTURE_STORAGE,
                STRUCTURE_FACTORY,
                STRUCTURE_NUKER,
                STRUCTURE_POWER_SPAWN
            ]
            let structures = Utils.Utility.unpackPostionToRoom(anchorStamp.stampPos, this.name).findInRange(FIND_STRUCTURES, 1)
            structures = structures.filter((s) => wantThese.indexOf(s.structureType) >= 0)

            this._isAnchorFunctional = structures.length > 1 ? true : false
        }
        return this._isAnchorFunctional
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

    private _maxExtensionsAvail: number | undefined
    get maxExtensionsAvail(): number {
        if (!this._maxExtensionsAvail) {
            let controller = this.controller
            if (!controller) return 0
            switch (controller.level) {
                case 1:
                    this._maxExtensionsAvail = 0
                    break
                case 2:
                    this._maxExtensionsAvail = 5
                    break
                case 3:
                    this._maxExtensionsAvail = 10
                    break
                case 4:
                    this._maxExtensionsAvail = 20
                    break
                case 5:
                    this._maxExtensionsAvail = 30
                    break
                case 6:
                    this._maxExtensionsAvail = 40
                    break
                case 7:
                    this._maxExtensionsAvail = 50
                    break
                case 8:
                    this._maxExtensionsAvail = 60
                    break
                default:
                    this._maxExtensionsAvail = 0
                    break
            }
        }
        return this._maxExtensionsAvail
    }

    private _maxLabsAvail: number | undefined
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
                    this._maxLabsAvail = 0
                    break
                case 6:
                    this._maxLabsAvail = 3
                    break
                case 7:
                    this._maxLabsAvail = 6
                    break
                case 8:
                    this._maxLabsAvail = 10
                    break
                default:
                    this._maxLabsAvail = 0
                    break
            }
        }
        return this._maxLabsAvail
    }

    private _maxTowersAvail: number | undefined
    get maxTowersAvail(): number {
        if (!this._maxTowersAvail) {
            let controller = this.controller
            if (!controller) return 0
            switch (controller.level) {
                case 1:
                case 2:
                    this._maxTowersAvail = 0
                    break
                case 3:
                case 4:
                    this._maxTowersAvail = 1
                    break
                case 5:
                case 6:
                    this._maxTowersAvail = 2
                    break
                case 7:
                    this._maxTowersAvail = 3
                    break
                case 8:
                    this._maxTowersAvail = 6
                    break
                default:
                    this._maxTowersAvail = 0
                    break
            }
        }
        return this._maxTowersAvail
    }

    private _my: boolean | undefined
    get my() {
        if (!this._my) {
            const controller = this.controller
            if (!controller) {
                this._my = false
            } else {
                this._my = controller.my
            }
        }
        return this._my
    }

    _rampartHPTarget: number | undefined
    get rampartHPTarget() {
        if (!this._rampartHPTarget) {
            if (!this.controller) return 0
            switch (this.controller.level) {
                case 1:
                case 2:
                case 3:
                    this._rampartHPTarget = 100000
                    break
                case 4:
                    this._rampartHPTarget = 500000
                    break
                case 5:
                    this._rampartHPTarget = 1000000
                    break
                case 6:
                    this._rampartHPTarget = 1500000
                    break
                case 7:
                case 8:
                    this._rampartHPTarget = 2000000
                    break
                default:
                    this._rampartHPTarget = 0
                    break
            }
        }
        return this._rampartHPTarget
    }

    private _spawnEnergyLimit: number | undefined
    get spawnEnergyLimit() {
        if (!this._spawnEnergyLimit) {
            this._spawnEnergyLimit = 0
            const roomIncome = (this.energyIncome * 1500)
            this._spawnEnergyLimit = roomIncome == 0 ? 300 : (this.energyCapacityAvailable > (roomIncome / 20)) ? roomIncome / 20 : this.energyCapacityAvailable
        }
        return this._spawnEnergyLimit
    }
}
