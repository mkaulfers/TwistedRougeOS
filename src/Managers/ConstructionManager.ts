import { Process } from "Models/Process"
import { Utils } from "utils/Index"
import { planRoom } from "utils/RoomPlanner"
import { Role, Task, ProcessPriority, ProcessResult, LogLevel, StampType, DangerLevel, LinkState } from '../utils/Enums'
import { Stamps } from "Models/Stamps"

export default class ConstructionManager {
    static scheduleConstructionMonitor(room: Room): void | ProcessResult {
        const roomName = room.name

        if (global.scheduler.processQueue.has(`${roomName}_construction_monitor`)) { return }

        const constructionMonitor = () => {
            let room = Game.rooms[roomName]
            if (!room || !room.my) return ProcessResult.FATAL;

            if (!room.memory.frontiers) {
                room.setFrontiers(room)
            }

            let controller = room.controller
            if (!controller) return ProcessResult.FATAL;

            if (room.cache.recentlyAttacked && room.memory.blueprint) {
                let constructionSites = room.constructionSites()
                for (let site of constructionSites) {
                    if (site.structureType != STRUCTURE_RAMPART) {
                        site.remove()
                    }

                    let packedRamparts = room.memory.blueprint.ramparts
                    for (let rampart of packedRamparts) {
                        let pos = Utils.Utility.unpackPostionToRoom(rampart, room.name)
                        pos.createConstructionSite(STRUCTURE_RAMPART)
                    }
                }
            }

            if (!(room.cache.recentlyAttacked && room.cache.attackedTime && Game.time - room.cache.attackedTime < 10)) {
                if (Game.time % 50 != 0) { return } // REVERT THIS
            }

            if (Game.cpu.bucket > 500) {
                planRoom(room)
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

                let containers = blueprint.containers

                switch (controller.level) {
                    case 8:
                        fastFillerStructuresSkipped = []
                        hubSkipped = []
                        let danglingExtensions = blueprint.stamps.filter(stamp => { return stamp.type == StampType.EXTENSION })
                        for (let ext of danglingExtensions) {
                            let pos = Utils.Utility.unpackPostionToRoom(ext.stampPos, room.name)
                            Stamps.buildStructure(pos, ext.type)
                        }

                        let observer = blueprint.stamps.find(stamp => { return stamp.type == StampType.OBSERVER })
                        if (observer) {
                            let pos = Utils.Utility.unpackPostionToRoom(observer.stampPos, room.name)
                            Stamps.buildStructure(pos, observer.type)
                        }

                        // Place last source link
                        for (let link of blueprint.links) {
                            let linkPos = Utils.Utility.unpackPostionToRoom(link, room.name)
                            if (linkPos.lookFor(LOOK_STRUCTURES).findIndex(s => s.structureType === STRUCTURE_LINK) >= 0) continue;
                            linkPos.createConstructionSite(STRUCTURE_LINK);
                        }

                    case 7:
                        hubSkipped.splice(hubSkipped.indexOf(STRUCTURE_FACTORY), 1)
                        fastFillerStructuresSkipped.splice(fastFillerStructuresSkipped.indexOf(STRUCTURE_SPAWN), 1)

                        let farthestSource: Source | undefined = undefined
                        let blueprintAnchor = Utils.Utility.unpackPostionToRoom(blueprint.anchor, room.name)

                        for (let source of room.sources) {
                            if (!farthestSource) {
                                farthestSource = source
                            }

                            if (farthestSource.pos.getRangeTo(blueprintAnchor) <= source.pos.getRangeTo(blueprintAnchor)) {
                                farthestSource = source
                            }
                        }

                        //Sets the last link by instead setting the farthest source, to the closest source.
                        if (room.structures(STRUCTURE_LINK).length >= 2) {
                            for (let source of room.sources) {
                                if (!farthestSource) farthestSource = source

                                if (farthestSource.pos.getRangeTo(blueprintAnchor) >= source.pos.getRangeTo(blueprintAnchor)) {
                                    farthestSource = source
                                }
                            }
                        }

                        for (let link of blueprint.links) {
                            let linkPos = Utils.Utility.unpackPostionToRoom(link, room.name)

                            //Sets the farthest source Link
                            if (farthestSource) {
                                let sourceLinkInRange = linkPos.inRangeTo(farthestSource.pos, 2)
                                if (sourceLinkInRange) {
                                    linkPos.createConstructionSite(STRUCTURE_LINK)
                                }
                            }
                        }
                    case 6:
                        // FF Link
                        fastFillerStructuresSkipped.splice(fastFillerStructuresSkipped.indexOf(STRUCTURE_LINK), 1)

                        // Remove STRUCTURE_TERMINAL from hubSkipped
                        hubSkipped.splice(hubSkipped.indexOf(STRUCTURE_TERMINAL), 1)

                        let labs = blueprint.stamps.filter(stamp => stamp.type == StampType.LABS)
                        let labsCount = room.labs.length
                        let labsConstCount = room.constructionSites(STRUCTURE_LAB).length

                        for (let lab of labs) {
                            if (labsCount + labsConstCount < room.maxLabsAvail) {
                                let pos = Utils.Utility.unpackPostionToRoom(lab.stampPos, room.name)
                                Stamps.buildStructure(pos, lab.type)
                            }
                        }

                        // Extractor
                        let mineral = room.mineral;
                        if (mineral) mineral.pos.createConstructionSite(STRUCTURE_EXTRACTOR);
                        for (let container of containers) {
                            let containerPos = Utils.Utility.unpackPostionToRoom(container, room.name)
                            if (containerPos.findInRange(FIND_MINERALS, 2).length > 0) {
                                containerPos.createConstructionSite(STRUCTURE_CONTAINER)
                            }
                        }
                    case 5:

                        // Anchor Link
                        hubSkipped.splice(hubSkipped.indexOf(STRUCTURE_LINK), 1)

                        //Farthest Source Link
                        let links = blueprint.links

                        for (let link of links) {
                            let linkPos = Utils.Utility.unpackPostionToRoom(link, room.name)

                            //Sets the controller link
                            let controllerLinkInRange = linkPos.inRangeTo(controller, 2)
                            if (controllerLinkInRange) {
                                linkPos.createConstructionSite(STRUCTURE_LINK)
                            }
                        }

                        let packedRamparts = blueprint.ramparts
                        for (let rampart of packedRamparts) {
                            let pos = Utils.Utility.unpackPostionToRoom(rampart, room.name)
                            pos.createConstructionSite(STRUCTURE_RAMPART)
                        }
                    case 4:
                        let extensions = blueprint.stamps.filter(x => x.type == StampType.EXTENSIONS)
                        for (let extension of extensions) {
                            let roomExtConstSites = room.constructionSites(STRUCTURE_EXTENSION)
                            let extensions = room.extensions
                            if (roomExtConstSites.length + extensions.length < room.maxExtensionsAvail && room.areFastFillerExtensionsBuilt) {
                                Stamps.buildStructure(Utils.Utility.unpackPostionToRoom(extension.stampPos, room.name), StampType.EXTENSIONS)
                            }
                        }

                        let hub = blueprint.stamps.filter(x => x.type == StampType.ANCHOR)[0]
                        let hubPos = Utils.Utility.unpackPostionToRoom(hub.stampPos, room.name)
                        Stamps.buildStructure(hubPos, StampType.ANCHOR, hubSkipped)

                    case 3:
                        let towers = room.towers
                        let towerConstructionSites = room.constructionSites(STRUCTURE_TOWER)
                        let towerStamps = blueprint.stamps.filter(x => x.type == StampType.TOWER)
                        for (let stamp of towerStamps) {
                            if (towerConstructionSites.length + towers.length < room.maxTowersAvail) {
                                Stamps.buildStructure(Utils.Utility.unpackPostionToRoom(stamp.stampPos, room.name), StampType.TOWER, [STRUCTURE_RAMPART])
                            }
                        }

                        Stamps.buildStructureRoads(room)

                        let roadPos = blueprint.highways
                        for (let road of roadPos) {
                            let constPos = Utils.Utility.unpackPostionToRoom(road, room.name)
                            constPos.createConstructionSite(STRUCTURE_ROAD)
                        }
                    case 2:
                        for (let container of containers) {
                            let containerPos = Utils.Utility.unpackPostionToRoom(container, room.name)
                            //If container is adjacent to a source build it.
                            if (containerPos.findInRange(FIND_SOURCES, 2).length > 0) {
                                containerPos.createConstructionSite(STRUCTURE_CONTAINER)
                            }
                        }

                        let fastFiller = blueprint.stamps.find(s => s.type === StampType.FAST_FILLER)
                        if (fastFiller) {
                            Utils.Logger.log(`Level ${controller.level}`, LogLevel.INFO)
                            if (room.areFastFillerExtensionsBuilt) {
                                fastFillerStructuresSkipped.splice(fastFillerStructuresSkipped.indexOf(STRUCTURE_CONTAINER), 1)
                            }
                            Stamps.buildStructure(Utils.Utility.unpackPostionToRoom(fastFiller.stampPos, room.name), fastFiller.type, fastFillerStructuresSkipped)
                        }
                }
            }

            return ProcessResult.RUNNING;
        }

        let process = new Process(`${roomName}_construction_monitor`, ProcessPriority.MEDIUM, constructionMonitor)
        global.scheduler.addProcess(process)
    }
}
