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


            // Retrieve terminal, requests
            let terminal = room.terminal
            let storage = room.storage
            let requests = room.cache.marketRequests ? room.cache.marketRequests : []
            if (!terminal || !storage) return

            // Market Request Handling
            if (Game.time % 25 === 0) {
                this.standardRequests(room, terminal, requests)
                this.processRequests(room, terminal, requests)
            }

            // Terminal Inventory Management
            if (Game.time % 1500 === 0) {
                this.manageTerminal(room, terminal, requests)
            }



            return RUNNING
        }

        let newProcess = new Process(processName, INDIFFERENT, task)
        global.scheduler.addProcess(newProcess)
    }

    // Processes all market requests, tracking which are active, removing ones fulfilled, guarding against imposssible requests, etc.
    private static processRequests(room: Room, terminal: StructureTerminal, requests: MarketRequest[]) {



    }

    // Manages terminal inventory given static energy guards and dynamic inventory based on requests.
    private static manageTerminal(room: Room, terminal: StructureTerminal, requests: MarketRequest[]) {

    }

    private static standardRequests(room: Room, terminal: StructureTerminal, requests: MarketRequest[]) {

        // Emergency Energy Requisition


    }

    // interface MarketRequest {
    //     action: "buy" | "sell"
    //     resource: ResourceConstant
    //     quantity: number
    //     active?: boolean
    // }

    static addRequest(room: Room, terminal: StructureTerminal, requests: MarketRequest[], request: MarketRequest): ScreepsReturnCode {

        // Feasibility check: Can we buy or sell this
        let marketPrice = terminal.fetchPrice

        return OK
    }
}
