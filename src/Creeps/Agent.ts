import { InvaderDetail } from "Models/InvaderDetail"
import { MineralDetail } from "Models/MineralDetail"
import { DefenseStructuresDetails, HostileStructuresDetails, PlayerDetail, StorageDetails } from "Models/PlayerDetail"
import { PortalDetail } from "Models/PortalDetail"
import { Process } from "Models/Process"
import { RoomStatistics } from "Models/RoomStatistics"
import { ProcessPriority, ProcessResult, Role, Task } from "utils/Enums"
import { Utils } from "utils/Index"

export class Agent extends Creep {
    static baseBody = [MOVE]
    static segment = []

    static shouldSpawn(room: Room): boolean {
        let localCreeps = room.creeps()
        let agents = _.filter(Game.creeps, (creep) => creep.memory.role == Role.AGENT && creep.memory.homeRoom == room.name);

        if (!room.memory.frontiers) return false
        if (localCreeps.filter(x => x.memory.role == Role.HARVESTER).length > 0 &&
            localCreeps.filter(x => x.memory.role == Role.SCIENTIST).length > 0 &&
            localCreeps.filter(x => x.memory.role == Role.TRUCKER).length > 0 &&
            agents.length < 1 &&
            room.memory.frontiers.length > 0) {
            return true
        }
        return false
    }

    static dispatch(room: Room) {
        let agents = room.creeps(Role.AGENT)
        for (let agent of agents) {
            if (!agent.memory.task) {
                this.scheduleAgentTask(agent)
            }
        }
    }

    static scheduleAgentTask(creep: Creep) {
        let creepId = creep.id

        const agentTask = () => {
            let creep = Game.getObjectById(creepId)
            if (!creep) { return ProcessResult.FAILED }
            let frontiers = Game.rooms[creep.memory.homeRoom].memory.frontiers
            if (!frontiers) { return ProcessResult.FAILED }
            if (!Memory.intelligence) { Memory.intelligence = [] }

            if (creep.room.name != frontiers[0]) {
                let targetFrontier = new RoomPosition(25, 25, frontiers[0])
                let resutl = creep.moveTo(targetFrontier)

                if (frontiers[0] != creep.memory.homeRoom && !this.isRoomExplored(creep.room)) {
                    let roomStatistics = this.generateRoomStatistics(creep.room)
                    Memory.intelligence.push(roomStatistics)
                    frontiers.splice(frontiers.indexOf(creep.room.name), 1)
                    Game.rooms[creep.memory.homeRoom].memory.frontiers = frontiers
                }
            }

            if (creep.room.name == frontiers[0]) {
                let roomStatistics = this.generateRoomStatistics(creep.room)
                Memory.intelligence.push(roomStatistics)
                frontiers.splice(0, 1)
                Game.rooms[creep.memory.homeRoom].memory.frontiers = frontiers
            }

            return ProcessResult.RUNNING
        }

        creep.memory.task = Task.AGENT
        let newProcess = new Process(creep.name, ProcessPriority.LOW, agentTask)
        global.scheduler.addProcess(newProcess)
    }

    private static isRoomExplored(room: Room): boolean {
        let intelligence = Memory.intelligence
        if (!intelligence) { return false }
        let explored = false
        for (let data of intelligence) {
            if (data.name == room.name) {
                explored = true
            }
        }
        return explored
    }

    private static generateRoomStatistics(room: Room): RoomStatistics {
        let terrainInfo = this.getTerrainCounts(room)
        let swampCount = terrainInfo.swamp
        let plainCount = terrainInfo.plain
        let wallCount = terrainInfo.wall

        let highestDT = this.getHighestDT(room)
        let threatLevel = this.getThreatLevel(room)

        let sourcesIds = room.find(FIND_SOURCES).map(source => source.id)
        let powerBankId = room.find(FIND_STRUCTURES, { filter: structure => structure.structureType == STRUCTURE_POWER_BANK })[0]?.id
        let publicTerminalId = room.find(FIND_STRUCTURES, { filter: structure => structure.structureType == STRUCTURE_TERMINAL })[0]?.id

        let portal = room.find(FIND_STRUCTURES, { filter: structure => structure.structureType == STRUCTURE_PORTAL })[0] as StructurePortal
        let portalDetails: PortalDetail | undefined = undefined
        if (portal) {
            portalDetails = new PortalDetail(portal.id, portal.ticksToDecay ? portal.ticksToDecay : 0)
        }

        let mineral = room.find(FIND_MINERALS)[0]
        let mineralDetails: MineralDetail | undefined = undefined
        if (mineral) {
            mineralDetails = new MineralDetail(mineral.id, mineral.mineralType)
        }

        let controllerId = room.controller?.id
        let distanceBetweenSources = this.getDistanceBetweenSources(room)
        let largestDistanceToController = this.largestDistanceToController(room)
        let playerDetails = this.getPlayerDetails(room)
        let invaderDetails = this.getInvaderDetails(room)

        return new RoomStatistics(
            room.name,
            swampCount,
            plainCount,
            wallCount,
            highestDT,
            threatLevel,
            sourcesIds,
            powerBankId,
            publicTerminalId,
            portalDetails,
            mineralDetails,
            controllerId,
            distanceBetweenSources,
            largestDistanceToController,
            playerDetails,
            invaderDetails
        )
    }

    private static getTerrainCounts(targetRoom: Room): { swamp: number, plain: number, wall: number } {
        let terrain = new Room.Terrain(targetRoom.name)
        let swampCount = 0
        let plainCount = 0
        let wallCount = 0
        for (let x = 0; x < 50; x++) {
            for (let y = 0; y < 50; y++) {
                let tile = terrain.get(x, y)
                if (tile == TERRAIN_MASK_SWAMP) {
                    swampCount++
                } else if (tile == TERRAIN_MASK_WALL) {
                    wallCount++
                } else {
                    plainCount++
                }
            }
        }
        return { swamp: swampCount, plain: plainCount, wall: wallCount }
    }

