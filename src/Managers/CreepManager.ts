import Roles from "Creeps/Index"
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

            // TODO: Write this generically.
            switch (creep.memory.task as Task) {
                case Task.HARVESTER_EARLY:
                    if (!Roles.harvester || !Roles.harvester.tasks.harvester_early) continue;
                    Roles.harvester.tasks.harvester_early(creep)
                    break
                case Task.HARVESTER_SOURCE:
                    if (!Roles.harvester || !Roles.harvester.tasks.harvester_source) continue;
                    Roles.harvester.tasks.harvester_source(creep)
                    break
                case Task.TRUCKER_STORAGE:
                    if (!Roles.trucker || !Roles.trucker.tasks.trucker_storage) continue;
                    Roles.trucker.tasks.trucker_storage(creep)
                    break
                case Task.TRUCKER_SCIENTIST:
                    if (!Roles.trucker || !Roles.trucker.tasks.trucker_scientist) continue;
                    Roles.trucker.tasks.trucker_scientist(creep)
                    break
                case Task.SCIENTIST_UPGRADING:
                    if (!Roles.scientist || !Roles.scientist.tasks.scientist_upgrading) continue;
                    Roles.scientist.tasks.scientist_upgrading(creep)
                    break
                case Task.ENGINEER_BUILDING:
                    if (!Roles.engineer || !Roles.engineer.tasks.engineer_building) continue;
                    Roles.engineer.tasks.engineer_building(creep)
                    break
                case Task.ENGINEER_REPAIRING:
                    if (!Roles.engineer || !Roles.engineer.tasks.engineer_repairing) continue;
                    Roles.engineer.tasks.engineer_repairing(creep)
                    break
                case Task.ENGINEER_UPGRADING:
                    if (!Roles.engineer || !Roles.engineer.tasks.engineer_upgrading) continue;
                    Roles.engineer.tasks.engineer_upgrading(creep)
                    break
                case Task.FILLER:
                    if (!Roles.filler || !Roles.filler.tasks.filler_working) continue;
                    Roles.filler.tasks.filler_working(creep)
                    break
                case Task.AGENT:
                    if (!Roles.agent || !Roles.agent.tasks.agent) continue;
                    Roles.agent.tasks.agent(creep)
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

                let theRole = Roles[role];
                if (theRole) theRole.dispatch(room);
            });
        }

        let process = new Process(`${roomName}_task_monitor`, ProcessPriority.CRITICAL, roomTaskMonitor)
        global.scheduler.addProcess(process)
    }
}
