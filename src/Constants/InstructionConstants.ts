export const HARVEST = "harvest"
export const BUILD = "build"
export const REPAIR = "repair"
export const UPGRADE = "upgrade"
export const TRANSFER = "transfer"
export const PICKUP = "pickup"
export const WITHDRAW = "withdraw"
export const ATTACK = "attack"
export const RANGED_ATTACK = "ranged_attack"
export const HEAL = "heal"
export const DISMANTLE = "dismantle"
export const CLAIM = "claim"

export type Instruction =
    typeof HARVEST |
    typeof BUILD |
    typeof REPAIR |
    typeof UPGRADE |
    typeof TRANSFER |
    typeof PICKUP |
    typeof WITHDRAW |
    typeof ATTACK |
    typeof RANGED_ATTACK |
    typeof HEAL |
    typeof DISMANTLE |
    typeof CLAIM

export const Instruction = {
    HARVEST,
    BUILD,
    REPAIR,
    UPGRADE,
    TRANSFER,
    PICKUP,
    WITHDRAW,
    ATTACK,
    RANGED_ATTACK,
    HEAL,
    DISMANTLE,
    CLAIM
}

export const Instructions: Instruction[] = [
    HARVEST,
    BUILD,
    REPAIR,
    UPGRADE,
    TRANSFER,
    PICKUP,
    WITHDRAW,
    ATTACK,
    RANGED_ATTACK,
    HEAL,
    DISMANTLE,
    CLAIM
]

