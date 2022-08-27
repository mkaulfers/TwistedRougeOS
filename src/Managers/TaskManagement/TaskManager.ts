import { Process } from "Models/Process";
import { Logger } from "utils/Logger";
import { Roles } from "Creeps/Index";
import { Role, Task, ProcessPriority, ProcessResult, LogLevel, StampType } from '../../utils/Enums'
import { Utils } from "utils/Index";
import { Stamp } from "Models/Stamps";
import { planRoom } from "utils/RoomPlanner";


export function scheduleSpawnMonitor(room: Room) {
    const roomId = room.name

    const spawnMonitorTask = () => {
        let room = Game.rooms[roomId]
        let availableSpawn = room.getAvailableSpawn()

        if (availableSpawn) {
            // let respawnRole: Creep | undefined = room.shouldPreSpawn(availableSpawn)
            // if (respawnRole) {
            //     room.spawnCreep(respawnRole.memory.role as Role, availableSpawn, respawnRole.memory)
            //     availableSpawn = room.getAvailableSpawn()
            //     if (!availableSpawn) { return }
            // }

            for (let i = 0; i < Object.keys(Role).length; i++) {
                let role = Object.values(Role)[i]
                Logger.log(`Room -> scheduleSpawnMonitor() -> role: ${role}`, LogLevel.TRACE)
                let result = room.shouldSpawn(role)
                if (result) {
                    room.spawnCreep(role, availableSpawn)
                    return;
                }
            }
        }
    }

    let newProcess = new Process(`${room.name}_spawn_monitor`, ProcessPriority.LOW, spawnMonitorTask)
    global.scheduler.addProcess(newProcess)
}

export function scheduleCreepTask(room: Room) {
    Logger.log("Room -> scheduleCreepTask()", LogLevel.TRACE)
    let creeps = room.creeps(undefined)
    for (let i = 0; i < creeps.length; i++) {
        let creep = creeps[i]
        if (global.scheduler.processQueue.has(creep.name)) { continue }

        switch (creep.memory.task as Task) {
            case Task.HARVESTER_EARLY:
                Roles.Harvester.harvesterEarlyTask(creep)
                break
            case Task.HARVESTER_SOURCE:
                Roles.Harvester.harvesterSource(creep)
                break
            case Task.TRUCKER_STORAGE:
                Roles.Trucker.truckerStorage(creep)
                break
            case Task.TRUCKER_SCIENTIST:
                Roles.Trucker.truckerScientist(creep)
                break
            case Task.SCIENTIST_UPGRADING:
                Roles.Scientist.scientistUpgrading(creep)
                break
            case Task.ENGINEER_BUILDING:
                Roles.Engineer.engineerBuilding(creep)
                break
            case Task.ENGINEER_REPAIRING:
                Roles.Engineer.engineerRepairing(creep)
                break
            case Task.ENGINEER_UPGRADING:
                Roles.Engineer.engineerUpgrading(creep)
                break
        }
    }
}

export function scheduleRoomTaskMonitor(room: Room): void | ProcessResult {
    const roomName = room.name
    if (global.scheduler.processQueue.has(`${roomName}_task_monitor`)) { return }

    const roomTaskMonitor = () => {
        let room = Game.rooms[roomName]
        let roles = _.keys(Roles) as Array<keyof typeof Roles>; // triage change to make this role-confirming section work.
        if (!room) { return }
        _.forEach(roles, function (role) {
            if (room.creeps().length < 1) { return }
            Roles[role].dispatch(room);
        });
    }

    let process = new Process(`${roomName}_task_monitor`, ProcessPriority.CRITICAL, roomTaskMonitor)
    global.scheduler.addProcess(process)
}

