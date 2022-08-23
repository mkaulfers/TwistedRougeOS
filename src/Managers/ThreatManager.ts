import { Process } from "Models/Process"
import { Utils } from "utils/Index"
import { Role, Task, ProcessPriority, ProcessResult, LogLevel, StampType, DangerLevel } from '../utils/Enums'

var ThreatManager = {
    scheduleThreatMonitor: function(room: Room) {
        let roomName = room.name
        let roomProcessId = roomName + "_threat_monitor"
        if (global.scheduler.processQueue.has(roomProcessId)) { return }

        const monitorTask = () => {
            Utils.Logger.log(`ThreatManager -> ${roomProcessId}`, LogLevel.TRACE)
            let room = Game.rooms[roomName]

            // Handle Turrets
            const enemyAttackers = room.find(FIND_HOSTILE_CREEPS)
            const playerAttackers = enemyAttackers.filter(enemyAttacker => enemyAttacker.owner.username !== 'Invader');
            const InvaderAttackers = enemyAttackers.filter(enemyAttacker => enemyAttacker.owner.username === 'Invader');

            // Safemode Handling
            ThreatManager.safeModer(room);
        }

        let newProcess = new Process(roomProcessId, ProcessPriority.LOW, monitorTask)
        global.scheduler.addProcess(newProcess)
    },
    safeModer: function(room: Room) {
        // TODO: There is a bug here. When you respawn, the controller is undefined. It's possible the room is not being set properly or that the scheduler isn't removing the dead process from memory.
        let controller = room.controller
        if (!controller) return
        if (room.controller?.my)
            if (controller.safeModeCooldown) return
        if (!controller.safeModeAvailable) return
        if (controller.upgradeBlocked > 0) return

        const eventLog = room.getEventLog()
        let shouldSafeMode = false;
        const structuresToSafeFor: StructureConstant[] = [
            STRUCTURE_SPAWN,
            STRUCTURE_POWER_SPAWN,
            STRUCTURE_EXTENSION,
            STRUCTURE_RAMPART,
            STRUCTURE_CONTROLLER,
            STRUCTURE_LINK,
            STRUCTURE_STORAGE,
            STRUCTURE_TOWER,
            STRUCTURE_OBSERVER,
            STRUCTURE_LAB,
            STRUCTURE_TERMINAL,
            STRUCTURE_NUKER,
            STRUCTURE_FACTORY
        ];
        for (const eventItem of eventLog) {
            switch (eventItem.event) {
                case EVENT_OBJECT_DESTROYED:
                    if (eventItem.data.type == 'creep' || !structuresToSafeFor.includes(eventItem.data.type)) continue;
                    shouldSafeMode = true;
                    break;
                case EVENT_ATTACK:
                    let target = Game.getObjectById(eventItem.data.targetId as Id<AnyCreep | AnyStructure>);
                    if (target && 'structureType' in target && structuresToSafeFor.includes(target.structureType)) {
                        if (target.structureType !== STRUCTURE_RAMPART && target.structureType !== STRUCTURE_WALL) {
                            if (target.hits <= (target.hitsMax * 0.25)) shouldSafeMode = true;
                        } else {
                            if (target.hits <= (room.rampartHPTarget() * 0.25)) shouldSafeMode = true;
                        }
                    }
                    break;
                case EVENT_ATTACK_CONTROLLER:
                    shouldSafeMode = true
                    break;
            }
        }

        if (shouldSafeMode === true) {
            controller.activateSafeMode();
        }

    },


}

export default ThreatManager;
