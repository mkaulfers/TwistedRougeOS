import { StampType } from "utils/Enums";

export const Stamp = {
    build: function (startPos: RoomPosition, stamp: StampType, visualizedPositions?: RoomPosition[], roomVisual?: RoomVisual) {
        let site: { xMod: number, yMod: number, structureType: BuildableStructureConstant }[]
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
        if (visualizedPositions && roomVisual) {
            for (let s of site) {
                if (visualizedPositions.find(p => p.x == startPos.x + s.xMod && p.y == startPos.y + s.yMod)) continue
                if (room.lookForAt(LOOK_TERRAIN, startPos.x + s.xMod, startPos.y + s.yMod).find(t => t == 'wall')) continue
                if (s.structureType != STRUCTURE_ROAD) {
                    visualizedPositions.push(new RoomPosition(startPos.x + s.xMod, startPos.y + s.yMod, room.name))
                }
                roomVisual.structure(startPos.x + s.xMod, startPos.y + s.yMod, s.structureType)
            }
        } else {
            for (let s of site) {
                room.createConstructionSite(startPos.x + s.xMod, startPos.y + s.yMod, s.structureType);
            }
        }
    },
    getStampSize(type: StampType): number {
        switch (type) {
            case StampType.FAST_FILLER:
                return 5
            case StampType.EXTENSIONS:
                return 3
            case StampType.LABS:
                return 4
            case StampType.ANCHOR:
                return 3
        }
    },
    getStamp(type: StampType): { xMod: number, yMod: number, structureType: BuildableStructureConstant }[] {
        switch (type) {
            case StampType.FAST_FILLER:
                return fastFiller
            case StampType.EXTENSIONS:
                return extensions
            case StampType.LABS:
                return labs
            case StampType.ANCHOR:
                return anchor
        }
    }
}

const fastFiller: { xMod: number, yMod: number, structureType: BuildableStructureConstant }[] = [
    { xMod: -2, yMod: -3, structureType: STRUCTURE_ROAD },
    { xMod: -1, yMod: -3, structureType: STRUCTURE_ROAD },
    { xMod: 0, yMod: -3, structureType: STRUCTURE_ROAD },
    { xMod: 1, yMod: -3, structureType: STRUCTURE_ROAD },
    { xMod: 2, yMod: -3, structureType: STRUCTURE_ROAD },

    { xMod: -3, yMod: -2, structureType: STRUCTURE_ROAD },
    { xMod: -2, yMod: -2, structureType: STRUCTURE_EXTENSION },
    { xMod: -1, yMod: -2, structureType: STRUCTURE_EXTENSION },
    { xMod: 1, yMod: -2, structureType: STRUCTURE_EXTENSION },
    { xMod: 2, yMod: -2, structureType: STRUCTURE_EXTENSION },
    { xMod: 3, yMod: -2, structureType: STRUCTURE_ROAD },

    { xMod: -3, yMod: -1, structureType: STRUCTURE_ROAD },
    { xMod: -2, yMod: -1, structureType: STRUCTURE_EXTENSION },
    { xMod: 0, yMod: -1, structureType: STRUCTURE_SPAWN },
    { xMod: 2, yMod: -1, structureType: STRUCTURE_EXTENSION },
    { xMod: 3, yMod: -1, structureType: STRUCTURE_ROAD },

    { xMod: -3, yMod: 0, structureType: STRUCTURE_ROAD },
    { xMod: -2, yMod: 0, structureType: STRUCTURE_CONTAINER },
    { xMod: -1, yMod: 0, structureType: STRUCTURE_EXTENSION },
    { xMod: 0, yMod: 0, structureType: STRUCTURE_LINK },
    { xMod: 1, yMod: 0, structureType: STRUCTURE_EXTENSION },
    { xMod: 2, yMod: 0, structureType: STRUCTURE_CONTAINER },
    { xMod: 3, yMod: 0, structureType: STRUCTURE_ROAD },

    { xMod: -3, yMod: 1, structureType: STRUCTURE_ROAD },
    { xMod: -2, yMod: 1, structureType: STRUCTURE_EXTENSION },
    { xMod: 0, yMod: 1, structureType: STRUCTURE_SPAWN },
    { xMod: 2, yMod: 1, structureType: STRUCTURE_EXTENSION },
    { xMod: 3, yMod: 1, structureType: STRUCTURE_ROAD },

    { xMod: -3, yMod: 2, structureType: STRUCTURE_ROAD },
    { xMod: -2, yMod: 2, structureType: STRUCTURE_EXTENSION },
    { xMod: -1, yMod: 2, structureType: STRUCTURE_EXTENSION },
    { xMod: 1, yMod: 2, structureType: STRUCTURE_EXTENSION },
    { xMod: 2, yMod: 2, structureType: STRUCTURE_EXTENSION },
    { xMod: 3, yMod: 2, structureType: STRUCTURE_ROAD },

    { xMod: -2, yMod: 3, structureType: STRUCTURE_ROAD },
    { xMod: -1, yMod: 3, structureType: STRUCTURE_ROAD },
    { xMod: 0, yMod: 3, structureType: STRUCTURE_ROAD },
    { xMod: 1, yMod: 3, structureType: STRUCTURE_ROAD },
    { xMod: 2, yMod: 3, structureType: STRUCTURE_ROAD }
]