export function scheduleConstructionMonitor(room: Room): void | ProcessResult {
    const roomName = room.name

    if (global.scheduler.processQueue.has(`${roomName}_construction_monitor`)) { return }

    const constructionMonitor = () => {
        let room = Game.rooms[roomName]
        if (!room) { return }
        let controller = room.controller
        if (!controller) { return }
        // if (Game.time % 1500 != 0) { return }
        if (Game.cpu.bucket > 500) {
            planRoom(room, false)
        }

        let hubSkipped = [
            STRUCTURE_RAMPART,
            STRUCTURE_SPAWN,
            STRUCTURE_POWER_SPAWN,
            STRUCTURE_NUKER,
            STRUCTURE_FACTORY,
            STRUCTURE_TERMINAL,
            STRUCTURE_LINK
        ]

        let fastFillerStructuresSkipped = [
            STRUCTURE_ROAD,
            STRUCTURE_CONTAINER,
            STRUCTURE_RAMPART,
            STRUCTURE_LINK,
            STRUCTURE_SPAWN
        ]

        let blueprint = room.memory.blueprint
        if (blueprint) {
            switch (controller.level) {
                case 8:

                    // let constructionSites = room.constructionSites()
                    // for (let site of constructionSites) {
                    //     site.remove()
                    // }

                    //TODO: Move original spawn to the new location.
                    //TODO: Where does the observer need to go?
                    fastFillerStructuresSkipped = []
                    hubSkipped = []
                    let danglingExtensions = blueprint.stamps.filter(stamp => { return stamp.type == StampType.EXTENSION })
                    for (let ext of danglingExtensions) {
                        let pos = Utils.Utility.unpackPostionToRoom(ext.stampPos, room.name)
                        Stamp.buildStructure(pos, ext.type as StampType)
                    }
                case 7:
                    hubSkipped.splice(hubSkipped.indexOf(STRUCTURE_LINK), 1)
                    hubSkipped.splice(hubSkipped.indexOf(STRUCTURE_FACTORY), 1)
                    fastFillerStructuresSkipped.splice(fastFillerStructuresSkipped.indexOf(STRUCTURE_SPAWN), 1)
                case 6:
                    //Last Source Link
                    //Extractor
                    // Remove STRUCTURE_TERMINAL from hubSkipped
                    hubSkipped.splice(hubSkipped.indexOf(STRUCTURE_TERMINAL), 1)

                    let labs = blueprint.stamps.filter(stamp => stamp.type == StampType.LABS)
                    let labsCount = room.labs().length
                    let labsConstCount = room.constructionSites(STRUCTURE_LAB).length

                    for (let lab of labs) {
                        if (labsCount + labsConstCount < room.maxLabsAvail()) {
                            let pos = Utils.Utility.unpackPostionToRoom(lab.stampPos, room.name)
                            Stamp.buildStructure(pos, lab.type as StampType)
                        }
                    }

                    let minerals = room.minerals()
                    for (let mineral of minerals) {
                        let pos = mineral.pos
                        pos.createConstructionSite(STRUCTURE_EXTRACTOR)
                    }
                case 5:
                    //Farthest Source Link
                    let links = blueprint.links
                    let sources = room.sources()
                    let blueprintAnchor = Utils.Utility.unpackPostionToRoom(blueprint.anchor, room.name)
                    let farthestSource: Source | undefined = undefined

                    for (let source of sources) {
                        if (!farthestSource) {
                            farthestSource = source
                        }

                        if (farthestSource.pos.getRangeTo(blueprintAnchor) < source.pos.getRangeTo(blueprintAnchor)) {
                            farthestSource = source
                        }
                    }

                    for (let link of links) {
                        let linkPos = Utils.Utility.unpackPostionToRoom(link, room.name)
                        let controllerLinkInRange = linkPos.inRangeTo(controller, 4)
                        if (controllerLinkInRange) {
                            linkPos.createConstructionSite(STRUCTURE_LINK)
                        }


                        if (farthestSource) {
                            let sourceLinkInRange = linkPos.inRangeTo(farthestSource.pos, 2)
                            if (sourceLinkInRange) {
                                linkPos.createConstructionSite(STRUCTURE_LINK)
                            }
                        }
                    }
                case 4:
                    let extensions = blueprint.stamps.filter(x => x.type == StampType.EXTENSIONS)
                    for (let extension of extensions) {
                        let roomExtConstSites = room.constructionSites(STRUCTURE_EXTENSION)
                        let extensions = room.extensions()
                        if (roomExtConstSites.length + extensions.length < room.maxExtensionsAvail()) {
                            Stamp.buildStructure(Utils.Utility.unpackPostionToRoom(extension.stampPos, room.name), StampType.EXTENSIONS)
                        }
                    }


                    let hub = blueprint.stamps.filter(x => x.type == StampType.ANCHOR)[0]
                    let hubPos = Utils.Utility.unpackPostionToRoom(hub.stampPos, room.name)
                    Stamp.buildStructure(hubPos, StampType.ANCHOR, hubSkipped)

                case 3:
                    let towers = room.towers()
                    let towerConstructionSites = room.constructionSites(STRUCTURE_TOWER)
                    let towerStamps = blueprint.stamps.filter(x => x.type == StampType.TOWER)
                    for (let stamp of towerStamps) {
                        if (towerConstructionSites.length + towers.length < room.maxTowersAvail()) {
                            Stamp.buildStructure(Utils.Utility.unpackPostionToRoom(stamp.stampPos, room.name), StampType.TOWER, [STRUCTURE_RAMPART])
                        }
                    }

                    Stamp.buildStructureRoads(room)

                    let roadPos = blueprint.highways
                    for (let road of roadPos) {
                        let constPos = Utils.Utility.unpackPostionToRoom(road, room.name)
                        constPos.createConstructionSite(STRUCTURE_ROAD)
                    }
                case 2:
                    let containers = blueprint.containers
                    for (let container of containers) {
                        let containerPos = Utils.Utility.unpackPostionToRoom(container, room.name)
                        //If container is adjacent to a source build it.
                        if (containerPos.findInRange(FIND_SOURCES, 2).length > 0) {
                            containerPos.createConstructionSite(STRUCTURE_CONTAINER)
                        }
                    }

                    let fastFiller = blueprint.stamps.find(s => s.type === StampType.FAST_FILLER)
                    if (fastFiller) {
                        Logger.log(`Level ${controller.level}`, LogLevel.DEBUG)
                        Stamp.buildStructure(Utils.Utility.unpackPostionToRoom(fastFiller.stampPos, room.name), fastFiller.type as StampType, fastFillerStructuresSkipped)
                    }
            }
        }
    }

    let process = new Process(`${roomName}_construction_monitor`, ProcessPriority.MEDIUM, constructionMonitor)
    global.scheduler.addProcess(process)
}
