export class RemoteSite {
    roomName: string
    sourceIds: string[]
    networkHarvesterIds: string[]
    networkHaulerIds: string[]
    networkEngineerIds: string[]
    containerIds: string[]

    constructor(
        roomName: string,
        sourceIds: string[],
        networkHarvesters: string[],
        networkHaulers: string[],
        networkEngineers: string[],
        containers: string[]) {
        this.roomName = roomName
        this.sourceIds = sourceIds
        this.networkHarvesterIds = networkHarvesters
        this.networkHaulerIds = networkHaulers
        this.networkEngineerIds = networkEngineers
        this.containerIds = containers
    }
}
