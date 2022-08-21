import { Process } from "Models/Process";
import { Logger } from "./Logger";
import { Role, Task, ProcessPriority, ProcessResult, LogLevel } from './Enums'

var visuals = {
    visualsHandler: function() {

        const visualsHandler = () => {
            switch (true) {
                case (global.visualToggles && global.visualToggles.roomPlanning == true):
                    visuals.roomPlanning();
                    break;
                case (global.visualToggles && global.visualToggles.distanceTransform == true):

                    break;
                case (global.visualToggles && global.visualToggles.pathfinding == true):

                    break;
                case (global.visualToggles && global.visualToggles.worldRoomScoring == true):

                    break;
                case (global.visualToggles && global.visualToggles.worldRemotes == true):

                    break;
                case (global.visualToggles && global.visualToggles.worldPathfinding == true):

                    break;
            }
        }

        let newProcess = new Process('visualsHandler', ProcessPriority.LOW, visualsHandler)
        global.scheduler.addProcess(newProcess)
    },
    roomPlanning: function() {

    }
}
