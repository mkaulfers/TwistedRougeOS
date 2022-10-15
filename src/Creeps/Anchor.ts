import CreepRole from "Models/CreepRole";
import { Process } from "Models/Process";
import { Utils } from "utils/Index";
import { Role, Task, ProcessPriority, ProcessResult, LogLevel, StampType } from '../utils/Enums'

export class Anchor extends CreepRole {

    readonly baseBody = [CARRY, CARRY, CARRY, CARRY, CARRY, MOVE]
    readonly segment = [CARRY]
    readonly partLimits = [8]

    dispatch(room: Room) {
        for (let anchor of room.localCreeps.anchor) {
            if (!anchor.memory.task) {
                global.scheduler.swapProcess(anchor, Task.ANCHOR)
            }
        }
    }

    quantityWanted(room: Room, rolesNeeded: Role[], min?: boolean): number {
        Utils.Logger.log("quantityWanted -> anchor.quantityWanted()", LogLevel.TRACE)
        if (min && min == true) return 0;

        let anchorCount = rolesNeeded.filter(x => x == Role.ANCHOR).length
        let shouldBe = room.isAnchorFunctional ? 1 : 0;
        return anchorCount < shouldBe ? shouldBe - anchorCount : 0;
    }

    preSpawnBy(room: Room, spawn: StructureSpawn, creep?: Creep): number {
        if (!room || !spawn) return 0;
        if (!room.memory.blueprint || room.memory.blueprint.anchor === 0) return 0;
        const anchorStamp = room.memory.blueprint.stamps.find((s) => s.type === StampType.ANCHOR);
        if (!anchorStamp) return 0;

        // return path dist to anchor
        return room.findPath(spawn.pos, Utils.Utility.unpackPostionToRoom(anchorStamp.stampPos, room.name)).length;
    }

