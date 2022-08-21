import { LogLevel } from './Enums';

declare global {
    namespace NodeJS {
        interface Global {
            /**
             * Toggles a visual so that one may see its effects.
             */
            toggleVisual(visual: string): number;
            /**
             * A heap-saved variable for housing the visual toggles.
             */
            visualToggles?: {[key: string]: boolean};
        }
      }
}

global.toggleVisual = function(visual) {
    if (!global.visualToggles) global.visualToggles = {
        roomPlanning: false,
        distanceTransform: false,
        pathfinding: false,
        worldRoomScoring: false,
        worldRemotes: false,
        worldPathfinding: false
    };

    if (visual in global.visualToggles) {
        global.visualToggles[visual] = !global.visualToggles[visual]
        console.log(`${visual} toggled to ${global.visualToggles[visual]}.`);
        return OK;
    } else {
        console.log(`ERR_INVALID_ARGS. ${visual} is not a correct visual toggle.`);
        return ERR_INVALID_ARGS;
    }
}


