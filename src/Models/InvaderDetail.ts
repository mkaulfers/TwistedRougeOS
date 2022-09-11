import { StorageDetail } from "./PlayerDetail"

export class InvaderDetail {
    coreId?: string
    containers?: StorageDetail[]

    constructor(coreId?: string,
        containers?: StorageDetail[]) {
        this.coreId = coreId
        this.containers = containers
    }
}
