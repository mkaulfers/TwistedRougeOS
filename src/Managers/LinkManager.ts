import { INPUT, BOTH, OUTPUT } from "Constants/LinkStateConstants";
import { TRACE, OFF } from "Constants/LogConstants";
import { LOW } from "Constants/ProcessPriorityConstants";
import { FATAL, RUNNING } from "Constants/ProcessStateConstants";
import { link } from "fs"
import { Process } from "Models/Process"
import { Utils } from "utils/Index"
export default class LinkManager {
    static get linksTriggerAt(): number { return 0.4 } // Percent full links send energy at

    static schedule(room: Room) {
        let roomName = room.name;
        let roomProcessId = roomName + "_link_monitor";
        if (global.scheduler.processQueue.has(roomProcessId)) return;

        const task = () => {
            Utils.Logger.log(`LinkManager -> ${roomProcessId}`, TRACE);
            let room = Game.rooms[roomName];
            if (!room || !room.my) return FATAL;

            // Identify links
            if (!room.cache.links ||
                (Game.time % 250 == 0 &&
                room.find(FIND_STRUCTURES, { filter: { structureType: STRUCTURE_LINK } }).length !== Object.keys(room.cache.links).length)) {
                room.cache.links = {};
                let links = room.links;

                // Define Link States
                for (let link of links) {
                    link = link;

                    if (link.pos.findInRange(FIND_SOURCES, 2).length > 0 || link.pos.findInRange(FIND_EXIT, 2).length > 0) {
                        room.cache.links[link.id] = INPUT;
                    }
                    if (room.controller && link.pos.getRangeTo(room.controller.pos.x, room.controller.pos.y) <= 3) {
                        if (room.cache.links[link.id] == INPUT) {
                            room.cache.links[link.id] = BOTH;
                        } else {
                            room.cache.links[link.id] = OUTPUT;
                        }
                    }
                    if (room.storage && link.pos.getRangeTo(room.storage.pos.x, room.storage.pos.y) <= 2) {
                        room.cache.links[link.id] = BOTH;
                    }
                    if (!room.cache.links[link.id]) {
                        room.cache.links[link.id] = OUTPUT;
                    }
                }
            }

            // Build links to work with
            let links = room.links;
            if (!links) return RUNNING;

            let linkStates = room.cache.links;
            if (!linkStates) return;

            let targetLinks = links.filter((l) => { return ([OUTPUT, BOTH].indexOf(linkStates[l.id]) >= 0 &&
                l.store.getFreeCapacity(RESOURCE_ENERGY) > (l.store.getCapacity(RESOURCE_ENERGY) * this.linksTriggerAt)) });
            targetLinks = _.sortByOrder(targetLinks, (t: StructureLink) => t.store.energy, 'asc');

            for (let link of links) {
                let target: StructureLink | undefined;
                if ((link.store.getUsedCapacity(RESOURCE_ENERGY) < (link.store.getCapacity(RESOURCE_ENERGY) * this.linksTriggerAt)) || link.cooldown > 0) continue;
                switch (linkStates[link.id]) {
                    case OUTPUT:
                        continue;
                    case BOTH:
                        if (targetLinks[0] === link && targetLinks.length > 1) target = targetLinks.pop();
                    case INPUT:
                        if (!target && targetLinks[0] !== link) target = targetLinks.shift();
                        Utils.Logger.log(`Link ${link.id} target: ${target ? target.id : undefined}`, OFF);
                        if (!target) return RUNNING;
                        link.transferEnergy(target);
                }
            }
            return RUNNING;
        }

        let newProcess = new Process(roomProcessId, LOW, task)
        global.scheduler.addProcess(newProcess)
    }
}
