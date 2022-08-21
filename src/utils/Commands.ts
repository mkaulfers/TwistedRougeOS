import { LogLevel } from './Enums';

declare global {
    namespace NodeJS {
        interface Global {
            /**
             * Returns help text for specific commmands
             */
            help(cmd: string): string;
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

global.help = function(cmd) {
    switch (cmd) {
        case 'toggleVisual' || 'togglevisual' || 'visual' || 'visuals':
        case 'toggle' || 'toggles':
            let response = `toggleVisual(visual: string) is used to toggle visual booleans so that you may see the visuals. \n
                The accepted values are: \n'roomPlanning'\n'distanceTransform'\n'pathfinding'\n'worldRoomScoring'\n'worldRemotes'\n'worldPathfinding'`
            console.log(response);
            return response;
        default:
            response = `${cmd} lacks a written description at the moment. Maybe you can add one if the function actually exists!`
            console.log(response);
            return response;
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


