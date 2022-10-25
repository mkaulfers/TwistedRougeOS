import { Utility } from './Utilities';
import { Logger } from './Logger';
import { ALL, OFF, TRACE, DEBUG, INFO, WARN, ERROR, LogLevels } from 'Constants/LogConstants';

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
            const destroyCreeps: string;
            function destroyCreepsInRoom(name: string): string;
            const destroyStructures: string;
            function destroyStructuresInRoom(name: string): string;
            const destroyCSites: string;
            function destroyCSitesInRoom(name: string): string;

            function setLogLevel(level: string): string;
            function schedule(name: string, full?: boolean): string;
            function reschedule(name: string): string;

}

global.help = function(cmd) {
    let response = '';
    switch (cmd) {

        case 'toggleRoomPlanVisual':
            return `'toggleRoomPlanVisual' is a toggle for seeing a room's planned structures, should it exist.`;
        case 'toggleDTVisual':
            return `'toggleDTVisual' is a toggle for seeing a room's Distance Transform Cost Matrix, should it exist.`;
        case 'togglePathfindingVisual':
            return `'togglePathfindingVisual' is a toggle for seeing a room's Pathfinding Cost Matrix for a single creep, should it exist.`;
        case 'toggleWorldRoomScoreVisual':
            return `'toggleWorldRoomScoreVisual' is a toggle for seeing a room's score for colonization on the world map, should it exist.`;
        case 'toggleWorldRemoteVisual':
            return `'toggleWorldRemoteVisual' is a toggle for seeing a room's remotes on the world map, should they exist.`;
        case 'toggleWorldPathfindingVisual':
            return `'toggleWorldPathfindingVisual' is a toggle for seeing a room's confirmed exits on the world map, should the data exist.`;
        case 'destroyCreeps':
            return `'destroyCreeps' is a confirmation required command for killing all creeps under one's control.`;
        case 'destroyCreepsInRoom': case 'destroyCreepsInRoom()':
            return `'destroyCreepsInRoom(roomName)' is a confirmation required command for killing all creeps for a specific room under one's control.`;
        case 'destroyStructures':
            return `'destroyStructures' is a confirmation required command for destroying all structures under one's control.`;
        case 'destroyStructuresInRoom': case 'destroyStructuresInRoom()':
            return `'destroyStructuresInRoom(roomName)' is a confirmation required command for destroying all structures for a specific room under one's control.`;
        case 'destroyCSites':
            return `'destroyCSites' is a confirmation required command for destroying all cSites under one's control.`;
        case 'destroyCSitesInRoom': case 'destroyCSitesInRoom()':
            return `'destroyCSitesInRoom(roomName)' is a confirmation required command for destroying all cSites for a specific room under one's control.`;
        case 'setLogLevel': case 'setLogLevel()':
            return `'setLogLevel(level)' is a command to change the current log level. Please use actual keys for the LogLevel enum.`;
        case 'schedule': case 'schedule()':
            return `'schedule(roomName, full?)' is a viewer for the room's spawn schedule. 'roomName' is the room's name, 'full' is an optional boolean for if you want the whole schedule object.`;
        case 'reschedule': case 'reschedule()':
            return `'schedule(roomName)' will force a room's spawn schedule to regenerate itself.. 'roomName' is the room's name.`;
        default:
            response = `${cmd} either has no help text or isn't a function. \n Accepted values are:
            'toggleRoomPlanVisual'
            'toggleDTVisual'
            'togglePathfindingVisual'
            'toggleWorldRoomScoreVisual'
            'toggleWorldRemoteVisual'
            'toggleWorldPathfindingVisual'
            'destroyCreeps'
            'destroyCreepsInRoom'
            'destroyStructures'
            'destroyStructuresInRoom'
            'destroyCSites'
            'destroyCSitesInRoom'
            'setLogLevel'
            'schedule'
            'reschedule'`
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

global.destroyCreepsInRoom = function(name) {
    let room = Game.rooms[name];
    if (!room) return `The chosen room is not in vision.`
    global.Cache.cmd.destroyCreepsInRoom = !global.Cache.cmd.destroyCreepsInRoom;
    if (global.Cache.cmd.destroyCreepsInRoom == true) {
        for (const creep of Object.values(Game.creeps)) {
            if (creep.memory.homeRoom !== name) continue;
            creep.say(`Goodbye, dear overlords!`, true)
            creep.suicide();
        }
        return `All creeps for ${name} destroyed.`
    } else return `To confirm your choice to kill all creeps for ${name}, please resend the command.`
}

Object.defineProperty(global, 'destroyStructures', {
    get() {
        global.Cache.cmd.destroyStructures = !global.Cache.cmd.destroyStructures;
        if (global.Cache.cmd.destroyStructures == true) {
            for (const room of Object.values(Game.rooms)) {
                for (const s of room.structures()) s.destroy();
            }
            return `All structures destroyed.`
        } else return `To confirm your choice to kill all structures, please resend the command.`
    }
});

global.destroyStructuresInRoom = function(name) {
    global.Cache.cmd.destroyStructuresInRoom = !global.Cache.cmd.destroyStructuresInRoom;
    if (global.Cache.cmd.destroyStructuresInRoom == true) {
        let room = Game.rooms[name];
        if (!room) return `No vision on room. Must not have anything owned in there...`
        for (const s of room.structures()) s.destroy();
        return `All structures for ${name} destroyed.`
    } else return `To confirm your choice to kill all structures for ${name}, please resend the command.`
}

Object.defineProperty(global, 'destroyCSites', {
    get() {
        global.Cache.cmd.destroyCSites = !global.Cache.cmd.destroyCSites;
        if (global.Cache.cmd.destroyCSites == true) {
            for (const cSite of Object.values(Game.constructionSites)) {
                cSite.remove();
            }
            return `All cSites destroyed.`
        } else return `To confirm your choice to kill all cSites, please resend the command.`
    }
});

global.destroyCSitesInRoom = function(name) {
    global.Cache.cmd.destroyStructuresInRoom = !global.Cache.cmd.destroyStructuresInRoom;
    if (global.Cache.cmd.destroyStructuresInRoom == true) {
        for (const cSite of Object.values(Game.constructionSites)) {
            if (cSite.pos.roomName !== name) continue;
            cSite.remove();
        }
        return `All cSites for ${name} destroyed.`
    } else return `To confirm your choice to kill all cSites for ${name}, please resend the command.`
}

global.setLogLevel = function(level) {
    level = level.toUpperCase();
    for (const logLevel of LogLevels) {
        if (logLevel.includes(level)) {
            Logger.devLogLevel = logLevel;
            return `LogLevel set to ${logLevel}.`;
        }
    }
    return `Requested string is not a Log Level. Please use: ALL, OFF, TRACE, DEBUG, INFO, WARN, ERROR, or FATAL.`;
}

global.schedule = function(name, full) {
    let room = Game.rooms[name];
    if (!room) return `The chosen room is not one of ours.`
    if (!room.cache.spawnSchedules) return `Schedule for ${name} not found.`

    if (full && full == true) {
        console.log(`${JSON.stringify(room.cache.spawnSchedules)}`)
        return `Full schedule for ${name} logged.`
    } else {
        for (const spawnSchedule of room.cache.spawnSchedules) {
            console.log(`Schedule for ${name}, ${spawnSchedule.spawnName}:`);
            for (const spawnOrder of spawnSchedule.schedule) {
                let timeTilSpawn = spawnOrder.scheduleTick !== undefined ? spawnOrder.scheduleTick - spawnSchedule.tick : `unknown`;
                if (typeof(timeTilSpawn) == 'number' && timeTilSpawn < 0) timeTilSpawn = 1500 + timeTilSpawn;
                console.log(`${spawnOrder.id}: ${Utility.bodyCost(spawnOrder.body)} energy, in ${timeTilSpawn} ticks, or tick ${typeof(timeTilSpawn) == 'number' ? Game.time + timeTilSpawn : timeTilSpawn}.`);
            }
        }
        return `Short schedule for ${name} logged.`
    }
}

global.reschedule = function(name) {
    let room = Game.rooms[name];
    if (!room) return `The chosen room is not one of ours.`
    if (!room.cache.spawnSchedules) return `Schedule for ${name} not found.`

    for (const spawnSchedule of room.cache.spawnSchedules) spawnSchedule.reset();
    return `${room.name}'s spawn schedule reset.`;
}
