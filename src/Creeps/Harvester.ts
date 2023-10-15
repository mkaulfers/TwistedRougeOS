import { TRACE } from "Constants/LogConstants"
import { MOVE_OPTS_CIVILIAN } from "Constants/MoveOptsConstants"
import { LOW } from "Constants/ProcessPriorityConstants"
import { FATAL, RUNNING, INCOMPLETE } from "Constants/ProcessStateConstants"
import { Role, HARVESTER, TRUCKER } from "Constants/RoleConstants"
import { HARVESTER_SOURCE, HARVESTER_EARLY, Task } from "Constants/TaskConstants"
import CreepRole from "Models/CreepRole"
import { Process } from "Models/Process"
import { generatePath } from "screeps-cartographer"
import { Utils } from "utils/Index"
export class Harvester extends CreepRole {

    readonly baseBody = [CARRY, MOVE, WORK, WORK]
    readonly segment = [WORK]
    readonly partLimits = [5]

    dispatch(room: Room) {
        let harvesters = room.localCreeps.harvester
        let truckers = room.localCreeps.trucker
        if (truckers.length < Math.ceil(harvesters.length / 2)) {
            for (let harvester of harvesters) {
                if (!harvester.memory.task || harvester.memory.task == HARVESTER_SOURCE) {
                    global.scheduler.swapProcess(harvester, HARVESTER_EARLY)
                }
            }
        } else {
            for (let harvester of harvesters) {
                if (!harvester.memory.task || harvester.memory.task == HARVESTER_EARLY) {
                    global.scheduler.swapProcess(harvester, HARVESTER_SOURCE)
                }
            }
        }
    }

    quantityWanted(room: Room, rolesNeeded: Role[], min?: boolean): number {
        Utils.Logger.log("quantityWanted -> harvester.quantityWanted()", TRACE)
        let sourceCount = room.sources.length;
        let harCount = rolesNeeded.filter(x => x == HARVESTER).length
        let truckerCount = rolesNeeded.filter(x => x == TRUCKER).length
        if (min && min == true) return harCount < sourceCount ? 1 : 0;

        // Determine max needed harvesters based on harvest efficiency and valid spaces around source
        let body = this.getBody(room);
        let shouldBe = Math.ceil((sourceCount * 5) / (body.filter(p => p == WORK).length));
        let maxPositions = 0;
        room.sources.forEach(s => maxPositions += s.validPositions?.length ?? 0);

        if (shouldBe > maxPositions) shouldBe = maxPositions;
        return harCount < shouldBe ? shouldBe - harCount : 0;
    }

    preSpawnBy(room: Room, spawn: StructureSpawn, creep?: Creep): number {
        if (!room || !spawn) return 0;
        // return exact IFF possible, else average
        let preSpawnOffset = 0;
        if (creep && creep.memory.assignedPos) {
            let path = generatePath(spawn.pos, [{ pos: Utils.Utility.unpackPostionToRoom(creep.memory.assignedPos, room.name), range: 1}], MOVE_OPTS_CIVILIAN)
            if (path) preSpawnOffset = path.length * (creep.body.length - 2);
        } else {
            let x = 0;
            let y = 0;
            for (const source of room.sources) {
                x += source.pos.x;
                y += source.pos.y;
            }
            x = Math.floor(x / room.sources.length);
            y = Math.floor(y / room.sources.length);
            let modifier = creep ? creep.workParts : 1;
            preSpawnOffset = room.findPath(spawn.pos, new RoomPosition(x >= 0 && x <= 49 ? x : 25, y >= 0 && y <= 49 ? y : 25, room.name)).length * modifier;
        }
        return preSpawnOffset;
    }

