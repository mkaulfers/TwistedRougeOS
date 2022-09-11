
export class RemoteSite {
    roomName: string
    sourceIds: string[]
    networkHarvesterIds: string[]
    networkHaulerIds: string[]
    networkEngineerIds: string[]
    containerIds: string[]

    /**
    * @param roomName The name of the remote room.
    * @param sourceIds The ids of the sources.
    * @param networkHarvesterIds The ids of the network harvesters.
    * @param networkHaulerIds The ids of the network haulers.
    * @param networkEngineerIds The ids of the network engineers.
    * @param containerIds The ids of the containers.
    */
    constructor(
        roomName: string,
        sourceIds: string[] = [],
        networkHarvesters: string[] = [],
        networkHaulers: string[] = [],
        networkEngineers: string[] = [],
        containers: string[] = []) {
        this.roomName = roomName
        this.sourceIds = sourceIds
        this.networkHarvesterIds = networkHarvesters
        this.networkHaulerIds = networkHaulers
        this.networkEngineerIds = networkEngineers
        this.containerIds = containers
    }
}
