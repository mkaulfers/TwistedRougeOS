import { Role } from "Constants/RoleConstants";
import { Engineer } from "./Engineer";
export class NetworkEngineer extends Engineer {
    static quantityWanted(room: Room, rolesNeeded: Role[], min?: boolean): number  {
        return 0;
    }
}
