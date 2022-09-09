import { Engineer } from "./Engineer";

export class NetworkEngineer extends Engineer {
    static shouldSpawn(room: Room, rolesNeeded: Role[], min?: boolean): number  {
        return 0;
    }
}
