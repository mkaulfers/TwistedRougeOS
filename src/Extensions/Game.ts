import { TRACE } from 'Constants/LogConstants';
import { Utils } from 'utils/Index';

export default class Game_Extended {

    _myRooms: { [roomName: string]: Room } | undefined
    get myRooms(): { [roomName: string]: Room } {
        Utils.Logger.log("Controller -> myRooms", TRACE);
        if (!this._myRooms) {
            this._myRooms = {};
            for (const roomName in Game.rooms) {
                if (Game.rooms[roomName].my === true) this._myRooms[roomName] = Game.rooms[roomName];
            }
        }
        return this._myRooms;
    }
}
