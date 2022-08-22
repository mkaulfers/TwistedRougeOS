import { Process } from "Models/Process";
import { Logger } from "./Logger";
import { Role, Task, ProcessPriority, ProcessResult, LogLevel, StampType, DangerLevel } from './Enums'
import { Utility } from "./Utilities";
import { Stamps } from 'Models/Stamps'

declare global {

    interface worldRoomScoring {
        score: number;
        openSpace: number;
        plainSpace: number;
    }
    interface worldPathfinding {
        validExits: ExitConstant[];
        validExitToExits: [ExitConstant, ExitConstant][];
        danger: DangerLevel;
    }
    type roomPlan = {
        type: string,
        pos: number,
        completed: boolean,
    }[]
    interface Cache {
        distanceTransform: {[roomName: string]: CostMatrix};
        pathfinding: {[roomName: string]: CostMatrix};
        worldRoomScoring: {[roomName: string]: worldRoomScoring};
        worldPathfinding: {[roomname: string]: worldPathfinding};
    }
    namespace NodeJS {
        interface Global {
            /**
             * A heap-saved variable for housing the visual toggles.
             */
            tempForVisuals?: Cache;
        }
      }
}

var visuals = {
    visualsHandler: function() {

        const visualsHandler = () => {
            if (global.visualToggles && global.visualToggles.roomPlanning == true) {
                visuals.roomPlanning();
            }

            if (global.visualToggles && global.visualToggles.distanceTransform == true) {
                visuals.distanceTransform();
            }

            if (global.visualToggles && global.visualToggles.pathfinding == true) {
                visuals.pathfinding();
            }

            if (global.visualToggles && global.visualToggles.worldRoomScoring == true) {
                visuals.worldRoomScoring();
            }

            if (global.visualToggles && global.visualToggles.worldRemotes == true) {
                visuals.worldRemotes();
            }

            if (global.visualToggles && global.visualToggles.worldPathfinding == true) {
                visuals.worldPathfinding();
            }
        }

        let newProcess = new Process('visualsHandler', ProcessPriority.LOW, visualsHandler)
        global.scheduler.addProcess(newProcess)
    },
    roomPlanning: function() {
        for (const roomName in Memory.rooms) {
            if (!Memory.rooms[roomName].blueprint) continue;
            let roomPlan = Memory.rooms[roomName].blueprint;
            let rVis = new RoomVisual(roomName);
            for (let i = 0; i < roomPlan!.length; i++) {
                let pos = Utility.unpackPostionToRoom(roomPlan![i].stampPos, roomName)
                if (Object.values(StampType).includes(roomPlan![i].type as StampType)) {
                    let stamp = Stamps[roomPlan![i].type as keyof typeof Stamps]
                    if (!stamp) {
                        Logger.log(`Room Planning Visual attempted to call nonexistant stamp: ${roomPlan![i].type}.`, LogLevel.ERROR);
                        continue;
                    }
                    for (let i = 0; i < stamp.length; i++) {
                        rVis.structure(pos.x + stamp[i].xMod, pos.y + stamp[i].yMod, stamp[i].structureType);
                    }
                } else {
                    rVis.structure(pos.x, pos.y, roomPlan![i].type);
                }
            }
        }
    },
    distanceTransform: function() {
        if (!global.tempForVisuals || !global.tempForVisuals.distanceTransform) return;
        for (const roomName in global.tempForVisuals.distanceTransform) {
            new RoomVisual(roomName).costMatrix(global.tempForVisuals.distanceTransform[roomName]);
        }
    },
    pathfinding: function() {
        if (!global.tempForVisuals || !global.tempForVisuals.pathfinding) return;
        for (const roomName in global.tempForVisuals.pathfinding) {
            new RoomVisual(roomName).costMatrix(global.tempForVisuals.pathfinding[roomName]);
        }
    },
    worldRoomScoring: function() {
        if (!global.tempForVisuals || !global.tempForVisuals.worldRoomScoring) return;

    },
    worldRemotes: function() {

    },
    worldPathfinding: function() {
        if (!global.tempForVisuals || !global.tempForVisuals.worldPathfinding) return;

    },

}

export default visuals;
