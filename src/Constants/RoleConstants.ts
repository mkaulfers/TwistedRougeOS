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
export const nRESERVER = "nReserver"

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
    typeof nTRUCKER |
    typeof nRESERVER

export const Roles: Role[] = [
    HARVESTER,
    TRUCKER,
    AGENT,
    ANCHOR,
    FILLER,
    ENGINEER,
    SCIENTIST,
    nHARVESTER,
    nTRUCKER,
    nENGINEER,
    nRESERVER,
]