const extensions: { xMod: number, yMod: number, structureType: BuildableStructureConstant }[] = [
    { xMod: 0, yMod: -2, structureType: STRUCTURE_ROAD },
    { xMod: -1, yMod: -1, structureType: STRUCTURE_ROAD },
    { xMod: 0, yMod: -1, structureType: STRUCTURE_EXTENSION },
    { xMod: 1, yMod: -1, structureType: STRUCTURE_ROAD },
    { xMod: -2, yMod: 0, structureType: STRUCTURE_ROAD },
    { xMod: -1, yMod: 0, structureType: STRUCTURE_EXTENSION },
    { xMod: 0, yMod: 0, structureType: STRUCTURE_EXTENSION },
    { xMod: 1, yMod: 0, structureType: STRUCTURE_EXTENSION },
    { xMod: 2, yMod: 0, structureType: STRUCTURE_ROAD },
    { xMod: -1, yMod: 1, structureType: STRUCTURE_ROAD },
    { xMod: 0, yMod: 1, structureType: STRUCTURE_EXTENSION },
    { xMod: 1, yMod: 1, structureType: STRUCTURE_ROAD },
    { xMod: 0, yMod: 2, structureType: STRUCTURE_ROAD }
]

const labs: { xMod: number, yMod: number, structureType: BuildableStructureConstant }[] = [
    { xMod: 0, yMod: -1, structureType: STRUCTURE_LAB },
    { xMod: 1, yMod: -1, structureType: STRUCTURE_LAB },
    { xMod: 2, yMod: -1, structureType: STRUCTURE_ROAD },

    { xMod: -1, yMod: 0, structureType: STRUCTURE_LAB },
    { xMod: 0, yMod: 0, structureType: STRUCTURE_LAB },
    { xMod: 1, yMod: 0, structureType: STRUCTURE_ROAD },
    { xMod: 2, yMod: 0, structureType: STRUCTURE_LAB },

    { xMod: -1, yMod: 1, structureType: STRUCTURE_LAB },
    { xMod: 0, yMod: 1, structureType: STRUCTURE_ROAD },
    { xMod: 1, yMod: 1, structureType: STRUCTURE_LAB },
    { xMod: 2, yMod: 1, structureType: STRUCTURE_LAB },

    { xMod: -1, yMod: 2, structureType: STRUCTURE_ROAD },
    { xMod: 0, yMod: 2, structureType: STRUCTURE_LAB },
    { xMod: 1, yMod: 2, structureType: STRUCTURE_LAB }
]

const anchor: { xMod: number, yMod: number, structureType: BuildableStructureConstant }[] = [
    { xMod: -1, yMod: -1, structureType: STRUCTURE_FACTORY },
    { xMod: 0, yMod: -1, structureType: STRUCTURE_NUKER },
    { xMod: 1, yMod: -1, structureType: STRUCTURE_POWER_SPAWN },
    { xMod: -1, yMod: 0, structureType: STRUCTURE_STORAGE },
    { xMod: 0, yMod: 0, structureType: STRUCTURE_ROAD },
    { xMod: 1, yMod: 0, structureType: STRUCTURE_LINK },
    { xMod: -1, yMod: 1, structureType: STRUCTURE_TERMINAL },
    { xMod: 0, yMod: 1, structureType: STRUCTURE_SPAWN },
    { xMod: 1, yMod: 1, structureType: STRUCTURE_ROAD }
]
