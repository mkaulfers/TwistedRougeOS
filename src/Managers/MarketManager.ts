import { INDIFFERENT } from "Constants/ProcessPriorityConstants";
import { FATAL, RUNNING } from "Constants/ProcessStateConstants";
import { Process } from "../Models/Process"
import { Utils } from "utils/Index";
import MarketRequests from "Models/MarketRequests";
import { DEBUG } from "Constants/LogConstants";
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

            if (Game.time % 10 === 0 && terminal.cooldown === 0) {
                // Market Request Handling
                marketRequests = this.processRequests(room, marketRequests, terminal, storage)
            }

            if (Game.time % 500 === 0) {
                // Terminal Inventory Management
                marketRequests = this.standardRequests(room, marketRequests, terminal, storage)
                this.manageTerminal(room, marketRequests, terminal, storage)
            }

            room.cache.marketRequests = marketRequests
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
                    action: 'sell',
                    resource: RESOURCE_ENERGY,
                    quantity: terminal.store.energy - 20000 > 50000 ? 50000 : terminal.store.energy - 20000
                })
            }
        }

        // Emergency Energy Requisition
        if (storage.store.energy < 50000 && terminal.store.energy >= 20000 && terminal.store.energy < 70000 - storage.store.energy) {
            if (!marketRequests.isPresent({resource: RESOURCE_ENERGY, action: 'buy'})) {
                marketRequests.add({
                    action: 'buy',
                    resource: RESOURCE_ENERGY,
                    quantity: 50000
                })
            }
        }

        // Temporary non energy selling. Remove once labs are made to work.
        for (let resource in storage.store) {
            if (!Utils.Typeguards.isResourceConstant(resource)) continue
            if (resource === RESOURCE_ENERGY) continue

            if (storage.store[resource] > 0 && !marketRequests.isPresent({resource: resource, action: 'sell'})) {
                let result = marketRequests.add({
                    action: 'sell',
                    resource: resource,
                    quantity: storage.store[resource] > 50000 ? 50000 : storage.store[resource],
                    active: true
                })

                if (result !== OK) continue
                if (!room.cache.anchorRequests) room.cache.anchorRequests = []
                room.cache.anchorRequests.push({
                    supplyId: storage.id,
                    targetId: terminal.id,
                    resource: resource,
                    qty: storage.store[resource] > 50000 ? 50000 : storage.store[resource]
                })
            }
        }

        return marketRequests
    }

    // Processes all market requests, tracking which are active, removing ones fulfilled, guarding against imposssible requests, etc.
    private static processRequests(room: Room, marketRequests: MarketRequests, terminal: StructureTerminal, storage: StructureStorage): MarketRequests {
        // Set request to consider this tick
        let request = marketRequests.requests[0]
        if (!request) return marketRequests

        if (!this.confirm(terminal, request)) {
            request.active = true
            let result = this.process(terminal, request)
            if (result === ERR_NOT_FOUND) marketRequests.moveToEnd(request)
        } else {
            // Anchor Request to move purchased materials to the storage
            if (!room.cache.anchorRequests) room.cache.anchorRequests = []
            room.cache.anchorRequests.push({
                supplyId: terminal.id,
                targetId: storage.id,
                resource: request.resource,
                qty: request.quantity
            })

            // Remove completed request from Market Requests
            marketRequests.remove(request)
        }
        return marketRequests
    }

    // Manages terminal inventory given static energy guards and dynamic inventory based on requests.
    private static manageTerminal(room: Room, marketRequests: MarketRequests, terminal: StructureTerminal, storage: StructureStorage) {
        // Use active requests to determine required space
        let required: { [Property in ResourceConstant]?: number} = {
            'energy': 20000
        }
        for (let request of marketRequests.requests) {
            if (request.active === true) {
                required[request.resource] ? required[request.resource]! += request.quantity : required[request.resource] = request.quantity
            }
        }

        for (let key in terminal.store) {
            if (!Utils.Typeguards.isResourceConstant(key)) continue
            let quantity = terminal.store[key]
            let shouldHave = required[key]
            if (!shouldHave) shouldHave = 0

            // Too much of a resource? Send it to storage!
            if (quantity > shouldHave) {
                if (!room.cache.anchorRequests) room.cache.anchorRequests = []
                room.cache.anchorRequests.push({
                    supplyId: terminal.id,
                    targetId: storage.id,
                    resource: key,
                    qty: quantity - shouldHave
                })
            }
        }

    }

    /** Attempts to confirm a request's completion. */
    private static confirm(terminal: StructureTerminal, request: MarketRequest): boolean {
        let qty = terminal.store[request.resource]

        switch (true) {
            case request.resource === RESOURCE_ENERGY && request.action === 'buy' && qty - 20000 >= request.quantity:
            case request.action === 'buy' && qty >= request.quantity:
            case request.action === 'sell' && qty === 0:
                return true
        }

        return false
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
