import { Coord } from "screeps-cartographer/dist/utils/packrat"

export class MineralDetail {
    id: string
    mineralType: MineralConstant
    pos: Coord

    constructor(id: string, mineralType: MineralConstant, pos: Coord) {
        this.id = id
        this.mineralType = mineralType
        this.pos = pos
    }
}
