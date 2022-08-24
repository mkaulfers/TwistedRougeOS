import { Process } from "Models/Process"
import { Utils } from "utils/Index"
import { Logger } from "utils/Logger"
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
            const invaderAttackers = enemyAttackers.filter(enemyAttacker => enemyAttacker.owner.username === 'Invader');

            switch (true) {
                case (playerAttackers.length == 0 && invaderAttackers.length == 0):

                    if (Game.time % 50 == 0) ThreatManager.towerHeal(room);
                    break;
                case (playerAttackers.length == 0 && invaderAttackers.length > 0):
                    Logger.log(`CanKill: ${ThreatManager.canKill(invaderAttackers[0])}`, LogLevel.INFO);
                    break;
                case (playerAttackers.length > 0 && invaderAttackers.length == 0): case (playerAttackers.length > 0 && invaderAttackers.length > 0):

                    // Handle Targeting
                    if (!global.Cache) global.Cache = {};
                    if (!global.Cache.rooms) global.Cache.rooms = {};
                    if (!global.Cache.rooms[room.name]) global.Cache.rooms[room.name] = {};
                    if (global.Cache.rooms[room.name].towerTarget && Game.getObjectById(global.Cache.rooms[room.name].towerTarget!) == null) delete global.Cache.rooms[room.name].towerTarget;

                    let target;
                    if (!global.Cache.rooms[room.name].towerTarget) {
                        let potential: AnyCreep;
                        let currentRelBodyLength: number = 0;
                        for (let enemy of playerAttackers) {
                            if (!ThreatManager.canKill(enemy)) continue;
                            let eRelBodyLength = enemy.body.filter((p) => { return (p.type === WORK || p.type === ATTACK || p.type === RANGED_ATTACK)}).length;
                            if (currentRelBodyLength && currentRelBodyLength < eRelBodyLength) {
                                potential = enemy;
                                currentRelBodyLength = eRelBodyLength;
                            }
                        }

                        if (potential!) {
                            global.Cache.rooms[room.name].towerTarget = potential.id;
                        }
                    }
                    let targetId = global.Cache.rooms[room.name].towerTarget;
                    if (targetId && Game.getObjectById(targetId) !== null) {
                        target = Game.getObjectById(targetId) as AnyCreep;
                        ThreatManager.towerAttack(target);
                    } else if (invaderAttackers.length > 0) {
                        ThreatManager.towerAttack(invaderAttackers[0]);
                    }

                    // Safemode Handling
                    ThreatManager.safeModer(room);
                    break;
            }

        }

        let newProcess = new Process(roomProcessId, ProcessPriority.LOW, monitorTask)
        global.scheduler.addProcess(newProcess)
    },
    safeModer: function(room: Room) {
        Utils.Logger.log(`ThreatManager -> safeModer`, LogLevel.TRACE)

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
    canKill: function(creep: AnyCreep): boolean {
        Utils.Logger.log(`ThreatManager -> canKill`, LogLevel.TRACE)

        // TODO: Flesh out power creep handling
        if ('rename' in creep) return true;

        let owner = creep.owner.username;

        let towers = creep.room.towers();
        if (!towers || towers.length === 0) return false;

        // TODO: Modify to add boost calculations
        let itsHeal = creep.body.filter((p) => p.type === HEAL);
        let totalHealValue = 12 * itsHeal.length;

        let potAssisters = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 3);
        if (potAssisters.length > 0) {
            for (let assister of potAssisters) {
                let assistHeal = assister.body.filter((p) => p.type === HEAL);

                if (assister.pos.getRangeTo(creep) > 1 && assister.owner.username === owner) {
                    totalHealValue = totalHealValue + (4 * assistHeal.length);
                } else {
                    totalHealValue = totalHealValue + (12 * assistHeal.length);
                }
            }
        }

        let damage = 0;
        for (let tower of towers) {
            damage = damage + tower.damage(creep.pos);
        }

        // Logger.log(`Damage: ${damage}. Heal: ${totalHealValue}.`, LogLevel.DEBUG)
        if (damage > totalHealValue) {
            return true;
        } else {
            return false;
        }
    },
    towerAttack: function(target: AnyCreep) {
        Utils.Logger.log(`ThreatManager -> towerAttack`, LogLevel.TRACE)

        let room = target.room as Room;
        let towers = room.towers();

        if (!towers) return;

        for (let tower of towers) {
            tower.attack(target);
        }
    },
    towerHeal: function(room: Room) {
        Utils.Logger.log(`ThreatManager -> towerHeal`, LogLevel.TRACE)

        let towers = room.towers();
        if (!towers) return;

        for (let tower of towers) {
            // Find in range 5 to be maximally energy efficient
            let targets = tower.pos.findInRange(FIND_STRUCTURES, 5);
            targets = targets.filter((t) => {return (t.hits < t.hitsMax * 0.1)})
            targets = Utils.Utility.organizeTargets(targets, { hits: true })
            if (targets.length == 0) continue;
            // Repair any at emergency levels
            tower.repair(targets[0]);
        }
    }
}

export default ThreatManager;
