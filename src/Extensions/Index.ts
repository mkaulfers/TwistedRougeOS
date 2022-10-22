import './RoomVisuals';
import Controller_Extended from './Controller';
import Creep_Extended from './Creep';
import Room_Extended from './Room';
import RoomVisuals_Extended from './RoomVisuals';
import Source_Extended from './Source';
import Tower_Extended from './Tower';
import Terminal_Extended from './Terminal';
import { Utility } from 'utils/Utilities';

export default function prototypeExtender(): void {
    Utility.extendClass(StructureController, Controller_Extended);
    Utility.extendClass(Creep, Creep_Extended);
    Utility.extendClass(Room, Room_Extended);
    Utility.extendClass(RoomVisual, RoomVisuals_Extended);
    Utility.extendClass(Source, Source_Extended);
    Utility.extendClass(StructureTower, Tower_Extended);
    Utility.extendClass(StructureTerminal, Terminal_Extended);
}
