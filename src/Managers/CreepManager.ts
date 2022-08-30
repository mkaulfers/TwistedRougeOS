import { Roles } from "Creeps/Index"
import { Process } from "Models/Process"
import { Utils } from "utils/Index"
import { Role, Task, ProcessPriority, ProcessResult, LogLevel, StampType, DangerLevel, LinkState } from '../utils/Enums'

export default class CreepManager {
    static scheduleCreepTask(room: Room) {
        Utils.Logger.log("Room -> scheduleCreepTask()", LogLevel.TRACE)
        let creeps = room.creeps(undefined)
        for (let i = 0; i < creeps.length; i++) {
            let creep = creeps[i]
            if (global.scheduler.processQueue.has(creep.name)) { continue }

            switch (creep.memory.task as Task) {
                case Task.HARVESTER_EARLY:
                    Roles.Harvester.harvesterEarlyTask(creep)
                    break
                case Task.HARVESTER_SOURCE:
                    Roles.Harvester.harvesterSource(creep)
                    break
                case Task.TRUCKER_STORAGE:
                    Roles.Trucker.truckerStorage(creep)
                    break
                case Task.TRUCKER_SCIENTIST:
                    Roles.Trucker.truckerScientist(creep)
                    break
                case Task.SCIENTIST_UPGRADING:
                    Roles.Scientist.scientistUpgrading(creep)
                    break
                case Task.ENGINEER_BUILDING:
                    Roles.Engineer.engineerBuilding(creep)
                    break
                case Task.ENGINEER_REPAIRING:
                    Roles.Engineer.engineerRepairing(creep)
                    break
                case Task.ENGINEER_UPGRADING:
                    Roles.Engineer.engineerUpgrading(creep)
                    break
            }
        }
    }

    static scheduleRoomTaskMonitor(room: Room): void | ProcessResult {
        const roomName = room.name
        if (global.scheduler.processQueue.has(`${roomName}_task_monitor`)) { return }

        const roomTaskMonitor = () => {
            let room = Game.rooms[roomName]
            let roles = _.keys(Roles) as Array<keyof typeof Roles>; // triage change to make this role-confirming section work.
            if (!room) { return }
            _.forEach(roles, function (role) {
                if (room.creeps().length < 1) { return }
                Roles[role].dispatch(room);
            });
        }

        let process = new Process(`${roomName}_task_monitor`, ProcessPriority.CRITICAL, roomTaskMonitor)
        global.scheduler.addProcess(process)
    }
}
