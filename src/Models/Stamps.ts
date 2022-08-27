import { LogLevel, StampType } from "utils/Enums";
import { Utils } from "utils/Index";
import { Logger } from "utils/Logger";

export const Stamp = {
    plan: function (startPos: RoomPosition, stamp: StampType, plannedPositions: RoomPosition[], roomVisual?: RoomVisual) {
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
            case StampType.TOWER:
                site = tower; break
            case StampType.EXTENSION:
                site = extension; break
        }

        let room = Game.rooms[startPos.roomName]

        for (let part of site) {
            if (room.lookForAt(LOOK_TERRAIN, startPos.x + part.xMod, startPos.y + part.yMod).find(t => t == 'wall')) continue

            if (roomVisual) {
                let shouldOpacity = part.structureType == STRUCTURE_RAMPART
                roomVisual.structure(startPos.x + part.xMod, startPos.y + part.yMod, part.structureType, shouldOpacity ? { opacity: 0.3 } : { opacity: 1 })
            }

            if (part.structureType != STRUCTURE_ROAD) {
                plannedPositions.push(new RoomPosition(startPos.x + part.xMod, startPos.y + part.yMod, startPos.roomName))
            }
        }
    },
    buildStructure(position: RoomPosition, structureType: StampType, omitting?: BuildableStructureConstant[]) {
        let room = Game.rooms[position.roomName]
        let stamp = this.getStampParts(structureType)
        for (let part of stamp) {
            let placementPosition = new RoomPosition(position.x + part.xMod, position.y + part.yMod, position.roomName)
            if (omitting) {
                if (omitting.indexOf(part.structureType) == -1) {
                    placementPosition.createConstructionSite(part.structureType)
                }
            } else {
                let placementPosition = new RoomPosition(position.x + part.xMod, position.y + part.yMod, position.roomName)
                placementPosition.createConstructionSite(part.structureType)
            }
        }
    },
    buildStructureRoads(room: Room) {
        let blueprint = room.memory.blueprint
        for (let stamp of blueprint.stamps) {
            let pos = Utils.Utility.unpackPostionToRoom(stamp.stampPos, room.name)
            let stampType = stamp.type as StampType
            let stampParts = this.getStampParts(stampType)

            for (let part of stampParts) {
                if (part.structureType == STRUCTURE_ROAD) {
                    let placementPosition = new RoomPosition(pos.x + part.xMod, pos.y + part.yMod, pos.roomName)
                    placementPosition.createConstructionSite(part.structureType)
                }
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
                return 5
            case StampType.ANCHOR:
                return 5
            case StampType.TOWER:
            case StampType.EXTENSION:
                return 1
        }
    },
    getStampParts(type: StampType): { xMod: number, yMod: number, structureType: BuildableStructureConstant }[] {
        switch (type) {
            case StampType.FAST_FILLER:
                return fastFiller
            case StampType.EXTENSIONS:
                return extensions
            case StampType.LABS:
                return labs
            case StampType.ANCHOR:
                return anchor
            case StampType.TOWER:
                return tower
            case StampType.EXTENSION:
                return extension
        }
    },
    containsPos(type: StampType, stampX: number, stampY: number, targetX: number, targetY: number): boolean {
        let stamp = Stamp.getStampParts(type)
        for (let part of stamp) {
            if (stampX + part.xMod == targetX && stampY + part.yMod == targetY) {
                return true
            }
        }
        return false
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
    { xMod: 0, yMod: -1, structureType: STRUCTURE_RAMPART },
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
    { xMod: 0, yMod: 1, structureType: STRUCTURE_RAMPART },
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
    { xMod: 0, yMod: -2, structureType: STRUCTURE_ROAD },
    { xMod: 1, yMod: -2, structureType: STRUCTURE_ROAD },

    { xMod: -1, yMod: -1, structureType: STRUCTURE_ROAD },
    { xMod: 0, yMod: -1, structureType: STRUCTURE_LAB },
    { xMod: 1, yMod: -1, structureType: STRUCTURE_LAB },
    { xMod: 2, yMod: -1, structureType: STRUCTURE_ROAD },

    { xMod: -2, yMod: 0, structureType: STRUCTURE_ROAD },
    { xMod: -1, yMod: 0, structureType: STRUCTURE_LAB },
    { xMod: 0, yMod: 0, structureType: STRUCTURE_LAB },
    { xMod: 1, yMod: 0, structureType: STRUCTURE_ROAD },
    { xMod: 2, yMod: 0, structureType: STRUCTURE_LAB },
    { xMod: 3, yMod: 0, structureType: STRUCTURE_ROAD },

    { xMod: -2, yMod: 1, structureType: STRUCTURE_ROAD },
    { xMod: -1, yMod: 1, structureType: STRUCTURE_LAB },
    { xMod: 0, yMod: 1, structureType: STRUCTURE_ROAD },
    { xMod: 1, yMod: 1, structureType: STRUCTURE_LAB },
    { xMod: 2, yMod: 1, structureType: STRUCTURE_LAB },
    { xMod: 3, yMod: 1, structureType: STRUCTURE_ROAD },

    { xMod: -1, yMod: 2, structureType: STRUCTURE_ROAD },
    { xMod: 0, yMod: 2, structureType: STRUCTURE_LAB },
    { xMod: 1, yMod: 2, structureType: STRUCTURE_LAB },
    { xMod: 2, yMod: 2, structureType: STRUCTURE_ROAD },

    { xMod: 0, yMod: 3, structureType: STRUCTURE_ROAD },
    { xMod: 1, yMod: 3, structureType: STRUCTURE_ROAD },
]

const anchor: { xMod: number, yMod: number, structureType: BuildableStructureConstant }[] = [
    { xMod: -1, yMod: -2, structureType: STRUCTURE_ROAD },
    { xMod: 0, yMod: -2, structureType: STRUCTURE_ROAD },
    { xMod: 1, yMod: -2, structureType: STRUCTURE_ROAD },

    { xMod: -2, yMod: -1, structureType: STRUCTURE_ROAD },
    { xMod: -1, yMod: -1, structureType: STRUCTURE_FACTORY },
    { xMod: -1, yMod: -1, structureType: STRUCTURE_RAMPART },
    { xMod: 0, yMod: -1, structureType: STRUCTURE_NUKER },
    { xMod: 0, yMod: -1, structureType: STRUCTURE_RAMPART },
    { xMod: 1, yMod: -1, structureType: STRUCTURE_POWER_SPAWN },
    { xMod: 1, yMod: -1, structureType: STRUCTURE_RAMPART },
    { xMod: 2, yMod: -1, structureType: STRUCTURE_ROAD },

    { xMod: -2, yMod: 0, structureType: STRUCTURE_ROAD },
    { xMod: -1, yMod: 0, structureType: STRUCTURE_STORAGE },
    { xMod: -1, yMod: 0, structureType: STRUCTURE_RAMPART },
    { xMod: 0, yMod: 0, structureType: STRUCTURE_ROAD },
    { xMod: 1, yMod: 0, structureType: STRUCTURE_LINK },
    { xMod: 1, yMod: 0, structureType: STRUCTURE_RAMPART },
    { xMod: 2, yMod: 0, structureType: STRUCTURE_ROAD },

    { xMod: -2, yMod: 1, structureType: STRUCTURE_ROAD },
    { xMod: -1, yMod: 1, structureType: STRUCTURE_TERMINAL },
    { xMod: -1, yMod: 1, structureType: STRUCTURE_RAMPART },
    { xMod: 0, yMod: 1, structureType: STRUCTURE_SPAWN },
    { xMod: 0, yMod: 1, structureType: STRUCTURE_RAMPART },
    { xMod: 1, yMod: 1, structureType: STRUCTURE_ROAD },

    { xMod: -1, yMod: 2, structureType: STRUCTURE_ROAD },
    { xMod: 0, yMod: 2, structureType: STRUCTURE_ROAD },
]

const tower: { xMod: number, yMod: number, structureType: BuildableStructureConstant }[] = [

    { xMod: 0, yMod: -1, structureType: STRUCTURE_ROAD },

    { xMod: -1, yMod: 0, structureType: STRUCTURE_ROAD },
    { xMod: 0, yMod: 0, structureType: STRUCTURE_TOWER },
    { xMod: 0, yMod: 0, structureType: STRUCTURE_RAMPART },
    { xMod: 1, yMod: 0, structureType: STRUCTURE_ROAD },

    { xMod: 0, yMod: 1, structureType: STRUCTURE_ROAD },
]

const extension: { xMod: number, yMod: number, structureType: BuildableStructureConstant }[] = [
    { xMod: 0, yMod: -1, structureType: STRUCTURE_ROAD },
    { xMod: -1, yMod: 0, structureType: STRUCTURE_ROAD },
    { xMod: 0, yMod: 0, structureType: STRUCTURE_EXTENSION },
    { xMod: 1, yMod: 0, structureType: STRUCTURE_ROAD },
    { xMod: 0, yMod: 1, structureType: STRUCTURE_ROAD },
]

export const Stamps = {
    fast_filler: fastFiller,
    extensions: extensions,
    labs: labs,
    anchor: anchor
}
