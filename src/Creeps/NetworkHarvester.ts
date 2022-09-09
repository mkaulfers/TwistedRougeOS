import { Role } from "utils/Enums";
import { Harvester } from "./Harvester";

export class NetworkHarvester extends Harvester {
    static quantityWanted(room: Room, rolesNeeded: Role[], min?: boolean): number  {
        return 0;
    }
}
