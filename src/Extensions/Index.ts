import './RoomVisuals';
import Controller_Extended from './Controller';
import Creep_Extended from './Creep';
import Room_Extended from './Room';
import RoomVisuals_Extended from './RoomVisuals';
import Source_Extended from './Source';
import Mineral_Extended from './Mineral';
import Tower_Extended from './Tower';
import Terminal_Extended from './Terminal';
import RoomPosition_Extended from './RoomPosition';
import Game_Extended from './Game';

import Utility from 'utils/Utilities';

declare global {
    var Game_Extended: Game_Extended;
}

export default function prototypeExtender(): void {
    global.Game_Extended = new Game_Extended();
    Utility.extendClass(StructureController, Controller_Extended);
    Utility.extendClass(Creep, Creep_Extended);
    Utility.extendClass(Room, Room_Extended);
    Utility.extendClass(RoomVisual, RoomVisuals_Extended);
    Utility.extendClass(Source, Source_Extended);
    Utility.extendClass(Mineral, Mineral_Extended);
    Utility.extendClass(StructureTower, Tower_Extended);
    Utility.extendClass(StructureTerminal, Terminal_Extended);
    Utility.extendClass(RoomPosition, RoomPosition_Extended);
}
