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

            //TODO: There is a bug here. When you respawn, the controller is undefined. It's possible the room is not being set properly or that the scheduler isn't removing the dead process from memory.
            let controller = room.controller
            if (!controller) return
            if (room.controller?.my)
                if (controller.safeModeCooldown) return
            if (!controller.safeModeAvailable) return
            if (controller.upgradeBlocked > 0) return

            // Safemode when important structure is about to be destroyed
            const eventLog = room.getEventLog()
            let shouldSafeMode = false;
            const structuresToSafeFor: StructureConstant[] = [
                STRUCTURE_SPAWN,
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
                        if (eventItem.data.type !== 'creep' && structuresToSafeFor.includes(eventItem.data.type) {

                        }
                    case EVENT_ATTACK:
                    case EVENT_ATTACK_CONTROLLER:

                }
                if (eventItem.event != EVENT_ATTACK) continue

                // [{"event":2,"objectId":"3d3e10524c470b0ee310ecab","data":{"type":"rampart"}},{"event":1,"objectId":"fc92a38911b5738ac01bc866","data":{"targetId":"3d3e10524c470b0ee310ecab","damage":100,"attackType":2}}]
                // [{"event":1,"objectId":"fc92a38911b5738ac01bc866","data":{"targetId":"bcf244a2477403399a50a9d8","damage":100,"attackType":2}},{"event":2,"objectId":"bcf244a2477403399a50a9d8","data":{"type":"creep"}}]

                const attackTarget = Game.getObjectById(eventItem.data.targetId as Id<AnyCreep | AnyStructure>)
                if (attackTarget != null && (!('my' in attackTarget) || (attackTarget.my == true)) && !attackTarget.structureType) continue
                controller.activateSafeMode()
                break
            }

            const enemyAttackers = room.find(FIND_HOSTILE_CREEPS)
            const playerAttackers = enemyAttackers.filter(enemyAttacker => enemyAttacker.owner.username !== 'Invader');
            const InvaderAttackers = enemyAttackers.filter(enemyAttacker => enemyAttacker.owner.username === 'Invader');
        }

        let newProcess = new Process(roomProcessId, ProcessPriority.LOW, monitorTask)
        global.scheduler.addProcess(newProcess)
    },
    scheduleTowerMonitor: function(room: Room) {
        const roomId = room.name

        const towerMonitorTask = () => {
            let room = Game.rooms[roomId]
            let towers = room.towers();
        }

        let newProcess = new Process(`${room.name}_tower_monitor`, ProcessPriority.LOW, towerMonitorTask)
        global.scheduler.addProcess(newProcess)
    },


}

export default ThreatManager;
