export const AGENT = "agent"
export const ANCHOR = "anchor"
export const ENGINEER = "engineer"
export const FILLER = "filler"
export const HARVESTER = "harvester"
export const SCIENTIST = "scientist"
export const TRUCKER = "trucker"
export const nENGINEER = "nEngineer"
export const nHARVESTER = "nHarvester"
export const nTRUCKER = "nTrucker"

export type Role =
    typeof AGENT |
    typeof ANCHOR |
    typeof ENGINEER |
    typeof FILLER |
    typeof HARVESTER |
    typeof SCIENTIST |
    typeof TRUCKER |
    typeof nENGINEER |
    typeof nHARVESTER |
    typeof nTRUCKER

export const Roles: Role[] = [
    AGENT,
    ANCHOR,
    ENGINEER,
    FILLER,
    HARVESTER,
    SCIENTIST,
    TRUCKER,
    nENGINEER,
    nHARVESTER,
    nTRUCKER
]