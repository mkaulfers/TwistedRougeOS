import { InvaderDetail } from "./InvaderDetail"
import { MineralDetails } from "./MineralDetails"
import { PlayerDetail } from "./PlayerDetail"
import { PortalDetails } from "./PortalDetails"

export class RoomStatistics {
    name: String
    swampCount: number
    plainCount: number
    wallCount: number
    highestDT: number
    threatLevel: number

    sourcesIds?: string[]
    powerBankId?: string
    publicTerminalId?: string

    portal?: PortalDetails
    mineral?: MineralDetails
    controllerId?: string
    distanceBetweenSources?: number
    largestDistanceToController?: number
    playerDetails?: PlayerDetail
    invaderDetails?: InvaderDetail

    constructor(name: String,
        swampCount: number,
        plainCount: number,
        wallCount: number,
        highestDT: number,
        threatLevel: number,
        sourcesIds?: string[],
        powerBankId?: string,
        publicTerminalId?: string,
        portal?: PortalDetails,
        mineral?: MineralDetails,
        controllerId?: string,
        distanceBetweenSources?: number,
        largestDistanceToController?: number,
        playerDetails?: PlayerDetail,
        invaderDetails?: InvaderDetail) {
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
        this.playerDetails = playerDetails
        this.invaderDetails = invaderDetails
    }
}
