import { TRACE, INFO } from "Constants/LogConstants";
import { LOW } from "Constants/ProcessPriorityConstants";
import { FATAL, RUNNING, FAILED } from "Constants/ProcessStateConstants";
import { Role, ANCHOR, HARVESTER } from "Constants/RoleConstants";
import { HUB } from "Constants/StampConstants";
import { ANCHOR_WORKING, Task } from "Constants/TaskConstants";
import CreepRole from "Models/CreepRole";
import { Process } from "Models/Process";
import { Utils } from "utils/Index";
export class Anchor extends CreepRole {

    readonly baseBody = [CARRY, CARRY, CARRY, CARRY, CARRY, MOVE]
    readonly segment = [CARRY]
    readonly partLimits = [8]

    dispatch(room: Room) {
        for (let anchor of room.localCreeps.anchor) {
            if (!anchor.memory.task) {
                global.scheduler.swapProcess(anchor, ANCHOR_WORKING)
            }
        }
    }

    quantityWanted(room: Room, rolesNeeded: Role[], min?: boolean): number {
        Utils.Logger.log("quantityWanted -> anchor.quantityWanted()", TRACE)
        if (rolesNeeded.filter(x => x == HARVESTER).length < room.sources.length) return 0;
        let anchorCount = rolesNeeded.filter(x => x == ANCHOR).length
        let shouldBe = room.isAnchorFunctional ? 1 : 0;
        return anchorCount < shouldBe ? shouldBe - anchorCount : 0;
    }

    preSpawnBy(room: Room, spawn: StructureSpawn, creep?: Creep): number {
        if (!room || !spawn) return 0;
        if (!room.memory.blueprint || room.memory.blueprint.anchor === 0) return 0;
        const anchorStamp = room.memory.blueprint.stamps.find((s) => s.type === HUB);
        if (!anchorStamp) return 0;

        // return path dist to anchor
        return room.findPath(spawn.pos, Utils.Utility.unpackPostionToRoom(anchorStamp.stampPos, room.name)).length;
    }

