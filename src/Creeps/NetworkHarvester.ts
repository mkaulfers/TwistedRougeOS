import { Harvester } from "./Harvester";

export class NetworkHarvester extends Harvester {
    shouldSpawn(room: Room): boolean {
        return false;
    }
}
