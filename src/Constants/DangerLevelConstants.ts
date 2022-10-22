export const PEACEFUL = 0
export const INVADERS = 1
export const WARY = 2
export const DANGER = 3
export const DEATH = 4

export type DangerLevel =
    typeof PEACEFUL |
    typeof INVADERS |
    typeof WARY |
    typeof DANGER |
    typeof DEATH

export const DangerLevels: DangerLevel[] = [
    PEACEFUL,
    INVADERS,
    WARY,
    DANGER,
    DEATH
]
