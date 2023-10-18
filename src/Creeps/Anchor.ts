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
                const storage = creep.room.storage;

                let result: number | undefined;
                let target: AnyStoreStructure | undefined
                let resource: ResourceConstant | undefined

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
                    // Define target or resource if missing
                    if (!target || !resource && storage) {
                        target = storage
                        resource = Object.keys(creep.store)[0] as ResourceConstant
                    }

                    // Fail out if target or resource are missing, then give resource to target.
                    if (!target || !resource) return FAILED
                    result = creep.give(target, resource)

                    // Clear cached values
                    delete creep.cache.storeId
                    delete creep.cache.resource
                } else {
                    // Targeting
                    const link = creep.pos.findInRange(creep.room.links, 1)[0] ?? undefined
                    const spawn = creep.pos.findInRange(creep.room.spawns, 1)[0] ?? undefined
                    const powerSpawn = creep.room.powerSpawn
                    const terminal = creep.room.terminal
                    const factory = creep.room.factory
                    const nuker = creep.room.nuker

                    // Determine supply, target, resource, and quantity
                    let supply: AnyStoreStructure | undefined
                    let qty: number | undefined
                    switch (true) {
                        // Link: Remove excess energy from link
                        case link && link.store.energy > (link.store.getCapacity(RESOURCE_ENERGY) / 2):
                            resource = RESOURCE_ENERGY
                            supply = link
                            qty = link.store.energy - (link.store.getCapacity(RESOURCE_ENERGY) / 2)
                            break;
                        // Link: Take energy from storage to fill link to half
                        case link && storage && link.store.energy < (link.store.getCapacity(RESOURCE_ENERGY) / 2) && storage.store.energy > 10401:
                            resource = RESOURCE_ENERGY
                            supply = storage
                            target = link
                            qty = (link.store.getCapacity(RESOURCE_ENERGY) / 2) - link.store.energy
                            break;
                        // Spawn: Take energy from storage to fill spawn
                        case spawn && storage && spawn.store.getFreeCapacity(RESOURCE_ENERGY) > 0 && storage.store.energy > 0:
                            resource = RESOURCE_ENERGY
                            supply = storage
                            target = spawn
                            qty = spawn.store.getFreeCapacity(RESOURCE_ENERGY)
                            break;
                        // Power Spawn: Take energy from storage to fill power spawn
                        case powerSpawn && storage && powerSpawn.store.getFreeCapacity(RESOURCE_ENERGY) > 0 && storage.store.energy > 0:
                            resource = RESOURCE_ENERGY
                            supply = storage
                            target = powerSpawn
                            qty = powerSpawn ? powerSpawn.store.getFreeCapacity(RESOURCE_ENERGY) : undefined;
                            break;
                        // Terminal: Take energy from storage to fill terminal
                        case terminal && storage && terminal.store.energy < 20000 && terminal.store.getFreeCapacity() > creep.store.getCapacity() && storage.store.energy > 0:
                            resource = RESOURCE_ENERGY
                            supply = storage
                            target = terminal
                            qty = terminal ? 20000 - (terminal.store.energy ?? 0) : undefined;
                            break;
                        // Factory: Take energy from storage to fill factory when storage is high on energy
                        case factory && storage && factory.store.energy < 20000 && storage.store.energy > 250000:
                            resource = RESOURCE_ENERGY
                            supply = storage
                            target = factory
                            qty = factory ? 20000 - (factory.store.energy ?? 0) : undefined;
                            break;
                        // Nuker: Take energy from storage to fill nuker when storage is high on energy
                        case nuker && storage && nuker.store.getFreeCapacity(RESOURCE_ENERGY) > 0 && storage.store.energy > 250000:
                            resource = RESOURCE_ENERGY
                            supply = storage
                            target = nuker
                            qty = nuker ? nuker.store.getFreeCapacity(RESOURCE_ENERGY) : undefined;
                            break;
                        // Nuker: Take ghodium from storage to fill nuker
                        case nuker && storage && nuker.store.getFreeCapacity(RESOURCE_GHODIUM) > 0 && storage.store.G > 0:
                            resource = RESOURCE_GHODIUM
                            supply = storage
                            target = nuker
                            qty = nuker ? nuker.store.getFreeCapacity(RESOURCE_GHODIUM) : undefined;
                            break;
                        // PowerSpawn: Take ghodium from storage to fill nuker
                        case powerSpawn && storage && powerSpawn.store.getFreeCapacity(RESOURCE_POWER) > 50 && storage.store.power > 0:
                            resource = RESOURCE_POWER
                            supply = storage
                            target = powerSpawn
                            qty = powerSpawn ? powerSpawn.store.getFreeCapacity(RESOURCE_POWER) : undefined;
                            break;
                        // Terminal: Take energy from storage to fill terminal when storage is high on energy
                        case terminal
                          && storage
                          && storage.store.energy > 250000
                          && terminal.store.energy < 150000
                          && terminal.store.getFreeCapacity() > creep.store.getCapacity():
                            resource = RESOURCE_ENERGY
                            supply = storage
                            target = terminal
                            break;
                    }

                    // Nothing to take from? Nothing to deliver to, move on with the code already!
                    if (!supply) return RUNNING

                    // Fail out if target or resource are missing, then take resource from target.
                    if (!target || !resource) return FAILED
                    result = creep.take(supply, resource, qty && qty > 0 && qty <= creep.store.getFreeCapacity(RESOURCE_ENERGY) ? qty : undefined)
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
