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

    constructor(id: string, resources: [ResourceConstant, number][]) {
        this.id = id
        this.resources = resources
    }
}

export class HostileStructuresDetail {
    structureId: string
    structureType: StructureConstant
    health: number

    constructor(structureId: string, structureType: StructureConstant, health: number) {
        this.structureId = structureId
        this.structureType = structureType
        this.health = health
    }
}

export class DefenseStructuresDetail {
    structureId: string
    structureType: StructureConstant
    health: number

    constructor(structureId: string, structureType: StructureConstant, health: number) {
        this.structureId = structureId
        this.structureType = structureType
        this.health = health
    }
}
