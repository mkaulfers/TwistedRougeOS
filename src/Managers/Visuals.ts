import { Process } from "Models/Process";
import { Utils } from "../utils/Index";
import { Stamps } from 'Models/Stamps'
import { DangerLevel, PEACEFUL, INVADERS, WARY, DANGER, DEATH } from "Constants/DangerLevelConstants";
import { TRACE } from "Constants/LogConstants";
import { LOW } from "Constants/ProcessPriorityConstants";
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
        worldRoomScoring: {[roomName: string]: worldRoomScoring};
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

export default class Visuals {
    static visualsHandler() {

        const visualsHandler = () => {
            Utils.Logger.log(`Visuals -> visualsHandler()`, TRACE);
            let visualToggles = global.Cache.cmd;
            if (visualToggles && visualToggles.roomPlanning == true) {
                this.roomPlanning();
            }

            if (visualToggles && visualToggles.distanceTransform == true) {
                this.distanceTransform();
            }

            if (visualToggles && visualToggles.pathfinding == true) {
                this.pathfinding();
            }

            if (visualToggles && visualToggles.worldRoomScoring == true) {
                this.worldRoomScoring();
            }

            if (visualToggles && visualToggles.worldRemotes == true) {
                this.worldRemotes();
            }

            if (visualToggles && visualToggles.worldPathfinding == true) {
                this.worldPathfinding();
            }
        }

        let newProcess = new Process('visualsHandler', LOW, visualsHandler)
        global.scheduler.addProcess(newProcess)
    }

    static roomPlanning() {
        Utils.Logger.log(`Visuals -> roomPlanning()`, TRACE);
        for (const roomName in Memory.rooms) {
            if (!Memory.rooms[roomName] || !Memory.rooms[roomName].blueprint) continue;
            let blueprint = Memory.rooms[roomName].blueprint;
            if (!blueprint) continue;
            let rVis = new RoomVisual(roomName);

            for (let stamp of blueprint.stamps) {
                let pos = Utils.Utility.unpackPostionToRoom(stamp.stampPos, roomName)
                Stamps.plan(pos, stamp.type, [], [], rVis)
            }

            for (let step of blueprint.highways) {
                let pos = Utils.Utility.unpackPostionToRoom(step, roomName)
                rVis.structure(pos.x, pos.y, STRUCTURE_ROAD)
            }

            for (let container of blueprint.containers) {
                let pos = Utils.Utility.unpackPostionToRoom(container, roomName)
                rVis.structure(pos.x, pos.y, STRUCTURE_CONTAINER)
            }

            for (let rampart of blueprint.ramparts) {
                let pos = Utils.Utility.unpackPostionToRoom(rampart, roomName)
                rVis.structure(pos.x, pos.y, STRUCTURE_RAMPART, { opacity: 0.3 })
            }

            for (let link of blueprint.links) {
                let pos = Utils.Utility.unpackPostionToRoom(link, roomName)
                rVis.structure(pos.x, pos.y, STRUCTURE_LINK)
            }

            rVis.connectRoads()
        }
    }

    static distanceTransform() {
        Utils.Logger.log(`Visuals -> distanceTransform()`, TRACE);
        if (!global.tempForVisuals || !global.tempForVisuals.distanceTransform) return;
        for (const roomName in global.tempForVisuals.distanceTransform) {
            let costMatrix = PathFinder.CostMatrix.deserialize(global.tempForVisuals.distanceTransform[roomName])
            new RoomVisual(roomName).costMatrix(costMatrix);
        }
    }

    static pathfinding() {
        Utils.Logger.log(`Visuals -> pathfinding()`, TRACE);
        for (const roomName in global.Cache.rooms) {
            const pathfindingCM = global.Cache.rooms[roomName].pathfindingCM;
            if (!pathfindingCM) continue;
            let costMatrix = PathFinder.CostMatrix.deserialize(JSON.parse(pathfindingCM));
            new RoomVisual(roomName).costMatrix(costMatrix, false);
        }
    }

    static worldRoomScoring() {
        Utils.Logger.log(`Visuals -> worldRoomScoring()`, TRACE);
        if (!global.tempForVisuals || !global.tempForVisuals.worldRoomScoring) return;
        for (const roomName in global.tempForVisuals.worldRoomScoring) {
            let scoreData = global.tempForVisuals.worldRoomScoring[roomName];
            Game.map.visual.text(`${scoreData.score}`, new RoomPosition(25,25,roomName), {fontSize: 10});
            Game.map.visual.text(`${scoreData.openSpace}`, new RoomPosition(15,37,roomName), {fontSize: 8});
            Game.map.visual.text(`${scoreData.plainSpace}`, new RoomPosition(34,37,roomName), {fontSize: 8});
        }
    }

    static worldRemotes() {
        Utils.Logger.log(`Visuals -> worldRemotes()`, TRACE);
        for (let roomName in Game.rooms) {
            let roomMem = Memory.rooms[roomName]
            if (!roomMem || !roomMem.remoteSites || Object.keys(roomMem.remoteSites).length == 0) continue;
            let home = new RoomPosition(25,25,roomName);
            let remotes = Memory.rooms[roomName].remoteSites;
            for (let key in remotes) {
                let remote = remotes[key];
                let rPos = new RoomPosition(25,25, key);
                Game.map.visual.line(rPos, home, {color: '#ffffff', width: 2.0});
            }
        }
    }

    static worldPathfinding() {
        Utils.Logger.log(`Visuals -> worldPathfinding()`, TRACE);
        if (!Memory.rooms) return;
        for (const roomName in Memory.rooms) {
            let pathData = Memory.rooms[roomName].intel;
            if (!pathData) continue;
            let color = '#000000';
            switch (pathData.threatLevel) {
                case PEACEFUL:
                    color = '#00ff00';
                    break;
                case INVADERS:
                    color = '#ccff33';
                    break;
                case WARY:
                    color = '#ffff1a';
                    break;
                case DANGER:
                    color = '#ff9900';
                    break;
                case DEATH:
                    color = '#ff0000';
                    break;
            }
            Game.map.visual.rect(new RoomPosition(0,0,roomName), 50, 50, {fill: color, stroke: color, opacity: 0.1});

            // for (let exit of pathData.validExits) {
            //     switch (exit) {
            //         case FIND_EXIT_TOP:
            //             Game.map.visual.line(new RoomPosition(0,1,roomName), new RoomPosition(49,1,roomName), {color: '#00ff00', width: 2.0});
            //             break;
            //         case FIND_EXIT_RIGHT:
            //             Game.map.visual.line(new RoomPosition(49,0,roomName), new RoomPosition(49,49,roomName), {color: '#00ff00', width: 2.0});
            //             break;
            //         case FIND_EXIT_BOTTOM:
            //             Game.map.visual.line(new RoomPosition(49,49,roomName), new RoomPosition(0,49,roomName), {color: '#00ff00', width: 2.0});
            //             break;
            //         case FIND_EXIT_LEFT:
            //             Game.map.visual.line(new RoomPosition(1,0,roomName), new RoomPosition(1,49,roomName), {color: '#00ff00', width: 2.0});
            //             break;
            //     }
            // }
        }
    }
}
