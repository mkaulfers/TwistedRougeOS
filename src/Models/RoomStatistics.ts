import { InvaderDetail } from "./InvaderDetail"
import { MineralDetail } from "./MineralDetail"
import { PlayerDetail } from "./PlayerDetail"
import { PortalDetail } from "./PortalDetail"

export class RoomStatistics {
    exploredTime: number
    name: string
    swampCount: number
    plainCount: number
    wallCount: number
    highestDT: number
    threatLevel: number

    sourcesIds?: string[]
    powerBankId?: string
    publicTerminalId?: string

    portal?: PortalDetail
    mineral?: MineralDetail
    controllerId?: string
    distanceBetweenSources?: number
    largestDistanceToController?: number
    playerDetail?: PlayerDetail
    invaderDetail?: InvaderDetail

    constructor(
        explored: number,
        name: string,
        swampCount: number,
        plainCount: number,
        wallCount: number,
        highestDT: number,
        threatLevel: number,
        sourcesIds?: string[],
        powerBankId?: string,
        publicTerminalId?: string,
        portal?: PortalDetail,
        mineral?: MineralDetail,
        controllerId?: string,
        distanceBetweenSources?: number,
        largestDistanceToController?: number,
        playerDetail?: PlayerDetail,
        invaderDetail?: InvaderDetail) {
        this.exploredTime = explored
        this.name = name
        this.swampCount = swampCount
        this.plainCount = plainCount
        this.wallCount = wallCount
        this.highestDT = highestDT
        this.threatLevel = threatLevel
        this.sourcesIds = sourcesIds
        this.powerBankId = powerBankId
        this.publicTerminalId = publicTerminalId
        this.portal = portal
        this.mineral = mineral
        this.controllerId = controllerId
        this.distanceBetweenSources = distanceBetweenSources
        this.largestDistanceToController = largestDistanceToController
        this.playerDetail = playerDetail
        this.invaderDetail = invaderDetail
    }
}
