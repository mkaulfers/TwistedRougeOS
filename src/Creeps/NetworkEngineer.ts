import { Engineer } from "./Engineer";

export class NetworkEngineer extends Engineer {
    shouldSpawn(room: Room): boolean {
        return false;
    }
}
