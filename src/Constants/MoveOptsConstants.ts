import { MoveOpts } from "screeps-cartographer";
import { Utils } from "../utils/Index";

export const MOVE_OPTS_DEFAULT: MoveOpts = {
    visualizePathStyle: {
        fill: 'transparent',
        stroke: '#fff',
        lineStyle: 'dashed',
        strokeWidth: .15,
        opacity: .2
    },
};

export const MOVE_OPTS_DEFAULT_FALLBACK: MoveOpts = {
    visualizePathStyle: {
        fill: 'transparent',
        stroke: '#f00',
        lineStyle: 'dashed',
        strokeWidth: .15,
        opacity: .2
    },
    avoidCreeps: true,
};

export const MOVE_OPTS_CIVILIAN: MoveOpts = {
    ...MOVE_OPTS_DEFAULT,
    avoidSourceKeepers: true,
    routeCallback: (roomName: string, fromRoomName: string) => {
        return Utils.Utility.checkRoomSafety(roomName);
    },
    roomCallback(roomName) {
        return Utils.Utility.genPathfindingCM(roomName);
    },
};

export const MOVE_OPTS_CIVILIAN_FALLBACK: MoveOpts = {
    ...MOVE_OPTS_CIVILIAN,
    ...MOVE_OPTS_DEFAULT_FALLBACK,
};

export const MOVE_OPTS_AGENT: MoveOpts = {
    ...MOVE_OPTS_CIVILIAN,
    routeCallback: (roomName: string, fromRoomName: string) => {
        let result = Utils.Utility.checkRoomSafety(roomName);
        if (result === Infinity) return 254;
        return result;
    },
}

export const MOVE_OPTS_AGENT_FALLBACK: MoveOpts = {
    ...MOVE_OPTS_CIVILIAN_FALLBACK,
    routeCallback: (roomName: string, fromRoomName: string) => {
        let result = Utils.Utility.checkRoomSafety(roomName);
        if (result === Infinity) return 254;
        return result;
    },
}

export const Pathing = [
    MOVE_OPTS_DEFAULT,
    MOVE_OPTS_DEFAULT_FALLBACK,
    MOVE_OPTS_CIVILIAN,
    MOVE_OPTS_CIVILIAN_FALLBACK,
]
