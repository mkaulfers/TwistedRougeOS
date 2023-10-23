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
        // Pull Supporting
        let room = Game.rooms[this.roomName]
        if (!room) return ERR_NOT_OWNER
        let terminal = room.terminal
        if (!terminal) return ERR_NOT_FOUND
        // Feasibility check: Can we buy or sell this?


        this.requests.push(request)
        return OK
    }

}
