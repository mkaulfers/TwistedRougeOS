import { Coord } from "screeps-cartographer/dist/utils/packrat"
export class MineralDetail {
    id: Id<Mineral>
    mineralType: MineralConstant
    pos: Coord

    constructor(id: Id<Mineral>, mineralType: MineralConstant, pos: Coord) {
        this.id = id
        this.mineralType = mineralType
        this.pos = pos
    }
}

export class SourceDetail {
    packedPos: number;
    posCount: number;

    constructor(packedPos: number, posCount: number) {
        this.packedPos = packedPos;
        this.posCount = posCount;
    }
}
