export class PlayerDetail {
    username?: string
    rclLevel?: number
    reserved?: boolean

    storageDetails?: StorageDetails[]
    hostileStructuresDetails?: HostileStructuresDetails[]
    defensiveStructuresDetails?: DefenseStructuresDetails[]

    constructor(username?: string,
        rclLevel?: number,
        reserved?: boolean,
        storageDetails?: StorageDetails[],
        hostileStructuresDetails?: HostileStructuresDetails[],
        defensiveStructuresDetails?: DefenseStructuresDetails[]) {
        this.username = username
        this.rclLevel = rclLevel
        this.reserved = reserved
        this.storageDetails = storageDetails
        this.hostileStructuresDetails = hostileStructuresDetails
        this.defensiveStructuresDetails = defensiveStructuresDetails
    }
}

export class StorageDetails {
    id: string
    resources: [ResourceConstant, number][]

    constructor(id: string, resources: [ResourceConstant, number][]) {
        this.id = id
        this.resources = resources
    }
}

export class HostileStructuresDetails {
    structureId: string
    structureType: StructureConstant
    health: number

    constructor(structureId: string, structureType: StructureConstant, health: number) {
        this.structureId = structureId
        this.structureType = structureType
        this.health = health
    }
}

export class DefenseStructuresDetails {
    structureId: string
    structureType: StructureConstant
    health: number

    constructor(structureId: string, structureType: StructureConstant, health: number) {
        this.structureId = structureId
        this.structureType = structureType
        this.health = health
    }
}
