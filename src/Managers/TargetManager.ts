// As a TargetManager I want to provide a queue of targets for creeps to utilize so that they can be more efficient in their work.
// A target consists of either a Source, ConstructionSite, Repair, Resouce, another Creep, etc...
// The targets should be kept in a global queue, and be able to be rebuilt in the event of a global reset.
// The target should be able to be marked completed and removed from the queue.
// The target queue should be updated everytime a target is marked completed.
// The target manager should expose a function .handleTarget(creep) that will tell a creep how to handle the target. (i.e. harvest, build, repair, etc...)
// The .handleTarget(creep) function should call .completeTarget() when the target is completed, and then provide a new target to the creep.

import { INFO } from "Constants/LogConstants";
import { MEDIUM } from "Constants/ProcessPriorityConstants";
import { Process } from "Models/Process";
import { Target } from "Models/Target";
import { Logger } from "utils/Logger";

// The target manager should expose a function .requestTarget(creep) that will tell a creep what target to go after.
export class TargetManager {
    public targetQueue: {[creepID: Id<Creep>]: Target}

    static schedule(room: Room) {
        if (!global.targetManagerFor[room.name]) {
            global.targetManagerFor[room.name] = new TargetManager(room);
        }

        let roomName = room.name;
        const roomTargetMonitor = () => {

        }

        let newProcess = new Process(`${roomName}_target_monitor`, MEDIUM, roomTargetMonitor);
        global.scheduler.addProcess(newProcess);
    }

    public setTarget(forCreep: Creep) {
        //Set the target for the creep.
    }

    public completeTarget(forCreep: Creep) {
        //Mark the target as completed.
        //Remove the target from the queue.
        //Set a new target for the creep.
    }

    public handleTarget(forCreep: Creep) {
        //Tell the creep how to handle the target.
    }

    private rebuild(forRoom: Room) {
        Logger.log(`Rebuilding target queue for ${forRoom.name}`, INFO)
        if (!global.targetManagerFor) global.targetManagerFor = {}
    }

    constructor(forRoom: Room) {
        this.targetQueue = {}
        this.rebuild(forRoom)
    }
}
