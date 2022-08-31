import { LogLevel } from './Enums';

declare global {
            /**
             * Returns help text for specific commmands
             */
            function help(cmd: string): string;
            /**
             * Toggles a visual so that one may see its effects.
             */
            function toggleVisual(visual: string): number;
            /**
             * A heap-saved variable for housing the visual toggles.
             */
}

global.help = function(cmd) {
    let response = '';
    switch (cmd) {
        case 'toggleVisual' || 'togglevisual' || 'visual' || 'visuals':
        case 'toggle' || 'toggles':
            response = `toggleVisual(visual: string) is used to toggle visual booleans so that you may see the visuals. \n
                The accepted values are: \n'roomPlanning'\n'distanceTransform'\n'pathfinding'\n'worldRoomScoring'\n'worldRemotes'\n'worldPathfinding'`
            console.log(response);
            return response;
        default:
            response = `${cmd} either has no help text or isn't a function. \n Accepted values are 'toggleVisual'.`
            console.log(response);
            return response;
    }
}

global.toggleVisual = function(visual) {


    if (visual in global.Cache.visualToggles) {
        global.Cache.visualToggles[visual] = !global.Cache.visualToggles[visual]
        console.log(`${visual} toggled to ${global.Cache.visualToggles[visual]}.`);
        return OK;
    } else {
        console.log(`ERR_INVALID_ARGS. ${visual} is not a correct visual toggle.
            The accepted values are: \n'roomPlanning'\n'distanceTransform'\n'pathfinding'\n'worldRoomScoring'\n'worldRemotes'\n'worldPathfinding'`);
        return ERR_INVALID_ARGS;
    }
}


