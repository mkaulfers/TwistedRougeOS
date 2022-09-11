import { LogLevel } from './Enums';

declare global {
            /**
             * Returns help text for specific commmands
             */
            function help(cmd: string): string;

            // Visual Toggles
            const toggleRoomPlanVisual: string;
            const toggleDTVisual: string;
            const togglePathfindingVisual: string;
            const toggleWorldRoomScoreVisual: string;
            const toggleWorldRemoteVisual: string;
            const toggleWorldPathfindingVisual: string;

            // Cleanup Commands
            const destroyCreeps: string

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

Object.defineProperty(global, 'toggleRoomPlanVisual', {
    get() {
        global.Cache.cmd.roomPlanning = !global.Cache.cmd.roomPlanning;
        return `Room Planning Visual toggled to ${global.Cache.cmd.roomPlanning}.`;
    }
});

Object.defineProperty(global, 'toggleDTVisual', {
    get() {
        global.Cache.cmd.distanceTransform = !global.Cache.cmd.distanceTransform;
        return `Room Distance Transform Visual toggled to ${global.Cache.cmd.distanceTransform}.`;
    }
});

Object.defineProperty(global, 'togglePathfindingVisual', {
    get() {
        global.Cache.cmd.pathfinding = !global.Cache.cmd.pathfinding;
        return `Room Pathfinding Visual toggled to ${global.Cache.cmd.pathfinding}.`;
    }
});

Object.defineProperty(global, 'toggleWorldRoomScoreVisual', {
    get() {
        global.Cache.cmd.worldRoomScoring = !global.Cache.cmd.worldRoomScoring;
        return `World Room Score Visual toggled to ${global.Cache.cmd.worldRoomScoring}.`;
    }
});

Object.defineProperty(global, 'toggleWorldRemoteVisual', {
    get() {
        global.Cache.cmd.worldRemotes = !global.Cache.cmd.worldRemotes;
        return `World Remotes Visual toggled to ${global.Cache.cmd.worldRemotes}.`;
    }
});

Object.defineProperty(global, 'toggleWorldPathfindingVisual', {
    get() {
        global.Cache.cmd.worldPathfinding = !global.Cache.cmd.worldPathfinding;
        return `World Pathfinding Visual toggled to ${global.Cache.cmd.worldPathfinding}.`;
    }
});

Object.defineProperty(global, 'destroyCreeps', {
    get() {
        global.Cache.cmd.destroyCreeps = !global.Cache.cmd.destroyCreeps;
        if (global.Cache.cmd.destroyCreeps == true) {
            for (const creep of Object.values(Game.creeps)) {
                creep.say(`Goodbye, dear overlords!`, true)
                creep.suicide();
            }
            return `All creeps destroyed.`
        } else return `To confirm your choice to kill all creeps, please resend the command.`
    }
});
