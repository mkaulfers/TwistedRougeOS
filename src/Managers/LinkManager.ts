import { Process } from "Models/Process"
import { Utils } from "utils/Index"
import { Logger } from "utils/Logger"
import { Role, Task, ProcessPriority, ProcessResult, LogLevel, StampType, DangerLevel } from '../utils/Enums'

var LinkManager = {
    schedule: function(room: Room) {
        let roomName = room.name;
        let roomProcessId = roomName + "_link_manager";
        if (global.scheduler.processQueue.has(roomProcessId)) return;

        const task = () => {
            Utils.Logger.log(`LinkManager -> ${roomProcessId}`, LogLevel.DEBUG);
            let room = Game.rooms[roomName];

            // Identify links
            if (!global.Cache) global.Cache = {};
            if (!global.Cache.rooms) global.Cache.rooms = {};
            if (!global.Cache.rooms[room.name]) global.Cache.rooms[room.name] = {};
            if (!global.Cache.rooms[room.name].links || (Game.time % 250 == 0 && room.find(FIND_STRUCTURES, { filter: { structureType: STRUCTURE_LINK } }).length !== Object.keys(global.Cache.rooms[room.name].links!).length)) {

            }
        }

        let newProcess = new Process(roomProcessId, ProcessPriority.LOW, task)
        global.scheduler.addProcess(newProcess)
    },
    input: function(link: StructureLink) {

    },
    both: function(link: StructureLink) {

    }
}

export default LinkManager;
