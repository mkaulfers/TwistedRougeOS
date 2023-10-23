import { INFO } from "Constants/LogConstants"
import { Utils } from "utils/Index"

export default class MarketRequests {
    roomName: string
    requests: MarketRequest[]

    constructor(roomName: string, requests: MarketRequest[] = []) {
        this.roomName = roomName
        this.requests = requests
    }

    // interface MarketRequest {
    //     action: "buy" | "sell"
    //     resource: ResourceConstant
    //     quantity: number
    //     active?: boolean
    // }

    /** Add request to the request list. */
    add(request: MarketRequest): ScreepsReturnCode {
        // Feasibility check: Can we buy or sell this?
        if (!this.viableRequest(request)) return ERR_NOT_ENOUGH_RESOURCES

        return OK
    }

    private viableRequest(request: MarketRequest): boolean {
        return true
    }
}
