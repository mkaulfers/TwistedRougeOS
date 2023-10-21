import { Role } from "Constants/RoleConstants"
import Utility from "utils/Utilities"

export default class SpawnOrder {
    body: BodyPartConstant[]
    role: Role
    spawnTime: number

    private _cost: number | undefined
    get cost(): number {
        if (this._cost == undefined) {
            this._cost = Utility.bodyCost(this.body)
        }
        return this._cost
    }

    private _name: string | undefined
    get name(): string {
        if (this._name == undefined) {
            this._name = this.role.slice(0, 4) + "_" + Game.time.toString().slice(-3)
        }
        return this._name
    }

    constructor(
        body: BodyPartConstant[],
        role: Role,
    ) {
        this.body = body
        this.role = role
        this.spawnTime = body.length * CREEP_SPAWN_TIME
    }
}
