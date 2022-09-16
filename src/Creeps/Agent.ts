import { InvaderDetail } from "Models/InvaderDetail"
import { MineralDetail } from "Models/MineralDetail"
import { DefenseStructuresDetail, HostileStructuresDetail, PlayerDetail, StorageDetail } from "Models/PlayerDetail"
import { PortalDetail } from "Models/PortalDetail"
import { Process } from "Models/Process"
import { RoomStatistics } from "Models/RoomStatistics"
import { moveTo } from "screeps-cartographer"
import { LogLevel, ProcessPriority, ProcessResult, Role, Task } from "utils/Enums"
import { Utils } from "utils/Index"

export class Agent extends Creep {
    static baseBody = [MOVE]
    static segment = []

    static quantityWanted(room: Room, rolesNeeded: Role[], min?: boolean): number {
        if (min && min == true) return 0;
        let agentCount = rolesNeeded.filter(x => x == Role.AGENT).length;
        if (!room.memory.frontiers || room.observer !== undefined) return 0;
        if (rolesNeeded.filter(x => x == Role.HARVESTER).length > 0 &&
            rolesNeeded.filter(x => x == Role.SCIENTIST).length > 0 &&
            rolesNeeded.filter(x => x == Role.TRUCKER).length > 0 &&
            agentCount < 1 &&
            room.memory.frontiers.length > 0) {
            return agentCount < 1 ? 1 - agentCount : 0;
        }
        return 0;
    }

    static dispatch(room: Room) {
        let agents = room.stationedCreeps.agent
        for (let agent of agents) {
            this.scheduleAgentTask(agent)
        }
    }

    static scheduleAgentTask(creep: Creep) {
        let creepId = creep.id

        const agentTask = () => {
            let agent = Game.getObjectById(creepId)
            if (!agent) { return ProcessResult.FAILED }
            let frontiers = Game.rooms[agent.memory.homeRoom].memory.frontiers
            if (!frontiers) { return ProcessResult.FAILED }
            if (!Memory.intelligence) { Memory.intelligence = [] }

            let targetFrontier = new RoomPosition(25, 25, frontiers[0])
            if (agent.room.name != frontiers[0]) {
                agent.moveToDefault(targetFrontier)
                if (frontiers[0] != agent.memory.homeRoom && !this.isRoomExplored(agent.room)) {
                    let roomStatistics = this.generateRoomStatistics(agent.room)
                    Memory.intelligence.push(roomStatistics)

                    frontiers.splice(frontiers.indexOf(agent.room.name), 1)
                    Game.rooms[agent.memory.homeRoom].memory.frontiers = frontiers
                    let frontierAsCoords = Utils.Utility.roomNameToCoords(frontiers[0])
                    let packedCoords = Utils.Utility.packPosition(frontierAsCoords)
                    agent.memory.assignedPos = packedCoords

                }
            } else {
                moveTo(agent, targetFrontier, {
                    avoidCreeps: true,
                    avoidObstacleStructures: true,
                    avoidSourceKeepers: true,
                    plainCost: 2,
                    swampCost: 2,
                    visualizePathStyle: {
                        fill: 'transparent',
                        stroke: '#fff',
                        lineStyle: 'dashed',
                        strokeWidth: .15,
                        opacity: .2
                    }
                })
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

        let sourcesIds = room.sources.map(source => source.id)
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

        let sources = targetRoom.sources
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
        let sources = targetRoom.sources

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

            let storageDetails: StorageDetail[] = []
            let storeStructures: AnyStoreStructure[] = targetRoom.find(FIND_STRUCTURES, { filter: function (s: AnyStructure) { return 'store' in s } })
            for (let structure of storeStructures) {
                if (structure.store) {
                    storageDetails.push(new StorageDetail(structure.id, this.getContentsOfStore(structure)))
                }
            }

            let hostileDetails: HostileStructuresDetail[] = []

            let hostileStructures = targetRoom.find(FIND_HOSTILE_STRUCTURES).filter(
                structure => structure.structureType == STRUCTURE_TOWER ||
                    structure.structureType == STRUCTURE_SPAWN ||
                    structure.structureType == STRUCTURE_POWER_SPAWN
            )
            for (let structure of hostileStructures) {

                hostileDetails.push(new HostileStructuresDetail(structure.id, structure.structureType, structure.hits))
            }

            let defenseDetails: DefenseStructuresDetail[] = []
            let defensiveStructures = targetRoom.find(FIND_STRUCTURES, { filter: structure => structure.structureType == STRUCTURE_RAMPART || structure.structureType == STRUCTURE_WALL })
            for (let structure of defensiveStructures) {
                defenseDetails.push(new DefenseStructuresDetail(structure.id, structure.structureType, structure.hits))
            }

            return new PlayerDetail(username, rclLevel, reserved, storageDetails, hostileDetails, defenseDetails)

        }
        return undefined
    }

    private static getInvaderDetails(targetRoom: Room): InvaderDetail | undefined {
        if (targetRoom.controller && !targetRoom.controller.my && targetRoom.controller.reservation?.username == "Invader") {
            let coreId = targetRoom.find(FIND_STRUCTURES, { filter: structure => structure.structureType == STRUCTURE_INVADER_CORE })[0].id

            let storageDetails: StorageDetail[] = []
            let storeStructures: AnyStoreStructure[] = targetRoom.find(FIND_STRUCTURES, { filter: function (s: AnyStructure) { return 'store' in s } })
            for (let structure of storeStructures) {
                if (structure.store) {
                    storageDetails.push(new StorageDetail(structure.id, this.getContentsOfStore(structure)))
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
