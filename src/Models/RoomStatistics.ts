import { Coord } from "screeps-cartographer/dist/utils/packrat"
import { DangerLevel } from "utils/Enums"
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
    threatLevel: DangerLevel

    sources?: {
        targetId: Id<any>,
        x: number,
        y: number
    }[]

    powerBankId?: string
    publicTerminalId?: string

    portal?: PortalDetail
    mineral?: MineralDetail
    controllerPos?: Coord
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
        sources?: {targetId: Id<any>, x: number, y: number}[],
        powerBankId?: string,
        publicTerminalId?: string,
        portal?: PortalDetail,
        mineral?: MineralDetail,
        controllerPos?: Coord,
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
        this.sources = sources
        this.powerBankId = powerBankId
        this.publicTerminalId = publicTerminalId
        this.portal = portal
        this.mineral = mineral
        this.controllerPos = controllerPos
        this.distanceBetweenSources = distanceBetweenSources
        this.largestDistanceToController = largestDistanceToController
        this.playerDetail = playerDetail
        this.invaderDetail = invaderDetail
    }
}
