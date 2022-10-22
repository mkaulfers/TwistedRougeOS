import { StampType, FAST_FILLER, EXTENSIONS, LABS, HUB, OBSERVER, TOWER, EXTENSION } from "Constants";
import { Utils } from "utils/Index";
export class Stamps {

    static plan(startPos: RoomPosition, stamp: StampType, plannedPositions: RoomPosition[], roadPositions: RoomPosition[], roomVisual?: RoomVisual) {
        let site: { xMod: number, yMod: number, structureType: BuildableStructureConstant }[]
        switch (stamp) {
            case FAST_FILLER:
                site = this.fastFiller; break
            case EXTENSIONS:
                site = this.extensions; break
            case LABS:
                site = this.labs; break
            case HUB:
                site = this.hub; break
            case OBSERVER:
                site = this.observer; break
            case TOWER:
                site = this.tower; break
            case EXTENSION:
                site = this.extension; break
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

            if (part.structureType == STRUCTURE_ROAD) {
                roadPositions.push(new RoomPosition(startPos.x + part.xMod, startPos.y + part.yMod, startPos.roomName))
            }
        }
    }

    static buildStructure(position: RoomPosition, structureType: StampType, omitting?: BuildableStructureConstant[]) {
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
    }

    static buildStructureRoads(room: Room) {
        let blueprint = room.memory.blueprint
        if (!blueprint) return
        for (let stamp of blueprint.stamps) {
            let pos = Utils.Utility.unpackPostionToRoom(stamp.stampPos, room.name)
            let stampType = stamp.type
            let stampParts = this.getStampParts(stampType)

            for (let part of stampParts) {
                if (part.structureType == STRUCTURE_ROAD) {
                    let placementPosition = new RoomPosition(pos.x + part.xMod, pos.y + part.yMod, pos.roomName)
                    placementPosition.createConstructionSite(part.structureType)
                }
            }
        }
    }

    static getStampParts(type: StampType): { xMod: number, yMod: number, structureType: BuildableStructureConstant }[] {
        switch (type) {
            case FAST_FILLER:
                return this.fastFiller
            case EXTENSIONS:
                return this.extensions
            case LABS:
                return this.labs
            case HUB:
                return this.hub
            case OBSERVER:
                return this.observer
            case TOWER:
                return this.tower
            case EXTENSION:
                return this.extension
        }
    }

    static getStampSize(type: StampType): number {
        switch (type) {
            case FAST_FILLER:
                return 5
            case EXTENSIONS:
                return 3
            case LABS:
                return 5
            case HUB:
                return 5
            case TOWER:
            case EXTENSION:
            case OBSERVER:
                return 1
        }
    }

    static containsPos(type: StampType, stampX: number, stampY: number, targetX: number, targetY: number): boolean {
        let stamp = this.getStampParts(type)
        for (let part of stamp) {
            if (stampX + part.xMod == targetX && stampY + part.yMod == targetY) {
                return true
            }
        }
        return false
    }

    static fastFiller: { xMod: number, yMod: number, structureType: BuildableStructureConstant }[] = [
        { xMod: -2, yMod: -3, structureType: STRUCTURE_ROAD },
        { xMod: -1, yMod: -3, structureType: STRUCTURE_ROAD },
        { xMod: 0, yMod: -3, structureType: STRUCTURE_ROAD },
        { xMod: 1, yMod: -3, structureType: STRUCTURE_ROAD },
        { xMod: 2, yMod: -3, structureType: STRUCTURE_ROAD },

        { xMod: -3, yMod: -2, structureType: STRUCTURE_ROAD },
        { xMod: -2, yMod: -2, structureType: STRUCTURE_EXTENSION },
        { xMod: -1, yMod: -2, structureType: STRUCTURE_EXTENSION },
        { xMod: 0, yMod: -2, structureType: STRUCTURE_SPAWN },
        { xMod: 0, yMod: -2, structureType: STRUCTURE_RAMPART },
        { xMod: 1, yMod: -2, structureType: STRUCTURE_EXTENSION },
        { xMod: 2, yMod: -2, structureType: STRUCTURE_EXTENSION },
        { xMod: 3, yMod: -2, structureType: STRUCTURE_ROAD },

        { xMod: -3, yMod: -1, structureType: STRUCTURE_ROAD },
        { xMod: -2, yMod: -1, structureType: STRUCTURE_EXTENSION },
        { xMod: 0, yMod: -1, structureType: STRUCTURE_EXTENSION },
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
        { xMod: 0, yMod: 1, structureType: STRUCTURE_EXTENSION },
        { xMod: 2, yMod: 1, structureType: STRUCTURE_EXTENSION },
        { xMod: 3, yMod: 1, structureType: STRUCTURE_ROAD },

        { xMod: -3, yMod: 2, structureType: STRUCTURE_ROAD },
        { xMod: -2, yMod: 2, structureType: STRUCTURE_EXTENSION },
        { xMod: -1, yMod: 2, structureType: STRUCTURE_EXTENSION },
        { xMod: 0, yMod: 2, structureType: STRUCTURE_SPAWN },
        { xMod: 0, yMod: 2, structureType: STRUCTURE_RAMPART },
        { xMod: 1, yMod: 2, structureType: STRUCTURE_EXTENSION },
        { xMod: 2, yMod: 2, structureType: STRUCTURE_EXTENSION },
        { xMod: 3, yMod: 2, structureType: STRUCTURE_ROAD },

        { xMod: -2, yMod: 3, structureType: STRUCTURE_ROAD },
        { xMod: -1, yMod: 3, structureType: STRUCTURE_ROAD },
        { xMod: 0, yMod: 3, structureType: STRUCTURE_ROAD },
        { xMod: 1, yMod: 3, structureType: STRUCTURE_ROAD },
        { xMod: 2, yMod: 3, structureType: STRUCTURE_ROAD }
    ]

