import { INDIFFERENT } from "Constants/ProcessPriorityConstants";
import { FATAL, RUNNING } from "Constants/ProcessStateConstants";
import { Process } from "../Models/Process"
export default class MarketManager {
    static schedule(room: Room) {
        const roomName  = room.name;
        const processName = `${roomName}_market_manager`;
        if (global.scheduler.processQueue.has(processName)) return;

        const task = () => {
            const room = Game.rooms[roomName];
            if (!room || !room.my) return FATAL;

            // Guard terminal and storage not existing
            if (!room.terminal || !room.storage) return RUNNING;

            // Market Request Handling
            if (Game.time % 25 === 0) {
                this.standardRequests(room)
                this.processRequests(room)
            }

            // Terminal Inventory Management
            if (Game.time % 1500 === 0) {
                this.manageTerminal(room)
            }



            return RUNNING
        }

        let newProcess = new Process(processName, INDIFFERENT, task)
        global.scheduler.addProcess(newProcess)
    }

    // Processes all market requests, tracking which are active, removing ones fulfilled, guarding against imposssible requests, etc.
    private static processRequests(room: Room) {
        // Retrieve terminal, requests
        let terminal = room.terminal
        let requests = room.cache.marketRequests ? room.cache.marketRequests : []


    }

    // Manages terminal inventory given static energy guards and dynamic inventory based on requests.
    private static manageTerminal(room: Room) {
        // Retrieve terminal, requests
        let terminal = room.terminal
        let requests = room.cache.marketRequests ? room.cache.marketRequests : []

    }

    private static standardRequests(room: Room) {
        // Retrieve terminal, requests
        let terminal = room.terminal
        let requests = room.cache.marketRequests ? room.cache.marketRequests : []

        // Emergency Energy Requisition


    }

    // interface MarketRequest {
    //     action: "buy" | "sell"
    //     resource: ResourceConstant
    //     quantity: number
    //     active?: boolean
    // }

    static addRequest(room: Room, action: 'buy' | 'sell', resource: ResourceConstant, quantity: number) {
        // Feasibility check

    }
}











