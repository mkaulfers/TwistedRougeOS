import Roles from "Creeps/Index"
import { Process } from "Models/Process"
import { Utils } from "utils/Index"
import { Role, Task, ProcessPriority, ProcessResult, LogLevel, StampType, DangerLevel, LinkState } from '../utils/Enums'

export default class CreepManager {
    static scheduleCreepTask(room: Room) {
        Utils.Logger.log("Room -> scheduleCreepTask()", LogLevel.TRACE)
        let creeps = room.stationedCreeps.all
        for (let i = 0; i < creeps.length; i++) {
            let creep = creeps[i]
            if (global.scheduler.processQueue.has(creep.name)) { continue }

            let activeRole = Roles[creep.memory.role];
            if (!activeRole || !creep.memory.task) continue;
            let task: ((creep: Creep) => void) | undefined = activeRole.tasks[creep.memory.task];
            if (!task) continue;
            task(creep);
        }
    }

    static scheduleRoomTaskMonitor(room: Room): void | ProcessResult {
        const roomName = room.name

        const roomTaskMonitor = () => {

            let room = Game.rooms[roomName];
            if (!room) return;

            for (const role of Object.values(Roles)) {
                if (room.stationedCreeps.all.length < 1) return;
                role.dispatch(room);
            }
        }

        let process = new Process(`${roomName}_task_monitor`, ProcessPriority.CRITICAL, roomTaskMonitor)
        global.scheduler.addProcess(process)
    }
}