    readonly tasks: { [key in Task]?: (creep: Creep) => void } = {
        harvester_early: function(creep: Creep) {
            let creepId = creep.id

            const earlyTask = () => {
                Utils.Logger.log("CreepTask -> earlyTask()", TRACE)
                let creep = Game.getObjectById(creepId)
                if (!creep) return FATAL;
                if (creep.spawning) return RUNNING;

                let closestSource: Source | undefined = undefined

                if (!creep.memory.assignedPos) {
                    closestSource = Harvester.genAssignedPos(creep);
                } else {
                    closestSource = Utils.Utility.unpackPostionToRoom(creep.memory.assignedPos, creep.memory.homeRoom).findInRange(FIND_SOURCES, 1)[0]
                }
                let room = Game.rooms[creep.memory.homeRoom];
                let refillTarget = room.lowestSpawn ? room.lowestSpawn : room.lowestExtension;

                // Flip working
                if (creep.store.energy == 0 || !refillTarget) {
                    creep.memory.working = false;
                } else if (creep.store.getFreeCapacity(RESOURCE_ENERGY) == 0 && refillTarget) {
                    creep.memory.working = true;
                }

                if (creep.memory.working && refillTarget) {
                    creep.give(refillTarget, RESOURCE_ENERGY)
                    return RUNNING
                } else if (closestSource) {
                    creep.mine(closestSource)
                    return RUNNING
                }
                return INCOMPLETE
            }

            creep.memory.task = HARVESTER_EARLY
            let newProcess = new Process(creep.name, LOW, earlyTask)
            global.scheduler.addProcess(newProcess)
        },
        harvester_source: function(creep: Creep) {
            let creepId = creep.id

            const sourceTask = () => {
                Utils.Logger.log("CreepTask -> sourceTask()", TRACE)
                let creep = Game.getObjectById(creepId)
                if (!creep) return FATAL;
                if (creep.spawning) return RUNNING;

                let closestSource: Source | undefined = undefined

                if (!creep.memory.assignedPos) {
                    closestSource = Harvester.genAssignedPos(creep);
                } else {
                    closestSource = Utils.Utility.unpackPostionToRoom(creep.memory.assignedPos, creep.memory.homeRoom).findInRange(FIND_SOURCES, 1)[0]
                }

                if (closestSource) {

                    creep.mine(closestSource)

                    // Handle Dumping
                    if (creep.store.energy > (creep.store.getCapacity() * 0.8)) {
                        if (!creep.cache.dump) {
                            let dumps = closestSource.pos.findInRange(FIND_STRUCTURES, 2);
                            let link: StructureLink | undefined = dumps.filter(function (d) { return Utils.Typeguards.isStructureLink(d) && d.store.getFreeCapacity(RESOURCE_ENERGY) > 0 })[0] as StructureLink | undefined;
                            let container = dumps.filter(function (d) { return Utils.Typeguards.isStructureContainer(d) && d.store.getFreeCapacity(RESOURCE_ENERGY) > 0 })[0] as StructureContainer | undefined;

                            if (link) {
                                creep.cache.dump = link.id;
                            } else if (container) {
                                creep.cache.dump = container.id;
                            }
                        }
                        if (creep.cache.dump) {
                            let dump = Game.getObjectById(creep.cache.dump);
                            if (dump && dump.store.getFreeCapacity(RESOURCE_ENERGY) > 0 && creep.ticksToLive) {
                                creep.give(dump, RESOURCE_ENERGY);
                            } else {
                                delete creep.cache.dump
                            }
                        }
                    }
                    if (creep.ticksToLive && creep.ticksToLive % 50 === 0) delete creep.cache.dump

                    return RUNNING
                }
                return INCOMPLETE
            }

            creep.memory.task = HARVESTER_SOURCE
            let newProcess = new Process(creep.name, LOW, sourceTask)
            global.scheduler.addProcess(newProcess)
        }
    }

    private static genAssignedPos(creep: Creep): Source | undefined {
        let sources = creep.room.sources
        let targetSource: Source | undefined;

        // Prespawn targeting
        let matchingCreep = creep.room.stationedCreeps.harvester.find((c) => c.name !== creep.name && (c.name.substring(0,6) ?? '1') == (creep.name.substring(0,6) ?? '0'))
        if (matchingCreep && matchingCreep.memory.assignedPos && _.all(sources, (s) => s.fullyHarvesting)) {
            creep.memory.assignedPos = matchingCreep.memory.assignedPos;
            targetSource = Utils.Utility.unpackPostionToRoom(creep.memory.assignedPos, creep.memory.homeRoom).findInRange(FIND_SOURCES, 1)[0]
        }


        if (!creep.memory.assignedPos) {
            for (let source of sources) {
                // Non-maxed targeting
                if (!source.fullyHarvesting) {
                    targetSource = source;
                    let assignablePos = source.assignablePosition();
                    creep.memory.assignedPos = assignablePos ? Utils.Utility.packPosition(assignablePos) : undefined;
                }

                // Backup targeting
                if (!creep.memory.assignedPos) {
                    targetSource = source;
                    let assignablePos = source.assignablePosition();
                    creep.memory.assignedPos = assignablePos ? Utils.Utility.packPosition(assignablePos) : undefined;
                }
            }
        }


        return targetSource;
    }
}
