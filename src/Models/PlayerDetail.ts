import { Coord } from "screeps-cartographer"

export class PlayerDetail {
    username?: string
    rclLevel?: number
    reserved?: boolean

    storageDetails?: StorageDetail[]
    hostileStructuresDetails?: HostileStructuresDetail[]
    defensiveStructuresDetails?: DefenseStructuresDetail[]

    constructor(username?: string,
        rclLevel?: number,
        reserved?: boolean,
        storageDetails?: StorageDetail[],
        hostileStructuresDetails?: HostileStructuresDetail[],
        defensiveStructuresDetails?: DefenseStructuresDetail[]) {
        this.username = username
        this.rclLevel = rclLevel
        this.reserved = reserved
        this.storageDetails = storageDetails
        this.hostileStructuresDetails = hostileStructuresDetails
        this.defensiveStructuresDetails = defensiveStructuresDetails
    }
}

export class StorageDetail {
    id: string
    resources: [ResourceConstant, number][]
    pos: Coord

    constructor(id: string, resources: [ResourceConstant, number][], pos: Coord) {
        this.id = id
        this.resources = resources
        this.pos = pos
    }
}

export class HostileStructuresDetail {
    structureId: string
    structureType: StructureConstant
    health: number
    pos: Coord

    constructor(structureId: string, structureType: StructureConstant, health: number, pos: Coord) {
        this.structureId = structureId
        this.structureType = structureType
        this.health = health
        this.pos = pos
    }
}

export class DefenseStructuresDetail {
    structureId: string
    structureType: StructureConstant
    health: number
    pos: Coord

    constructor(structureId: string, structureType: StructureConstant, health: number, pos: Coord) {
        this.structureId = structureId
        this.structureType = structureType
        this.health = health
        this.pos = pos
    }
}
