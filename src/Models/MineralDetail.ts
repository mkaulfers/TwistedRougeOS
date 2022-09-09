
export class MineralDetail {
    id: string
    mineralType: MineralConstant

    constructor(id: string, mineralType: MineralConstant) {
        this.id = id
        this.mineralType = mineralType
    }
}
