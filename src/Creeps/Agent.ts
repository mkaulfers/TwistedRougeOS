import CreepRole from "Models/CreepRole"
import { InvaderDetail } from "Models/InvaderDetail"
import { MineralDetail } from "Models/MineralDetail"
import { DefenseStructuresDetail, HostileStructuresDetail, PlayerDetail, StorageDetail } from "Models/PlayerDetail"
import { PortalDetail } from "Models/PortalDetail"
import { Process } from "Models/Process"
import { RoomStatistics } from "Models/RoomStatistics"
import { DangerLevel, Developer, LogLevel, ProcessPriority, ProcessResult, Role, Task } from "utils/Enums"
import { Utils } from "utils/Index"
import { Logger } from "utils/Logger"
import { Z_PARTIAL_FLUSH } from "zlib"

export class Agent extends CreepRole {

    readonly baseBody = [MOVE]
    readonly segment = []

    quantityWanted(room: Room, rolesNeeded: Role[], min?: boolean): number {
        let agentCount = rolesNeeded.filter(x => x == Role.AGENT).length;
        if (min && min == true) return rolesNeeded.filter(x => x == Role.HARVESTER).length > 0 && rolesNeeded.filter(x => x == Role.TRUCKER).length > 0 ? 1 - agentCount : 0;
        if (!room.memory.frontiers || room.observer) return 0;
        if (rolesNeeded.filter(x => x == Role.HARVESTER).length > 0 &&
            rolesNeeded.filter(x => x == Role.SCIENTIST).length > 0 &&
            rolesNeeded.filter(x => x == Role.TRUCKER).length > 0 &&
            agentCount < 1 &&
            room.memory.frontiers.length > 0) {
            return agentCount < 1 ? 1 - agentCount : 0;
        }
        return 0;
    }

    dispatch(room: Room) {
        let agents = room.stationedCreeps.agent
        for (let agent of agents) {
            if (!this.tasks.agent) continue;
            this.tasks.agent(agent);
        }
    }

    readonly tasks: { [key in Task]?: (creep: Creep) => void } = {
        agent: function(creep: Creep) {
            let creepId = creep.id

            const agentTask = () => {
                let creep = Game.getObjectById(creepId)
                if (!creep) { return ProcessResult.FAILED }
                let currentRoom = creep.room
                let homeFrontiers = Game.rooms[creep.memory.homeRoom].memory.frontiers

                if (homeFrontiers && homeFrontiers.length > 0) {
                    let targetFrontier = homeFrontiers[0]

                    if (currentRoom.name != creep.memory.homeRoom &&
                        (targetFrontier == currentRoom.name ||
                            !Agent.isRoomExplored(currentRoom.name) ||
                            Agent.shouldUpdateIntel(currentRoom.name))) {
                        if (!Memory.rooms[currentRoom.name]) {
                            Memory.rooms[currentRoom.name] = {}
                        }

                        let roomStatistics = Agent.generateRoomStatistics(currentRoom)

                        Memory.rooms[currentRoom.name].intel = roomStatistics

                        if (targetFrontier == currentRoom.name) {
                            homeFrontiers.push(homeFrontiers.shift()!)
                            Memory.rooms[creep.memory.homeRoom].frontiers = homeFrontiers
                        }
                    }

                    if (creep.room.name != targetFrontier) {
                        let opts =  {
                            avoidCreeps: true,
                            plainCost: 2,
                            swampCost: 2,
                        };
                        creep.travel({ pos: new RoomPosition(25, 25, targetFrontier), range: 23 }, opts, opts)
                    }

                }
                return ProcessResult.RUNNING
            }

            creep.memory.task = Task.AGENT
            let newProcess = new Process(creep.name, ProcessPriority.LOW, agentTask)
            global.scheduler.addProcess(newProcess)
        }
    }

    private static isRoomExplored(targetFrontier: string): boolean {
        if (!Game.rooms[targetFrontier]) return false
        if (!Game.rooms[targetFrontier].memory) return false
        if (!Game.rooms[targetFrontier].memory.intel) return false
        return true
    }

    private static shouldUpdateIntel(targetRoom: string): boolean {
        let intel = Memory.rooms[targetRoom].intel
        if (!intel) return true
        if (Game.time - intel.exploredTime > 3000) return true
        return false
    }

    private static generateRoomStatistics(room: Room): RoomStatistics {
        let exploredTime = Game.time
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
            exploredTime,
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

    private static getThreatLevel(targetRoom: Room): DangerLevel {
        const controller = targetRoom.controller

        if (!controller) {
            //Check for invaders, stronghold
            for (const core of targetRoom.invaderCores) {
                if (core.level === 0) return DangerLevel.INVADERS;
                if (core.level < 3) return DangerLevel.WARY;
                if (core.level < 5) return DangerLevel.DANGER;
                return DangerLevel.DEATH;
            }
            if (targetRoom.keeperLairs.length > 0) return DangerLevel.INVADERS;
            else if (targetRoom.find(FIND_HOSTILE_CREEPS, {filter: (c) => c.owner.username !== 'invader'}).length > 1 || targetRoom.find(FIND_HOSTILE_POWER_CREEPS).length > 0) return DangerLevel.WARY;
            else return DangerLevel.PEACEFUL;
        } else {
            // Check reservations and owners
            if (controller.reservation) {
                if (controller.reservation.username === 'invader') return DangerLevel.PEACEFUL;
                if (Object.values(Developer).includes(controller.reservation.username as Developer)) return DangerLevel.PEACEFUL;
                return DangerLevel.WARY;
            } else if (controller.owner) {
                if (Object.values(Developer).includes(controller.owner.username as Developer)) return DangerLevel.PEACEFUL;
                if (targetRoom.towers.length < 3) return DangerLevel.WARY;
                if (targetRoom.towers.length < 6) return DangerLevel.DANGER;
                return DangerLevel.DEATH;
            } else return DangerLevel.PEACEFUL;
        }

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
            let core = targetRoom.find(FIND_STRUCTURES, { filter: structure => structure.structureType == STRUCTURE_INVADER_CORE });
            let coreId = core.length > 0 ? core[0].id: undefined

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
