import { Process } from "../Models/Process"
import { Utils } from "../utils/Index";
import { Role, Task, ProcessPriority, ProcessResult, LogLevel } from '../utils/Enums'

export default class MarketManager {
    static schedule(room: Room) {
        const roomName  = room.name;
        const processName = `${roomName}_market_manager`;
        if (global.scheduler.processQueue.has(processName)) return;

        const task = () => {

            return ProcessResult.RUNNING
        }

        let newProcess = new Process(processName, ProcessPriority.INDIFFERENT, task)
        global.scheduler.addProcess(newProcess)
    }

}











