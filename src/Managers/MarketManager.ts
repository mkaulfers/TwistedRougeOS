import { INDIFFERENT } from "Constants/ProcessPriorityConstants";
import { FATAL, RUNNING } from "Constants/ProcessStateConstants";
import { Process } from "../Models/Process"
import MarketRequests from "Models/MarketRequests";
export default class MarketManager {
    static schedule(room: Room) {
        const roomName  = room.name;
        const processName = `${roomName}_market_manager`;
        if (global.scheduler.processQueue.has(processName)) return;

        const task = () => {
            const room = Game.rooms[roomName];
            if (!room || !room.my) return FATAL;


            // Retrieve terminal, requests
            let terminal = room.terminal
            let storage = room.storage
            let marketRequests = room.cache.marketRequests ? room.cache.marketRequests : new MarketRequests(room.name)
            if (!terminal || !storage) return

            if (Game.time % 25 === 0) {
                // Market Request Handling
                marketRequests = this.processRequests(room, marketRequests, terminal)

                // Terminal Inventory Management
                marketRequests = this.manageTerminal(room, marketRequests, terminal, storage)
            }

            if (Game.time % 500 === 0) {
                marketRequests = this.standardRequests(room, marketRequests, terminal, storage)
            }

            return RUNNING
        }

        let newProcess = new Process(processName, INDIFFERENT, task)
        global.scheduler.addProcess(newProcess)
    }

    /** Generic requests for every room */
    private static standardRequests(room: Room, marketRequests: MarketRequests, terminal: StructureTerminal, storage: StructureStorage): MarketRequests {

        // Excess energy selling
        if (storage.store.energy > 250000 && terminal.store.energy > 100000) {
            // Is one already created?
            if (!marketRequests.isPresent({resource: RESOURCE_ENERGY, action: 'sell'})) {
                marketRequests.add({
                    action:
                })
            }

        }

        // Emergency Energy Requisition

        return marketRequests
    }

    // Processes all market requests, tracking which are active, removing ones fulfilled, guarding against imposssible requests, etc.
    private static processRequests(room: Room, marketRequests: MarketRequests, terminal: StructureTerminal): MarketRequests {
        // Set request to consider this tick
        let request = marketRequests.requests[0]
        if (!request) return marketRequests

        this.confirm(terminal, request)
        this.process(terminal, request)
        return marketRequests
    }

    // Manages terminal inventory given static energy guards and dynamic inventory based on requests.
    private static manageTerminal(room: Room, marketRequests: MarketRequests, terminal: StructureTerminal): MarketRequests {

        return marketRequests
    }

    /** Attempts to confirm a request's completion. */
    private static confirm(terminal: StructureTerminal, request: MarketRequest): ScreepsReturnCode {
        let qty = terminal.store[request.resource]

        switch (true) {
            case request.action === 'buy' && qty === request.quantity:
            case request.action === 'sell' && qty === 0:
                return OK
        }

        return ERR_NOT_ENOUGH_RESOURCES
    }

    /** Attempts to process request. */
    private static process(terminal: StructureTerminal, request: MarketRequest): ScreepsReturnCode {
        let result: ScreepsReturnCode | undefined
        switch (request.action) {
            case 'buy':
                result = terminal.buy(request.resource, { quantity: request.quantity })
                break
            case 'sell':
                result = terminal.sell(request.resource, { quantity: request.quantity })
                break
        }
        return result ? result : OK
    }
}