    static extensions: { xMod: number, yMod: number, structureType: BuildableStructureConstant }[] = [
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

    static labs: { xMod: number, yMod: number, structureType: BuildableStructureConstant }[] = [
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

    static hub: { xMod: number, yMod: number, structureType: BuildableStructureConstant }[] = [
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
        { xMod: -1, yMod: 0, structureType: STRUCTURE_TERMINAL },
        { xMod: -1, yMod: 0, structureType: STRUCTURE_RAMPART },
        { xMod: 0, yMod: 0, structureType: STRUCTURE_ROAD },
        { xMod: 1, yMod: 0, structureType: STRUCTURE_LINK },
        { xMod: 1, yMod: 0, structureType: STRUCTURE_RAMPART },
        { xMod: 2, yMod: 0, structureType: STRUCTURE_ROAD },

        { xMod: -2, yMod: 1, structureType: STRUCTURE_ROAD },
        { xMod: -1, yMod: 1, structureType: STRUCTURE_STORAGE },
        { xMod: -1, yMod: 1, structureType: STRUCTURE_RAMPART },
        { xMod: 0, yMod: 1, structureType: STRUCTURE_SPAWN },
        { xMod: 0, yMod: 1, structureType: STRUCTURE_RAMPART },
        { xMod: 1, yMod: 1, structureType: STRUCTURE_ROAD },

        { xMod: -1, yMod: 2, structureType: STRUCTURE_ROAD },
        { xMod: 0, yMod: 2, structureType: STRUCTURE_ROAD },
    ]

    static tower: { xMod: number, yMod: number, structureType: BuildableStructureConstant }[] = [

        { xMod: 0, yMod: -1, structureType: STRUCTURE_ROAD },

        { xMod: -1, yMod: 0, structureType: STRUCTURE_ROAD },
        { xMod: 0, yMod: 0, structureType: STRUCTURE_TOWER },
        { xMod: 0, yMod: 0, structureType: STRUCTURE_RAMPART },
        { xMod: 1, yMod: 0, structureType: STRUCTURE_ROAD },

        { xMod: 0, yMod: 1, structureType: STRUCTURE_ROAD },
    ]

    static extension: { xMod: number, yMod: number, structureType: BuildableStructureConstant }[] = [
        { xMod: 0, yMod: -1, structureType: STRUCTURE_ROAD },
        { xMod: -1, yMod: 0, structureType: STRUCTURE_ROAD },
        { xMod: 0, yMod: 0, structureType: STRUCTURE_EXTENSION },
        { xMod: 1, yMod: 0, structureType: STRUCTURE_ROAD },
        { xMod: 0, yMod: 1, structureType: STRUCTURE_ROAD },
    ]

    static observer: { xMod: number, yMod: number, structureType: BuildableStructureConstant }[] = [
        { xMod: 0, yMod: -1, structureType: STRUCTURE_ROAD },
        { xMod: -1, yMod: 0, structureType: STRUCTURE_ROAD },
        { xMod: 0, yMod: 0, structureType: STRUCTURE_OBSERVER },
        { xMod: 1, yMod: 0, structureType: STRUCTURE_ROAD },
        { xMod: 0, yMod: 1, structureType: STRUCTURE_ROAD }
    ]
}
