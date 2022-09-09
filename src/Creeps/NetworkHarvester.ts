import { Harvester } from "./Harvester";

export class NetworkHarvester extends Harvester {
    static shouldSpawn(room: Room, rolesNeeded: Role[], min?: boolean): number  {
        return 0;
    }
}
