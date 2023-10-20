import { TRACE } from "Constants/LogConstants"
import { MOVE_OPTS_CIVILIAN } from "Constants/MoveOptsConstants"
import { LOW } from "Constants/ProcessPriorityConstants"
import { FATAL, RUNNING, FAILED, INCOMPLETE } from "Constants/ProcessStateConstants"
import { Role, MINER, HARVESTER, TRUCKER } from "Constants/RoleConstants"
import { MINER_WORKING, Task } from "Constants/TaskConstants"
import CreepRole from "Models/CreepRole"
import { Process } from "Models/Process"
import { generatePath } from "screeps-cartographer"
import { Utils } from "utils/Index"

export class Miner extends CreepRole {

    readonly baseBody = [CARRY, MOVE, WORK, WORK]
    readonly segment = [WORK]

    dispatch(room: Room) {
        let miners = room.localCreeps.miner
        for (let miner of miners) {
            if (!miner.memory.task) {
                global.scheduler.swapProcess(miner, MINER_WORKING)
            }
        }
    }

    /* If there is  */
    quantityWanted(room: Room, rolesNeeded: Role[], min?: boolean): number {
        Utils.Logger.log("quantityWanted -> miner.quantityWanted()", TRACE)
        if (min && min == true) return 0

        let mineral = room.mineral

        // If no mineral or supporting structures, return 0
        if (!mineral || mineral.isReady) return 0

        // No harvesters or truckers? Definitely no miners
        let minerCount = rolesNeeded.filter(x => x == MINER).length
        if (rolesNeeded.filter(x => x == HARVESTER).length < room.sources.length) return 0
        if (rolesNeeded.filter(x => x == TRUCKER).length < room.sources.length) return 0

        // Determine valid positions around mineral
        let validPositions = mineral.pos.validPositions.length
        return minerCount < validPositions ? validPositions - minerCount : 0;
    }

    preSpawnBy(room: Room, spawn: StructureSpawn, creep?: Creep): number {
        if (!room || !spawn) return 0;
        // Mineral Guard
        let mineral = room.mineral
        if (!mineral) return 0;

        // return exact IFF possible, else average
        let preSpawnOffset = 0;
        if (creep && creep.memory.assignedPos) {
            let path = generatePath(spawn.pos, [{ pos: Utils.Utility.unpackPostionToRoom(creep.memory.assignedPos, room.name), range: 1}], MOVE_OPTS_CIVILIAN)
            if (path) preSpawnOffset = path.length * (creep.body.length - 2);
        } else {
            let modifier = creep ? creep.workParts : 1;
            preSpawnOffset = room.findPath(spawn.pos, mineral.pos, MOVE_OPTS_CIVILIAN).length * modifier;
        }
        return preSpawnOffset;
    }

    readonly tasks: { [key in Task]?: (creep: Creep) => void } = {
        miner_working: function(creep: Creep) {
            let creepId = creep.id

            const minerWorkingTask = () => {
                Utils.Logger.log("CreepTask -> minerWorkingTask()", TRACE)
                let creep = Game.getObjectById(creepId)
                if (!creep) return FATAL;
                if (creep.spawning) return RUNNING;

                // Handle Targeting
                let mineral: Mineral | undefined = undefined
                if (!creep.memory.assignedPos) {
                    mineral = Miner.genAssignedPos(creep);
                } else {
                    mineral = Utils.Utility.unpackPostionToRoom(creep.memory.assignedPos, creep.memory.homeRoom).findInRange(FIND_MINERALS, 1)[0]
                }
                if (!mineral) return INCOMPLETE

                if (Game.time % 6 == 0) creep.mine(mineral)

                // Handle Dumping
                if (creep.store.getUsedCapacity() > (creep.store.getCapacity() * 0.8)) {
                    // Set Dump target if missing
                    if (!creep.cache.dump) {
                        let dumps = mineral.pos.findInRange(FIND_STRUCTURES, 2);
                        let container = dumps.filter(function (d) { return Utils.Typeguards.isStructureContainer(d) && d.store.getFreeCapacity() > 0 })[0] as StructureContainer | undefined;
                        if (container) {
                            creep.cache.dump = container.id;
                        }
                    }

                    // Dump
                    if (creep.cache.dump) {
                        let dump = Game.getObjectById(creep.cache.dump);
                        if (dump && (dump.store.getFreeCapacity() ?? 0) > 0 && creep.ticksToLive && creep.pos.getRangeTo(dump) > 0) {
                            creep.give(dump, mineral.mineralType);
                        } else {
                            delete creep.cache.dump
                        }
                    }
                }

                return RUNNING
            }

            let newProcess = new Process(creep.name, LOW, minerWorkingTask)
            global.scheduler.addProcess(newProcess)
        }
    }

    private static genAssignedPos(creep: Creep): Mineral | undefined {
        let mineral = creep.room.mineral

        // Mineral Guard
        if (!mineral) return

        // Prespawn targeting
        let matchingCreep = creep.room.stationedCreeps.miner.find((c) => c.name !== creep.name && (c.name.substring(0,6) ?? '1') == (creep.name.substring(0,6) ?? '0'))
        if (matchingCreep && matchingCreep.memory.assignedPos) {
            creep.memory.assignedPos = matchingCreep.memory.assignedPos;
        }


        if (!creep.memory.assignedPos) {
                // Backup targeting
                if (!creep.memory.assignedPos) {
                    let assignablePos = mineral.assignablePosition();
                    creep.memory.assignedPos = assignablePos ? Utils.Utility.packPosition(assignablePos) : undefined;
                }
        }
        return mineral;
    }
}
