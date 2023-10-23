import { INFO } from "Constants/LogConstants"
import MarketManager from "Managers/MarketManager"
import { Utils } from "utils/Index"

export default class MarketRequests {
    roomName: string
    requests: MarketRequest[]
    /** Number of standard deviations off of average we are willing to go */
    limit: number
    /** Minimum number of credits to keep on hand. */
    creditMin: number

    constructor(roomName: string, requests: MarketRequest[] = [], limit: number = 2, creditMin: number = 100000000) {
        this.roomName = roomName
        this.requests = requests
        this.limit = limit
        this.creditMin = creditMin
    }

    /** Add request to the request list. */
    add(request: MarketRequest): ScreepsReturnCode {
        // Pull Supporting
        let room = Game.rooms[this.roomName]
        if (!room) return ERR_NOT_OWNER
        let terminal = room.terminal
        if (!terminal) return ERR_NOT_ENOUGH_EXTENSIONS

        // Pull data for feasibility check
        let priceData = terminal.fetchPrice(request.resource)
        let priceEdge: number | undefined

        // Feasibility check
        switch (request.action) {
            case 'buy':
                priceEdge = priceData.price + (priceData.std * this.limit)
                if (!priceEdge) return ERR_NOT_FOUND
                if (Game.market.credits < (priceEdge * request.quantity) + this.creditMin) return ERR_NOT_ENOUGH_RESOURCES
                break
            case 'sell':
                priceEdge = priceData.price - (priceData.std * this.limit)
                if (!priceEdge) return ERR_NOT_FOUND
                if (priceEdge < 1) return ERR_NOT_ENOUGH_RESOURCES
                break
        }

        this.requests.push(request)
        return OK
    }

    /** Removes a request from the list. */
    remove(request: MarketRequest): ScreepsReturnCode {
        let index = this.requests.indexOf(request)
        if (index < 0) return ERR_NOT_FOUND
        this.requests.splice(index, 1)
        return OK
    }

    /** Moves the request to the end of the list. */
    moveToEnd(request: MarketRequest): ScreepsReturnCode {
        let index = this.requests.indexOf(request)
        if (index < 0) return ERR_NOT_FOUND
        let moving = this.requests.splice(index, 1)
        this.requests.push(...moving)
        return OK
    }

    /** Confirms if the request exists in the list. */
    isPresent(opts: { resource?: ResourceConstant, action?: 'buy' | 'sell' }): boolean {
        let found = false
        this.requests.find((r) => {
            switch (true) {
                case !opts.action && opts.resource && r.resource === opts.resource:
                case !opts.resource && opts.action && r.action === opts.action:
                case opts.resource && r.resource === opts.resource && opts.action && r.action === opts.action:
                found = true
            }
        })
        return found
    }
}
