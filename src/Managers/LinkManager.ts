import { link } from "fs"
import { Process } from "Models/Process"
import { Utils } from "utils/Index"
import { Role, Task, ProcessPriority, ProcessResult, LogLevel, StampType, DangerLevel, LinkState } from '../utils/Enums'

export default class LinkManager {
    static schedule(room: Room) {
        let roomName = room.name;
        let roomProcessId = roomName + "_link_monitor";
        if (global.scheduler.processQueue.has(roomProcessId)) return;

        const task = () => {
            Utils.Logger.log(`LinkManager -> ${roomProcessId}`, LogLevel.DEBUG);
            let room = Game.rooms[roomName];

            // Identify links
            if (!global.Cache.rooms[room.name].links ||
                (Game.time % 250 == 0 &&
                room.find(FIND_STRUCTURES, { filter: { structureType: STRUCTURE_LINK } }).length !== Object.keys(global.Cache.rooms[room.name].links!).length)) {

                global.Cache.rooms[room.name].links = {};
                let links = room.find(FIND_MY_STRUCTURES, { filter: { structureType: STRUCTURE_LINK } });

                // Define Link States
                for (let link of links) {
                    link = link as StructureLink;

                    if (link.pos.findInRange(FIND_SOURCES, 2).length > 0 || link.pos.findInRange(FIND_EXIT, 2).length > 0) {
                        global.Cache.rooms[room.name].links![link.id] = LinkState.INPUT;
                    }
                    if (room.controller && link.pos.getRangeTo(room.controller.pos.x, room.controller.pos.y) <= 3) {
                        if (global.Cache.rooms[room.name].links![link.id] == LinkState.INPUT) {
                            global.Cache.rooms[room.name].links![link.id] = LinkState.BOTH;
                        } else {
                            global.Cache.rooms[room.name].links![link.id] = LinkState.OUTPUT;
                        }
                    }
                    if (room.storage && link.pos.getRangeTo(room.storage.pos.x, room.storage.pos.y) < 2) {
                        global.Cache.rooms[room.name].links![link.id] = LinkState.BOTH;
                    }
                    if (!global.Cache.rooms[room.name].links![link.id]) {
                        global.Cache.rooms[room.name].links![link.id] = LinkState.OUTPUT;
                    }
                }
            }

            // Build links to work with
            let links = this.links(room);
            if (!links) return ProcessResult.RUNNING;

            let linkStates = global.Cache.rooms[room.name].links;
            if (!linkStates) return;

            let targetLinks = links.filter((l) => { return ([LinkState.OUTPUT, LinkState.BOTH].indexOf(linkStates![l.id] as LinkState) >= 0 &&
                l.store.energy < (l.store.getCapacity(RESOURCE_ENERGY) * 0.9)) });
            targetLinks = _.sortByOrder(targetLinks, (t: StructureLink) => t.store.energy, 'asc');

            for (let link of links) {
                if ((linkStates[link.id] == LinkState.INPUT || linkStates[link.id] == LinkState.BOTH) && link.store.energy > (link.store.getCapacity(RESOURCE_ENERGY) * 0.5)) {
                    let target = targetLinks.shift();
                    if (!target) return ProcessResult.RUNNING;
                    link.transferEnergy(target);
                }
            }
            return ProcessResult.RUNNING;
        }

        let newProcess = new Process(roomProcessId, ProcessPriority.LOW, task)
        global.scheduler.addProcess(newProcess)
    }

    static links(room: Room) {
        if (!global.Cache.rooms) return;
        let links: StructureLink[] = [];

            for (let linkId in global.Cache.rooms[room.name].links) {
                let link = Game.getObjectById(linkId as Id<StructureLink>)
                if (link) {
                    links.push(link);
                } else {
                    global.Cache.rooms[room.name].links = {};
                }
            }
            if (links.length > 0) return links;
            return;
    }
}