    readonly tasks: { [key in Task]?: (creep: Creep) => void } = {
        anchor: function(creep: Creep) {
            let creepId = creep.id

            const task = () => {
                Utils.Logger.log("CreepTask -> anchor()", LogLevel.TRACE);

                let creep = Game.getObjectById(creepId);
                if (!creep) return ProcessResult.FATAL;
                if (creep.spawning) return ProcessResult.RUNNING;

                // Handle positioning
                if (!creep.room.memory.blueprint || creep.room.memory.blueprint.anchor === 0) return ProcessResult.FAILED;
                const anchorStamp = creep.room.memory.blueprint.stamps.find((s) => s.type === StampType.ANCHOR);
                if (!anchorStamp) return ProcessResult.FAILED;
                const anchorPos = Utils.Utility.unpackPostionToRoom(anchorStamp.stampPos, creep.room.name);
                if (creep.pos.getRangeTo(anchorPos) > 0) {
                    creep.travel({pos: anchorPos, range: 0});
                    return ProcessResult.RUNNING;
                }

                // Targeting
                const link = creep.pos.findInRange(creep.room.links, 1)[0] ?? undefined;
                const spawn = creep.pos.findInRange(creep.room.spawns, 1)[0] ?? undefined;
                const powerSpawn = creep.room.powerSpawn;
                const terminal = creep.room.terminal;
                const factory = creep.room.factory;
                const storage = creep.room.storage;
                const nuker = creep.room.nuker;

                let result: number | undefined;
                if (creep.store.energy === 0) {
                    let qty: number | undefined;
                    switch (true) {
                        // Link
                        case link && link.store.energy > (link.store.getCapacity(RESOURCE_ENERGY) / 2):
                            qty = link ? link.store.energy - (link.store.getCapacity(RESOURCE_ENERGY) / 2) : undefined;
                            result = creep.take(link, RESOURCE_ENERGY, qty && qty > 0 && qty <= creep.store.getFreeCapacity(RESOURCE_ENERGY) ? qty : undefined)
                            break;
                        case link && storage && link.store.energy < (link.store.getCapacity(RESOURCE_ENERGY) / 2):
                            // `storage!` used because TS required it.. It is obviously checked above.
                            qty = link ? (link.store.getCapacity(RESOURCE_ENERGY) / 2) - link.store.energy : undefined;
                            result = creep.take(storage!, RESOURCE_ENERGY, qty && qty > 0 && qty <= creep.store.getFreeCapacity(RESOURCE_ENERGY) ? qty : undefined);
                            break;
                        // Spawn
                        case spawn && storage && spawn.store.getFreeCapacity(RESOURCE_ENERGY) > 0:
                            // `storage!` used because TS required it.. It is obviously checked above.
                            qty = spawn ? spawn.store.getFreeCapacity(RESOURCE_ENERGY): undefined;
                            result = creep.take(storage!, RESOURCE_ENERGY, qty && qty > 0 && qty <= creep.store.getFreeCapacity(RESOURCE_ENERGY) ? qty : undefined);
                            break;
                        // Power Spawn
                        case powerSpawn && storage && powerSpawn.store.getFreeCapacity(RESOURCE_ENERGY) > 0:
                            // `storage!` and `powerSpawn!` used because TS required it.. It is obviously checked above.
                            qty = powerSpawn ? powerSpawn.store.getFreeCapacity(RESOURCE_ENERGY) : undefined;
                            result = creep.take(storage!, RESOURCE_ENERGY, qty && qty > 0 && qty <= creep.store.getFreeCapacity(RESOURCE_ENERGY) ? qty : undefined);
                            break;
                        // Terminal
                        case terminal && storage && terminal.store.energy < 20000:
                            // `storage!` and `terminal!` used because TS required it.. It is obviously checked above.
                            qty = terminal ? 20000 - (terminal.store.energy ?? 0) : undefined;
                            result = creep.take(storage!, RESOURCE_ENERGY, qty && qty > 0 && qty <= creep.store.getFreeCapacity(RESOURCE_ENERGY) ? qty : undefined);
                            break;
                        case terminal && storage && storage.store.energy > 500000 && terminal.store.energy < 150000:
                            // `storage!` and `terminal!` used because TS required it.. It is obviously checked above.
                            qty = storage ? (storage.store.energy ?? 0) - 500000 : undefined;
                            result = creep.take(storage!, RESOURCE_ENERGY, qty && qty > 0 && qty <= creep.store.getFreeCapacity(RESOURCE_ENERGY) ? qty : undefined);
                            break;
                        // Factory
                        case factory && storage && factory.store.energy < 20000 && storage.store.energy > 500000:
                            // `storage!` and `factory!` used because TS required it.. It is obviously checked above.
                            qty = factory ? 20000 - (factory.store.energy ?? 0) : undefined;
                            result = creep.take(storage!, RESOURCE_ENERGY, qty && qty > 0 && qty <= creep.store.getFreeCapacity(RESOURCE_ENERGY) ? qty : undefined);
                            break;
                        // Nuker
                        case nuker && storage && nuker.store.getFreeCapacity(RESOURCE_ENERGY) > 0 && storage.store.energy > 500000:
                            // `storage!` and `nuker!` used because TS required it.. It is obviously checked above.
                            qty = nuker ? 20000 - (nuker.store.energy ?? 0) : undefined;
                            result = creep.take(storage!, RESOURCE_ENERGY, qty && qty > 0 && qty <= creep.store.getFreeCapacity(RESOURCE_ENERGY) ? qty : undefined);
                            break;
                    }
                } else {
                    switch (true) {
                        // Link
                        case link && link.store.energy < (link.store.getCapacity(RESOURCE_ENERGY) / 2):
                            result = creep.give(link, RESOURCE_ENERGY);
                            break;
                        // Spawn
                        case spawn && spawn.store.getFreeCapacity(RESOURCE_ENERGY) > 0:
                            result = creep.give(spawn, RESOURCE_ENERGY);
                            break;
                        // Power Spawn
                        case powerSpawn && powerSpawn.store.getFreeCapacity(RESOURCE_ENERGY) > 0:
                            // `powerSpawn!` used because TS required it.. It is obviously checked above.
                            result = creep.give(powerSpawn!, RESOURCE_ENERGY);
                            break;
                        // Terminal
                        case terminal && terminal.store.energy < 20000:
                            // `terminal!` used because TS required it.. It is obviously checked above.
                            result = creep.give(terminal!, RESOURCE_ENERGY);
                            break;
                        case terminal && storage && storage.store.energy > 499999 && terminal.store.energy < 150000:
                            // `storage!` and `terminal!` used because TS required it.. It is obviously checked above.
                            result = creep.give(terminal!, RESOURCE_ENERGY);
                            break;
                        // Factory
                        case factory && storage && factory.store.energy < 20000 && storage.store.energy > 499999:
                            // `factory!` used because TS required it.. It is obviously checked above.
                            result = creep.give(factory!, RESOURCE_ENERGY);
                            break;
                        // Nuker
                        case nuker && storage && nuker.store.getFreeCapacity(RESOURCE_ENERGY) > 0 && storage.store.energy > 499999:
                            // `nuker!` used because TS required it.. It is obviously checked above.
                            result = creep.give(nuker!, RESOURCE_ENERGY);
                            break;
                        default:
                            result = storage ? creep.give(storage, RESOURCE_ENERGY) : undefined;
                            break;
                    }
                }
                Utils.Logger.log(`${creep.name}: ${result}`, LogLevel.INFO)
                return ProcessResult.RUNNING;
            }

            creep.memory.task = Task.ANCHOR
            let newProcess = new Process(creep.name, ProcessPriority.LOW, task)
            global.scheduler.addProcess(newProcess)
        }
    }
}
