import { Process } from "../Models/Process"
import { Utils } from "../utils/Index";
import { Role, Task, ProcessPriority, ProcessResult, LogLevel } from '../utils/Enums'

export default class MarketManager {
    static schedule(room: Room) {
        const roomName  = room.name;
        const processName = `${roomName}_market_manager`;
        if (global.scheduler.processQueue.has(processName)) return;

        const task = () => {
            const room = Game.rooms[roomName];
            const terminal = room.terminal;
            const storage = room.storage;
            if (!terminal || !storage) return ProcessResult.RUNNING;

            if (storage.store.getUsedCapacity(RESOURCE_ENERGY) > 450000 && terminal.store.getUsedCapacity(RESOURCE_ENERGY) > 20000) {
                terminal.sell(RESOURCE_ENERGY, { quantity: terminal.store.energy - 20000 });
            }

            return ProcessResult.RUNNING
        }

        let newProcess = new Process(processName, ProcessPriority.INDIFFERENT, task)
        global.scheduler.addProcess(newProcess)
    }

}
