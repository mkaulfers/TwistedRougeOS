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
        danger: DangerLevel;
    }
    type roomPlan = {
        type: string,
        pos: number,
        completed: boolean,
    }[]
    interface Cache {
        distanceTransform: {[roomName: string]: number[]};
        pathfinding: {[roomName: string]: number[]};
        worldRoomScoring: {[roomName: string]: worldRoomScoring};
        worldPathfinding: {[roomname: string]: worldPathfinding};
    }
    namespace NodeJS {
        interface Global {
            /**
             * A heap-saved variable for housing the visual-related data.
             * Should eventually be broken down into wherever the data is actually saved.
             * Functions in 'utils/Visuals' should be updated when this occurs.
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
        // for (const roomName in Memory.rooms) {
        //     if (!Memory.rooms[roomName] || !Memory.rooms[roomName].blueprint) continue;
        //     let roomPlan = Memory.rooms[roomName].blueprint;
        //     let rVis = new RoomVisual(roomName);
        //     for (let i = 0; i < roomPlan!.length; i++) {
        //         let pos = Utility.unpackPostionToRoom(roomPlan![i].stampPos, roomName)
        //         if (Object.values(StampType).includes(roomPlan![i].type as StampType)) {
        //             let stamp = Stamps[roomPlan![i].type as keyof typeof Stamps]
        //             if (!stamp) {
        //                 Logger.log(`Room Planning Visual attempted to call nonexistant stamp: ${roomPlan![i].type}.`, LogLevel.ERROR);
        //                 continue;
        //             }
        //             for (let i = 0; i < stamp.length; i++) {
        //                 rVis.structure(pos.x + stamp[i].xMod, pos.y + stamp[i].yMod, stamp[i].structureType);
        //             }
        //         } else {
        //             rVis.structure(pos.x, pos.y, roomPlan![i].type);
        //         }
        //     }
        //     rVis.connectRoads();
        // }
    },
    distanceTransform: function() {
        if (!global.tempForVisuals || !global.tempForVisuals.distanceTransform) return;
        for (const roomName in global.tempForVisuals.distanceTransform) {
            let costMatrix = PathFinder.CostMatrix.deserialize(global.tempForVisuals.distanceTransform[roomName])
            new RoomVisual(roomName).costMatrix(costMatrix);
        }
    },
    pathfinding: function() {
        if (!global.tempForVisuals || !global.tempForVisuals.pathfinding) return;
        for (const roomName in global.tempForVisuals.pathfinding) {
            let costMatrix = PathFinder.CostMatrix.deserialize(global.tempForVisuals.pathfinding[roomName])
            new RoomVisual(roomName).costMatrix(costMatrix);
        }
    },
    worldRoomScoring: function() {
        if (!global.tempForVisuals || !global.tempForVisuals.worldRoomScoring) return;
        for (const roomName in global.tempForVisuals.worldRoomScoring) {
            let scoreData = global.tempForVisuals.worldRoomScoring[roomName];
            Game.map.visual.text(`${scoreData.score}`, new RoomPosition(25,25,roomName), {fontSize: 10});
            Game.map.visual.text(`${scoreData.openSpace}`, new RoomPosition(15,37,roomName), {fontSize: 8});
            Game.map.visual.text(`${scoreData.plainSpace}`, new RoomPosition(34,37,roomName), {fontSize: 8});
        }
    },
    worldRemotes: function() {
        for (let roomName in Game.rooms) {
            if (!Memory.rooms[roomName] || !Memory.rooms[roomName].remotes || Memory.rooms[roomName].remotes!.length == 0) continue;
            let home = new RoomPosition(25,25,roomName);
            let remotes = Memory.rooms[roomName].remotes as string[];
            for (let remote of remotes) {
                let rPos = new RoomPosition(25,25,remote);
                Game.map.visual.line(rPos, home, {color: '#ffffff', width: 2.0});
            }
        }

    },
    worldPathfinding: function() {
        if (!global.tempForVisuals || !global.tempForVisuals.worldPathfinding) return;
        for (const roomName in global.tempForVisuals.worldPathfinding) {
            let pathData = global.tempForVisuals.worldPathfinding[roomName];
            switch (pathData.danger) {
                case DangerLevel.PEACEFUL:
                    var color = '#00ff00';
                    break;
                case DangerLevel.INVADERS:
                    color = '#ccff33';
                    break;
                case DangerLevel.WARY:
                    color = '#ffff1a';
                    break;
                case DangerLevel.DANGER:
                    color = '#ff9900';
                    break;
                case DangerLevel.NUKETHIS:
                    color = '#ff0000';
                    break;
            }
            Game.map.visual.rect(new RoomPosition(0,0,roomName), 50, 50, {fill: color, stroke: color, opacity: 0.1});

            for (let exit of pathData.validExits) {
                switch (exit) {
                    case FIND_EXIT_TOP:
                        Game.map.visual.line(new RoomPosition(0,1,roomName), new RoomPosition(49,1,roomName), {color: '#00ff00', width: 2.0});
                        break;
                    case FIND_EXIT_RIGHT:
                        Game.map.visual.line(new RoomPosition(49,0,roomName), new RoomPosition(49,49,roomName), {color: '#00ff00', width: 2.0});
                        break;
                    case FIND_EXIT_BOTTOM:
                        Game.map.visual.line(new RoomPosition(49,49,roomName), new RoomPosition(0,49,roomName), {color: '#00ff00', width: 2.0});
                        break;
                    case FIND_EXIT_LEFT:
                        Game.map.visual.line(new RoomPosition(1,0,roomName), new RoomPosition(1,49,roomName), {color: '#00ff00', width: 2.0});
                        break;
                }
            }
        }
    },

}

export default visuals;
