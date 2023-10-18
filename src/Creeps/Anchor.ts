import { TRACE, INFO, LogLevels, DEBUG } from "Constants/LogConstants";
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

                // Grab anchorRequests
                let anchorRequests = creep.room.cache.anchorRequests ? creep.room.cache.anchorRequests : []
                let anchorRequest: AnchorRequest | undefined = anchorRequests[0]

                if (creep.store.getUsedCapacity() > 0) {
                    let target: AnyStoreStructure | undefined

                    // Define target or resource if missing
                    let defaulted = false
                    if (!anchorRequest && storage) {
                        defaulted = true
                        anchorRequest = {
                            targetId: storage.id,
                            resource: Object.keys(creep.store)[0] as ResourceConstant
                        }
                        target = storage
                    } else if (anchorRequest) {
                        let temp = Game.getObjectById(anchorRequest.targetId)
                        if (temp) target = temp
                    }

                    // Fail out if target or resource are missing, then give resource to target.
                    if (!anchorRequest || !target) return FAILED
                    result = creep.give(target, anchorRequest.resource)

                    // Clear request if request fulfilled.
                    if (!defaulted && creep.room.cache.anchorRequests) {
                        if (creep.room.cache.anchorRequests[0]?.qty && creep.room.cache.anchorRequests[0].qty >= creep.store.getCapacity()) {
                            creep.room.cache.anchorRequests[0].qty = creep.room.cache.anchorRequests[0].qty - creep.store.getUsedCapacity(anchorRequest.resource)
                        } else {
                            anchorRequests.splice(0, 1)
                        }
                    }
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
                    switch (true) {
                        // Existing request
                        case anchorRequest !== undefined && anchorRequest.supplyId !== undefined:
                            let temp = Game.getObjectById(anchorRequest.supplyId!)
                            // Guard against supply not existing or not having any of the resource
                            if (!temp || temp.store[anchorRequest.resource] !> 0) {
                                anchorRequests.splice(0, 1)
                                anchorRequest = undefined
                                break
                            }
                            supply = temp
                            break
                        // Link: Remove excess energy from link
                        case link && storage && link.store.energy > (link.store.getCapacity(RESOURCE_ENERGY) / 2):
                            anchorRequest = {
                                supplyId: link.id,
                                targetId: storage!.id,
                                resource: RESOURCE_ENERGY,
                                qty: link.store.energy - (link.store.getCapacity(RESOURCE_ENERGY) / 2)
                            }
                            supply = link
                            break;
                        // Link: Take energy from storage to fill link to half
                        case link && storage && link.store.energy < (link.store.getCapacity(RESOURCE_ENERGY) / 2) && storage.store.energy > 0:
                            anchorRequest = {
                                supplyId: storage!.id,
                                targetId: link.id,
                                resource: RESOURCE_ENERGY,
                                qty: (link.store.getCapacity(RESOURCE_ENERGY) / 2) - link.store.energy
                            }
                            supply = storage
                            break;
                        // Spawn: Take energy from storage to fill spawn
                        case spawn && storage && spawn.store.getFreeCapacity(RESOURCE_ENERGY) > 0 && storage.store.energy > 0:
                            anchorRequest = {
                                supplyId: storage!.id,
                                targetId: spawn.id,
                                resource: RESOURCE_ENERGY,
                                qty: spawn.store.getFreeCapacity(RESOURCE_ENERGY)
                            }
                            supply = storage
                            break;
                        // Power Spawn: Take energy from storage to fill power spawn
                        case powerSpawn && storage && powerSpawn.store.getFreeCapacity(RESOURCE_ENERGY) > 0 && storage.store.energy > 0:
                            anchorRequest = {
                                supplyId: storage!.id,
                                targetId: powerSpawn!.id,
                                resource: RESOURCE_ENERGY,
                                qty: powerSpawn?.store.getFreeCapacity(RESOURCE_ENERGY)
                            }
                            supply = storage
                            break;
                        // Terminal: Take energy from storage to fill terminal when energy stores exist at a decent level
                        case terminal && storage && terminal.store.energy < 20000 && terminal.store.getFreeCapacity() > creep.store.getCapacity() && storage.store.energy > 100000:
                            anchorRequest = {
                                supplyId: storage!.id,
                                targetId: terminal!.id,
                                resource: RESOURCE_ENERGY,
                                qty: 20000 - (terminal!.store.energy ?? 0)
                            }
                            supply = storage
                            break;
                        // Factory: Take energy from storage to fill factory when storage is high on energy
                        case factory && storage && factory.store.energy < 20000 && storage.store.energy > 250000:
                            anchorRequest = {
                                supplyId: storage!.id,
                                targetId: factory!.id,
                                resource: RESOURCE_ENERGY,
                                qty: 20000 - (factory!.store.energy ?? 0)
                            }
                            supply = storage
                            break;
                        // Nuker: Take energy from storage to fill nuker when storage is high on energy
                        case nuker && storage && nuker.store.getFreeCapacity(RESOURCE_ENERGY) > 0 && storage.store.energy > 250000:
                            anchorRequest = {
                                supplyId: storage!.id,
                                targetId: nuker!.id,
                                resource: RESOURCE_ENERGY,
                                qty: nuker!.store.getFreeCapacity(RESOURCE_ENERGY)
                            }
                            supply = storage
                            break;
                        // Nuker: Take ghodium from storage to fill nuker
                        case nuker && storage && nuker.store.getFreeCapacity(RESOURCE_GHODIUM) > 0 && storage.store.G > 0:
                            anchorRequest = {
                                supplyId: storage!.id,
                                targetId: nuker!.id,
                                resource: RESOURCE_GHODIUM,
                                qty: nuker!.store.getFreeCapacity(RESOURCE_GHODIUM)
                            }
                            supply = storage
                            break;
                        // PowerSpawn: Take ghodium from storage to fill nuker
                        case powerSpawn && storage && powerSpawn.store.getFreeCapacity(RESOURCE_POWER) > 50 && storage.store.power > 0:
                            anchorRequest = {
                                supplyId: storage!.id,
                                targetId: powerSpawn!.id,
                                resource: RESOURCE_POWER,
                                qty: powerSpawn!.store.getFreeCapacity(RESOURCE_POWER)
                            }
                            supply = storage
                            break;
                        // Terminal: Take energy from storage to fill terminal when storage is high on energy
                        case terminal
                          && storage
                          && storage.store.energy > 250000
                          && terminal.store.energy < 150000
                          && terminal.store.getFreeCapacity() > creep.store.getCapacity():
                            anchorRequest = {
                                supplyId: storage!.id,
                                targetId: terminal!.id,
                                resource: RESOURCE_ENERGY,
                            }
                            supply = storage
                            break;
                    }

                    if (supply && anchorRequest) {
                        // Fail out if data is missing from anchorRequest
                        if (anchorRequest && !anchorRequest.targetId || !anchorRequest.resource) return FAILED

                        // Record anchorRequest for next tick
                        anchorRequests.unshift(anchorRequest)

                        // Determine useability of qty and take from supply
                        let qty: number | undefined
                        if (anchorRequest.qty
                            && anchorRequest.qty > 0
                            && anchorRequest.qty <= creep.store.getFreeCapacity(RESOURCE_ENERGY)
                            && supply.store[anchorRequest.resource] >= anchorRequest.qty) qty = anchorRequest.qty
                        result = creep.take(supply, anchorRequest.resource, qty)
                    }
                }

                // Save requests to cache again
                creep.room.cache.anchorRequests = anchorRequests

                Utils.Logger.log(`Anchor Requests: ${creep.room.cache.anchorRequests?.length}, ${JSON.stringify(creep.room.cache.anchorRequests)}`, INFO)
                Utils.Logger.log(`${creep.name}: ${result}`, INFO)
                return RUNNING;
            }

            creep.memory.task = ANCHOR_WORKING
            let newProcess = new Process(creep.name, LOW, task)
            global.scheduler.addProcess(newProcess)
        }
    }
}
