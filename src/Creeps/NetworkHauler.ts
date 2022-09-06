import { Trucker } from "./Trucker";

export class NetworkHauler extends Trucker {
    shouldSpawn(room: Room): boolean {
        return false;
    }
}
