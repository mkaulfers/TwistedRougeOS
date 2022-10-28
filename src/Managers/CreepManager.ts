
import { TRACE } from "Constants/LogConstants"
import { CRITICAL } from "Constants/ProcessPriorityConstants"
import { ProcessState, FATAL, RUNNING } from "Constants/ProcessStateConstants"
import CreepClasses from "Creeps/Index"
import { Process } from "Models/Process"
import { Utils } from "utils/Index"
import { Role } from "Constants/RoleConstants"
import { Task } from "Constants/TaskConstants"
export default class CreepManager {
    static scheduleCreepTask(room: Room) {
        Utils.Logger.log("Room -> scheduleCreepTask()", TRACE)
        let creeps = room.stationedCreeps.all
        for (let i = 0; i < creeps.length; i++) {
            let creep = creeps[i]
            if (global.scheduler.processQueue.has(creep.name)) { continue }

            let activeRole = CreepClasses[creep.memory.role as Role];
            if (!activeRole || !creep.memory.task) continue;
            let task: ((creep: Creep) => void) | undefined = activeRole.tasks[creep.memory.task as Task];
            if (!task) continue;
            task(creep);
        }
    }

    static scheduleRoomTaskMonitor(room: Room): void | ProcessState {
        const roomName = room.name

        const roomTaskMonitor = () => {
            let room = Game.rooms[roomName];
            if (!room || !room.my) return FATAL;

            for (const role of Object.values(CreepClasses)) {
                if (room.stationedCreeps.all.length < 1) return RUNNING;
                role.dispatch(room);
            }
            return RUNNING
        }

        let process = new Process(`${roomName}_task_monitor`, CRITICAL, roomTaskMonitor)
        global.scheduler.addProcess(process)
    }
}
