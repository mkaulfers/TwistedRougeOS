export const EXTENSION = "ext_single"
export const EXTENSIONS = "extensions"
export const FAST_FILLER = "fast_filler"
export const HUB = "hub"
export const LABS = "labs"
export const OBSERVER = "observer"
export const TOWER = "tower_single"

export type StampType =
    typeof EXTENSION |
    typeof EXTENSIONS |
    typeof FAST_FILLER |
    typeof HUB |
    typeof LABS |
    typeof OBSERVER |
    typeof TOWER

export const StampTypes: StampType[] = [
    EXTENSION,
    EXTENSIONS,
    FAST_FILLER,
    HUB,
    LABS,
    OBSERVER,
    TOWER
]
