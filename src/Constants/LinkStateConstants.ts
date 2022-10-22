export const BOTH = "both"
export const INPUT = "input"
export const OUTPUT = "output"

export type LinkState =
    typeof BOTH |
    typeof INPUT |
    typeof OUTPUT

export const LinkStates: LinkState[] = [
    BOTH,
    INPUT,
    OUTPUT
]
