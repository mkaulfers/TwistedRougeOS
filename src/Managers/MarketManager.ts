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

            const terminal = room.terminal;
            const storage = room.storage;
            if (!terminal || !storage) return RUNNING;

            if (storage.store.getUsedCapacity(RESOURCE_ENERGY) > 500000 && terminal.store.getUsedCapacity(RESOURCE_ENERGY) > 50000) {
                terminal.sell(RESOURCE_ENERGY, { quantity: terminal.store.energy - 20000 });
            }

            return RUNNING
        }

        let newProcess = new Process(processName, INDIFFERENT, task)
        global.scheduler.addProcess(newProcess)
    }

}











