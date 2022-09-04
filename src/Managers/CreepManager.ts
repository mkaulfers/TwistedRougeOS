import { Roles } from "Creeps/Index"
import { Process } from "Models/Process"
import { Utils } from "utils/Index"
import { Role, Task, ProcessPriority, ProcessResult, LogLevel, StampType, DangerLevel, LinkState } from '../utils/Enums'

export default class CreepManager {
    static scheduleCreepTask(room: Room) {
        Utils.Logger.log("Room -> scheduleCreepTask()", LogLevel.TRACE)
        let creeps = room.localCreeps.all
        for (let i = 0; i < creeps.length; i++) {
            let creep = creeps[i]
            if (global.scheduler.processQueue.has(creep.name)) { continue }

            switch (creep.memory.task as Task) {
                case Task.HARVESTER_EARLY:
                    Roles.harvester.harvesterEarlyTask(creep)
                    break
                case Task.HARVESTER_SOURCE:
                    Roles.harvester.harvesterSource(creep)
                    break
                case Task.TRUCKER_STORAGE:
                    Roles.trucker.truckerStorage(creep)
                    break
                case Task.TRUCKER_SCIENTIST:
                    Roles.trucker.truckerScientist(creep)
                    break
                case Task.SCIENTIST_UPGRADING:
                    Roles.scientist.scientistUpgrading(creep)
                    break
                case Task.ENGINEER_BUILDING:
                    Roles.engineer.engineerBuilding(creep)
                    break
                case Task.ENGINEER_REPAIRING:
                    Roles.engineer.engineerRepairing(creep)
                    break
                case Task.ENGINEER_UPGRADING:
                    Roles.engineer.engineerUpgrading(creep)
                    break
                case Task.FILLER:
                    Roles.filler.fillerWorking(creep)
                    break
                case Task.AGENT:
                    Roles.agent.scheduleAgentTask(creep)
            }
        }
    }

    static scheduleRoomTaskMonitor(room: Room): void | ProcessResult {
        const roomName = room.name

        const roomTaskMonitor = () => {
            let room = Game.rooms[roomName]
            let roles = _.keys(Roles) as Array<keyof typeof Roles>; // triage change to make this role-confirming section work.
            if (!room) { return }
            _.forEach(roles, function (role) {
                if (room.localCreeps.all.length < 1) { return }
                Roles[role].dispatch(room);
            });
        }

        let process = new Process(`${roomName}_task_monitor`, ProcessPriority.CRITICAL, roomTaskMonitor)
        global.scheduler.addProcess(process)
    }
}