    private static getHighestDT(targetRoom: Room): number {
        let costMatrix = Utils.Utility.distanceTransform(targetRoom.name)
        let highestDT = 0
        for (let x = 0; x < 50; x++) {
            for (let y = 0; y < 50; y++) {
                let tile = costMatrix.get(x, y)
                if (tile > highestDT) {
                    highestDT = tile
                }
            }
        }
        return highestDT
    }

    private static getThreatLevel(targetRoom: Room): number {
        let controller = targetRoom.controller
        if (controller && controller.owner && controller.owner.username != "Invader") {
            return controller.level
        }

        let allStructures = targetRoom.find(FIND_STRUCTURES)

        if (!controller) {
            let structures = allStructures.filter(structure => structure.structureType == STRUCTURE_INVADER_CORE) as StructureInvaderCore[]
            if (structures.length > 0) {
                return structures[0].level
            }
        } else {
            let towers = allStructures.filter(structure => structure.structureType == STRUCTURE_TOWER) as StructureTower[]
            let ramparts = allStructures.filter(structure => structure.structureType == STRUCTURE_RAMPART) as StructureRampart[]
            return towers.length / 2 + ramparts.length > 6 ? 1 : 0
        }
        return 0
    }

    private static getDistanceBetweenSources(targetRoom: Room): number {
        let sources = targetRoom.find(FIND_SOURCES)
        if (sources.length <= 1) { return -1 }
        let distance = 0
        for (let source of sources) {
            for (let otherSource of sources) {
                if (source.id != otherSource.id) {
                    let path = PathFinder.search(source.pos, otherSource.pos)
                    if (path.cost > distance) {
                        distance = path.cost
                    }
                }
            }
        }
        return distance
    }

    private static largestDistanceToController(targetRoom: Room): number {
        let controller = targetRoom.controller
        if (!controller) { return -1 }
        let sources = targetRoom.find(FIND_SOURCES)
        if (sources.length == 0) { return -1 }
        let distance = 0
        for (let source of sources) {
            let path = PathFinder.search(source.pos, controller.pos)
            if (path.cost > distance) {
                distance = path.cost
            }
        }
        return distance
    }

    private static getPlayerDetails(targetRoom: Room): PlayerDetail | undefined {
        if (targetRoom.controller && !targetRoom.controller.my && targetRoom.controller.owner?.username != "Invader") {
            let username = ""
            let reserved = false

            if (targetRoom.controller.reservation) {
                username = targetRoom.controller.reservation.username
                reserved = true
            }

            if (targetRoom.controller.owner) {
                username = targetRoom.controller.owner.username
                reserved = false
            }

            let rclLevel = targetRoom.controller.level
            let storageDetails: StorageDetails[] = []
            let storeStructures: AnyStoreStructure[] = targetRoom.find(FIND_STRUCTURES, { filter: function (s: AnyStructure) { return 'store' in s } })
            for (let structure of storeStructures) {
                if (structure.store) {
                    storageDetails.push(new StorageDetails(structure.id, this.getContentsOfStore(structure)))
                }
            }

            let hostileDetails: HostileStructuresDetails[] = []
            let hostileStructures = targetRoom.find(FIND_HOSTILE_STRUCTURES).filter(
                structure => structure.structureType == STRUCTURE_TOWER ||
                    structure.structureType == STRUCTURE_SPAWN ||
                    structure.structureType == STRUCTURE_POWER_SPAWN
            )
            for (let structure of hostileStructures) {
                hostileDetails.push(new HostileStructuresDetails(structure.id, structure.structureType, structure.hits))
            }

            let defenseDetails: DefenseStructuresDetails[] = []
            let defensiveStructures = targetRoom.find(FIND_STRUCTURES, { filter: structure => structure.structureType == STRUCTURE_RAMPART || structure.structureType == STRUCTURE_WALL })
            for (let structure of defensiveStructures) {
                defenseDetails.push(new DefenseStructuresDetails(structure.id, structure.structureType, structure.hits))
            }

            return new PlayerDetail(username, rclLevel, reserved, storageDetails, hostileDetails, defenseDetails)

        }
        return undefined
    }

    private static getInvaderDetails(targetRoom: Room): InvaderDetail | undefined {
        if (targetRoom.controller && !targetRoom.controller.my && targetRoom.controller.reservation?.username == "Invader") {
            let coreId = targetRoom.find(FIND_STRUCTURES, { filter: structure => structure.structureType == STRUCTURE_INVADER_CORE })[0].id
            let storageDetails: StorageDetails[] = []
            let storeStructures: AnyStoreStructure[] = targetRoom.find(FIND_STRUCTURES, { filter: function (s: AnyStructure) { return 'store' in s } })
            for (let structure of storeStructures) {
                if (structure.store) {
                    storageDetails.push(new StorageDetails(structure.id, this.getContentsOfStore(structure)))
                }
            }

            return new InvaderDetail(coreId, storageDetails)
        }
        return undefined
    }

    private static getContentsOfStore(structure: AnyStoreStructure): [ResourceConstant, number][] {
        let resources: [ResourceConstant, number][] = []
        for (let resourceType of Object.keys(RESOURCES_ALL)) {
            let amount = structure.store.getUsedCapacity(resourceType as ResourceConstant)
            if (amount) {
                resources.push([resourceType as ResourceConstant, amount])
            }
        }

        return resources
    }
}