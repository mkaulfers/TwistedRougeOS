import { StampType } from "utils/Enums";

export const Stamp = {
    build: function(startPos: RoomPosition, stamp: StampType, visualize = false): RoomPosition[] {
        let site: {xMod: number, yMod: number, structureType: BuildableStructureConstant}[]
        switch (stamp) {
            case StampType.FAST_FILLER:
                site = fastFiller; break
            case StampType.EXTENSIONS:
                site = extensions; break
            case StampType.LABS:
                site = labs; break
            case StampType.ANCHOR:
                site = anchor; break
        }

        let room = Game.rooms[startPos.roomName]
        let positions: RoomPosition[] = []
        if (visualize) {
            let positions: RoomPosition[] = []
            for (let s of site) {
                let roomVisual = new RoomVisual(room.name)
                roomVisual.structure(startPos.x + s.xMod, startPos.y + s.yMod, s.structureType)
                positions.push(new RoomPosition(startPos.x + s.xMod, startPos.y + s.yMod, room.name))
            }
            return positions
        } else {
            for (let s of site) {
                room.createConstructionSite(startPos.x + s.xMod, startPos.y + s.yMod, s.structureType);
            }
        }
        return positions
    }
}

const fastFiller: {xMod: number, yMod: number, structureType: BuildableStructureConstant}[] = [
    {xMod: -2, yMod: -2, structureType: STRUCTURE_EXTENSION},
    {xMod: -1, yMod: -2, structureType: STRUCTURE_EXTENSION},
    {xMod: 0, yMod: -2, structureType: STRUCTURE_ROAD},
    {xMod: 1, yMod: -2, structureType: STRUCTURE_EXTENSION},
    {xMod: 2, yMod: -2, structureType: STRUCTURE_EXTENSION},
    {xMod: -2, yMod: -1, structureType: STRUCTURE_EXTENSION},
    {xMod: -1, yMod: -1, structureType: STRUCTURE_ROAD},
    {xMod: 0, yMod: -1, structureType: STRUCTURE_EXTENSION},
    {xMod: 1, yMod: -1, structureType: STRUCTURE_ROAD},
    {xMod: 2, yMod: -1, structureType: STRUCTURE_EXTENSION},
    {xMod: -2, yMod: 0, structureType: STRUCTURE_ROAD},
    {xMod: -2, yMod: 0, structureType: STRUCTURE_CONTAINER},
    {xMod: -1, yMod: 0, structureType: STRUCTURE_EXTENSION},
    {xMod: 0, yMod: 0, structureType: STRUCTURE_LINK},
    {xMod: 1, yMod: 0, structureType: STRUCTURE_EXTENSION},
    {xMod: 2, yMod: 0, structureType: STRUCTURE_CONTAINER},
    {xMod: 2, yMod: 0, structureType: STRUCTURE_ROAD},
    {xMod: -2, yMod: 1, structureType: STRUCTURE_EXTENSION},
    {xMod: -1, yMod: 1, structureType: STRUCTURE_ROAD},
    {xMod: 0, yMod: 1, structureType: STRUCTURE_EXTENSION},
    {xMod: 1, yMod: 1, structureType: STRUCTURE_ROAD},
    {xMod: 2, yMod: 1, structureType: STRUCTURE_EXTENSION},
    {xMod: -2, yMod: 2, structureType: STRUCTURE_EXTENSION},
    {xMod: -1, yMod: 2, structureType: STRUCTURE_EXTENSION},
    {xMod: 0, yMod: 2, structureType: STRUCTURE_ROAD},
    {xMod: 1, yMod: 2, structureType: STRUCTURE_EXTENSION},
    {xMod: 2, yMod: 2, structureType: STRUCTURE_EXTENSION}
]

const extensions: {xMod: number, yMod: number, structureType: BuildableStructureConstant}[] = [
    {xMod: 0, yMod: -2, structureType: STRUCTURE_ROAD},
    {xMod: -1, yMod: -1, structureType: STRUCTURE_ROAD},
    {xMod: 0, yMod: -1, structureType: STRUCTURE_EXTENSION},
    {xMod: 1, yMod: -1, structureType: STRUCTURE_ROAD},
    {xMod: -2, yMod: 0, structureType: STRUCTURE_ROAD},
    {xMod: -1, yMod: 0, structureType: STRUCTURE_EXTENSION},
    {xMod: 0, yMod: 0, structureType: STRUCTURE_EXTENSION},
    {xMod: 1, yMod: 0, structureType: STRUCTURE_EXTENSION},
    {xMod: 2, yMod: 0, structureType: STRUCTURE_ROAD},
    {xMod: -1, yMod: 1, structureType: STRUCTURE_ROAD},
    {xMod: 0, yMod: 1, structureType: STRUCTURE_EXTENSION},
    {xMod: 1, yMod: 1, structureType: STRUCTURE_ROAD},
    {xMod: 0, yMod: 2, structureType: STRUCTURE_ROAD}
]

const labs: {xMod: number, yMod: number, structureType: BuildableStructureConstant}[] = [
    {xMod: 1, yMod: 0, structureType: STRUCTURE_LAB},
    {xMod: 2, yMod: 0, structureType: STRUCTURE_LAB},
    {xMod: 3, yMod: 0, structureType: STRUCTURE_ROAD},
    {xMod: 0, yMod: 1, structureType: STRUCTURE_LAB},
    {xMod: 1, yMod: 1, structureType: STRUCTURE_LAB},
    {xMod: 2, yMod: 1, structureType: STRUCTURE_ROAD},
    {xMod: 3, yMod: 1, structureType: STRUCTURE_LAB},
    {xMod: 0, yMod: 2, structureType: STRUCTURE_LAB},
    {xMod: 1, yMod: 2, structureType: STRUCTURE_ROAD},
    {xMod: 2, yMod: 2, structureType: STRUCTURE_LAB},
    {xMod: 3, yMod: 2, structureType: STRUCTURE_LAB},
    {xMod: 0, yMod: 3, structureType: STRUCTURE_ROAD},
    {xMod: 1, yMod: 3, structureType: STRUCTURE_LAB},
    {xMod: 2, yMod: 3, structureType: STRUCTURE_LAB}
]

const anchor: {xMod: number, yMod: number, structureType: BuildableStructureConstant}[] = [
    {xMod: -1, yMod: -1, structureType: STRUCTURE_FACTORY},
    {xMod: 0, yMod: -1, structureType: STRUCTURE_NUKER},
    {xMod: 1, yMod: -1, structureType: STRUCTURE_POWER_SPAWN},
    {xMod: -1, yMod: 0, structureType: STRUCTURE_STORAGE},
    {xMod: 0, yMod: 0, structureType: STRUCTURE_ROAD},
    {xMod: 1, yMod: 0, structureType: STRUCTURE_LINK},
    {xMod: -1, yMod: 1, structureType: STRUCTURE_TERMINAL},
    {xMod: 0, yMod: 1, structureType: STRUCTURE_SPAWN},
    {xMod: 1, yMod: 1, structureType: STRUCTURE_ROAD}
]