    readonly tasks: { [key in Task]?: (creep: Creep) => void } = {
        anchor_working: function(creep: Creep) {
            let creepId = creep.id

            const task = () => {
                Utils.Logger.log("CreepTask -> anchor()", TRACE);

                let creep = Game.getObjectById(creepId);
                if (!creep) return FATAL;
                if (creep.spawning) return RUNNING;

                // Handle positioning
                if (!creep.room.memory.blueprint || creep.room.memory.blueprint.anchor === 0) return FAILED;
                const anchorStamp = creep.room.memory.blueprint.stamps.find((s) => s.type === HUB);
                if (!anchorStamp) return FAILED;
                const anchorPos = Utils.Utility.unpackPostionToRoom(anchorStamp.stampPos, creep.room.name);
                if (creep.pos.getRangeTo(anchorPos) > 0) {
                    creep.travel({pos: anchorPos, range: 0});
                    return RUNNING;
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
                        // Link: Remove excess energy from link
                        case link && link.store.energy > (link.store.getCapacity(RESOURCE_ENERGY) / 2):
                            qty = link ? link.store.energy - (link.store.getCapacity(RESOURCE_ENERGY) / 2) : undefined;
                            result = creep.take(link, RESOURCE_ENERGY, qty && qty > 0 && qty <= creep.store.getFreeCapacity(RESOURCE_ENERGY) ? qty : undefined)
                            break;
                        // Link: Take energy from storage to fill link to half
                        case link && storage && link.store.energy < (link.store.getCapacity(RESOURCE_ENERGY) / 2) && storage.store.energy > 10401:
                            // `storage!` used because TS required it.. It is obviously checked above.
                            qty = link ? (link.store.getCapacity(RESOURCE_ENERGY) / 2) - link.store.energy : undefined;
                            result = creep.take(storage!, RESOURCE_ENERGY, qty && qty > 0 && qty <= creep.store.getFreeCapacity(RESOURCE_ENERGY) ? qty : undefined);
                            break;
                        // Spawn: Take energy from storage to fill spawn
                        case spawn && storage && spawn.store.getFreeCapacity(RESOURCE_ENERGY) > 0 && storage.store.energy > 0:
                            // `storage!` used because TS required it.. It is obviously checked above.
                            qty = spawn ? spawn.store.getFreeCapacity(RESOURCE_ENERGY): undefined;
                            result = creep.take(storage!, RESOURCE_ENERGY, qty && qty > 0 && qty <= creep.store.getFreeCapacity(RESOURCE_ENERGY) ? qty : undefined);
                            break;
                        // Power Spawn: Take energy from storage to fill power spawn
                        case powerSpawn && storage && powerSpawn.store.getFreeCapacity(RESOURCE_ENERGY) > 0 && storage.store.energy > 0:
                            // `storage!` and `powerSpawn!` used because TS required it.. It is obviously checked above.
                            qty = powerSpawn ? powerSpawn.store.getFreeCapacity(RESOURCE_ENERGY) : undefined;
                            result = creep.take(storage!, RESOURCE_ENERGY, qty && qty > 0 && qty <= creep.store.getFreeCapacity(RESOURCE_ENERGY) ? qty : undefined);
                            break;
                        // Terminal: Take energy from storage to fill terminal
                        case terminal && storage && terminal.store.energy < 20000 && storage.store.energy > 0:
                            // `storage!` and `terminal!` used because TS required it.. It is obviously checked above.
                            qty = terminal ? 20000 - (terminal.store.energy ?? 0) : undefined;
                            result = creep.take(storage!, RESOURCE_ENERGY, qty && qty > 0 && qty <= creep.store.getFreeCapacity(RESOURCE_ENERGY) ? qty : undefined);
                            break;
                        // Factory: Take energy from storage to fill factory when storage is high on energy
                        case factory && storage && factory.store.energy < 20000 && storage.store.energy > 250000:
                            // `storage!` and `factory!` used because TS required it.. It is obviously checked above.
                            qty = factory ? 20000 - (factory.store.energy ?? 0) : undefined;
                            result = creep.take(storage!, RESOURCE_ENERGY, qty && qty > 0 && qty <= creep.store.getFreeCapacity(RESOURCE_ENERGY) ? qty : undefined);
                            break;
                        // Nuker: Take energy from storage to fill nuker when storage is high on energy
                        case nuker && storage && nuker.store.getFreeCapacity(RESOURCE_ENERGY) > 0 && storage.store.energy > 250000:
                            // `storage!` and `nuker!` used because TS required it.. It is obviously checked above.
                            qty = nuker ? 20000 - (nuker.store.energy ?? 0) : undefined;
                            result = creep.take(storage!, RESOURCE_ENERGY, qty && qty > 0 && qty <= creep.store.getFreeCapacity(RESOURCE_ENERGY) ? qty : undefined);
                            break;
                        // Terminal: Take energy from storage to fill terminal when storage is high on energy
                        case terminal && storage && storage.store.energy > 250000 && terminal.store.energy < 150000 && terminal.store.getFreeCapacity() > creep.store.getCapacity():
                            // `storage!` and `terminal!` used because TS required it.. It is obviously checked above.
                            qty = storage ? (storage.store.energy ?? 0) - 500000 : undefined;
                            result = creep.take(storage!, RESOURCE_ENERGY, qty && qty > 0 && qty <= creep.store.getFreeCapacity(RESOURCE_ENERGY) ? qty : undefined);
                            break;
                    }
                } else if (creep.store.energy > 0) {
                    switch (true) {
                        // Link: Transfer energy from storage to fill link to half
                        case link && storage && link.store.energy < (link.store.getCapacity(RESOURCE_ENERGY) / 2) && storage.store.energy > 10000:
                            result = creep.give(link, RESOURCE_ENERGY);
                            break;
                        // Spawn: Transfer energy from storage to fill spawn
                        case spawn && spawn.store.getFreeCapacity(RESOURCE_ENERGY) > 0:
                            result = creep.give(spawn, RESOURCE_ENERGY);
                            break;
                        // Power Spawn: Transfer energy from storage to fill power spawn
                        case powerSpawn && powerSpawn.store.getFreeCapacity(RESOURCE_ENERGY) > 0:
                            // `powerSpawn!` used because TS required it.. It is obviously checked above.
                            result = creep.give(powerSpawn!, RESOURCE_ENERGY);
                            break;
                        // Terminal: Transfer energy from storage to fill terminal
                        case terminal && terminal.store.energy < 20000:
                            // `terminal!` used because TS required it.. It is obviously checked above.
                            result = creep.give(terminal!, RESOURCE_ENERGY);
                            break;
                        // Factory: Transfer energy from storage to fill factory when storage is high on energy
                        case factory && storage && factory.store.energy < 20000 && storage.store.energy > 249599:
                            // `factory!` used because TS required it.. It is obviously checked above.
                            result = creep.give(factory!, RESOURCE_ENERGY);
                            break;
                        // Nuker: Transfer energy from storage to fill nuker when storage is high on energy
                        case nuker && storage && nuker.store.getFreeCapacity(RESOURCE_ENERGY) > 0 && storage.store.energy > 249599:
                            // `nuker!` used because TS required it.. It is obviously checked above.
                            result = creep.give(nuker!, RESOURCE_ENERGY);
                            break;
                        // Terminal:
                        case terminal && storage && storage.store.energy > 249599 && terminal.store.energy < 150000:
                            // `storage!` and `terminal!` used because TS required it.. It is obviously checked above.
                            result = creep.give(terminal!, RESOURCE_ENERGY);
                            break;
                        default:
                            result = storage ? creep.give(storage, RESOURCE_ENERGY) : undefined;
                            break;
                    }
                }

                let target: AnyStoreStructure
                let resource: ResourceConstant

                // Grab target if in existence
                if (creep.cache.storeId) {
                    let storeStruct = Game.getObjectById(creep.cache.storeId)
                    if (storeStruct && Utils.Typeguards.isAnyStoreStructure(storeStruct)) {
                        target = storeStruct
                    }
                }

                // Grab resource if in existence
                if (creep.cache.resource && Utils.Typeguards.isResourceConstant(creep.cache.resource)) {
                    resource = creep.cache.resource
                }

                if (creep.store.getUsedCapacity() > 0) {

                    result = creep.give(link, RESOURCE_ENERGY);
                } else {

                    result = creep.take(link, RESOURCE_ENERGY, qty && qty > 0 && qty <= creep.store.getFreeCapacity(RESOURCE_ENERGY) ? qty : undefined)
                }

                Utils.Logger.log(`${creep.name}: ${result}`, INFO)
                return RUNNING;
            }

            creep.memory.task = ANCHOR_WORKING
            let newProcess = new Process(creep.name, LOW, task)
            global.scheduler.addProcess(newProcess)
        }
    }
}
