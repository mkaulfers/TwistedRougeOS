import { Role } from "utils/Enums";
import { Trucker } from "./Trucker";

export class NetworkHauler extends Trucker {
    static quantityWanted(room: Room, rolesNeeded: Role[], min?: boolean): number  {
        return 0;
    }
}
