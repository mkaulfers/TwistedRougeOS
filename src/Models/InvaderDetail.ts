import { StorageDetails } from "./PlayerDetail"

export class InvaderDetail {
    coreId?: string
    containers?: StorageDetails[]

    constructor(coreId?: string,
        containers?: StorageDetails[]) {
        this.coreId = coreId
        this.containers = containers
    }
}
