import { object } from "lodash";
import { Role } from "../utils/Enums";

Room.prototype.creeps = function(role: Role | undefined): Creep[] {
    if (role) {
        return this.find(FIND_MY_CREEPS);
    }
    return this.find(FIND_MY_CREEPS, { filter: (c: Creep) => c.memory.role === role });
}

